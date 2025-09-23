import type { Scheduler } from "./SchedulerType";
import type { Propagator } from "../../Propagator/Propagator";
import { propagator_activate, propagator_id } from "../../Propagator/Propagator";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { set_global_state, PublicStateCommand } from "../../Shared/PublicState";
import { find_cell_by_id, find_propagator_by_id } from "../GraphTraversal";
import { cell_strongest, cell_strongest_base_value } from "@/cell/Cell";
import { is_fresh } from "../../AdvanceReactivity/traced_timestamp/Predicates";

// Optional hooks to customize informativeness
export type InformativenessFn = (p: Propagator) => number;
let globalInformativenessProvider: InformativenessFn | null = null;
const perPropagatorProvider = new Map<string, InformativenessFn>();

export function setGlobalInformativenessProvider(fn: InformativenessFn | null) {
	globalInformativenessProvider = fn;
}

export function setPropagatorInformativenessProvider(propId: string, fn: InformativenessFn | null) {
	if (fn) perPropagatorProvider.set(propId, fn);
	else perPropagatorProvider.delete(propId);
}

// Minimal priority queue with stable FIFO tie-breaking and aging to avoid starvation
class PropagatorPQ {
	private items: Array<{ prop: Propagator; priority: number; seq: number }>; 
	private seqCounter: number;

	constructor() {
		this.items = [];
		this.seqCounter = 0;
	}

	enqueue(prop: Propagator, priority: number) {
		const idx = this.items.findIndex((x) => x.prop === prop);
		if (idx >= 0) this.items.splice(idx, 1);
		this.seqCounter += 1;
		this.items.push({ prop, priority, seq: this.seqCounter });
		this.sort();
	}

	dequeue(): Propagator | undefined {
		const item = this.items.shift();
		return item?.prop;
	}

	isEmpty(): boolean {
		return this.items.length === 0;
	}

	peek(): Propagator | undefined {
		return this.items[0]?.prop;
	}

	updatePriorities(map: Map<string, number>, getInformativeness: (p: Propagator) => number) {
		for (const item of this.items) {
			const id = propagator_id(item.prop);
			const age = map.get(id) ?? 0;
			item.priority = getInformativeness(item.prop) + age;
		}
		this.sort();
	}

	private sort() {
		this.items.sort((a, b) => {
			if (a.priority !== b.priority) return b.priority - a.priority; // higher first
			return a.seq - b.seq; // older first
		});
	}

	bumpAges(ageMap: Map<string, number>, delta: number) {
		for (const item of this.items) {
			const id = propagator_id(item.prop);
			ageMap.set(id, (ageMap.get(id) ?? 0) + delta);
		}
	}

	clear() {
		this.items.length = 0;
	}

	toString(): string {
		return this.items.map((i) => `${propagator_id(i.prop)}@${i.priority.toFixed(2)}#${i.seq}`).join(", ");
	}
}

// Track last seen base inputs per propagator to approximate "changed since last run"
const lastSeenInputs = new Map<string, string>();

function getInputsBaseValues(prop: Propagator): unknown[] {
	const inputs = prop.getInputsID();
	const vals: unknown[] = [];
	for (const id of inputs) {
		const cell = find_cell_by_id(id);
		if (!cell) { vals.push(undefined); continue; }
		vals.push(cell_strongest_base_value(cell));
	}
	return vals;
}

function serializeBaseInputs(vals: unknown[]): string {
	try { return JSON.stringify(vals); } catch { return String(vals); }
}

// Default informativeness per paper Section 6.4:
// - If numeric inputs: smaller numbers are more informative (e.g., SSSP) → use negative min(input)
// - Else simple metric: number of fresh inputs since last scheduler step
// - Boost if inputs changed since last run; zero if not
function defaultGetInformativeness(prop: Propagator): number {
	// Per-propagator override
	const custom = perPropagatorProvider.get(propagator_id(prop));
	if (custom) return custom(prop);
	// Global override
	if (globalInformativenessProvider) return globalInformativenessProvider(prop);

	// Changed-since-last-run boost
	const baseVals = getInputsBaseValues(prop);
	const sig = serializeBaseInputs(baseVals);
	const pid = propagator_id(prop);
	const prev = lastSeenInputs.get(pid);
	const changedSinceLastRun = prev === undefined ? 1 : (prev === sig ? 0 : 1);

	// Numeric heuristic
	const nums = baseVals.filter(v => typeof v === 'number') as number[];
	if (nums.length === baseVals.length && nums.length > 0) {
		const minVal = Math.min(...nums);
		// More informative if smaller → negative value; add change boost
		return -minVal + changedSinceLastRun;
	}

	// Freshness heuristic (simple metric)
	let freshCount = 0;
	for (const id of prop.getInputsID()) {
		const cell = find_cell_by_id(id);
		if (!cell) continue;
		const strongest = cell_strongest(cell);
		if (is_fresh(strongest)) freshCount += 1;
	}
	return freshCount + changedSinceLastRun;
}

export interface InformativenessSchedulerOptions {
	getInformativeness?: (p: Propagator) => number;
	ageStep?: number; // added to queued items after each fire
	immediateExecute?: boolean;
}

export const make_informativeness_scheduler = (
	options: InformativenessSchedulerOptions = {}
): Scheduler => {
	const pq = new PropagatorPQ();
	const ageMap = new Map<string, number>();
	let immediate_execute = options.immediateExecute ?? false;
	let record_alerted_propagator = false;
	const disposalQueue: Set<string> = new Set();
	const getInformativeness = options.getInformativeness ?? defaultGetInformativeness;
	const ageStep = options.ageStep ?? 0.1;

	const execute_propagator = (propagator: Propagator, error_handler: (e: Error) => void) => {
		try {
			propagator_activate(propagator);
			// Record last seen base inputs after firing (for next comparisons)
			const vals = getInputsBaseValues(propagator);
			lastSeenInputs.set(propagator_id(propagator), serializeBaseInputs(vals));
			// After execution, bump age of all other queued items to avoid starvation
			pq.bumpAges(ageMap, ageStep);
			pq.updatePriorities(ageMap, getInformativeness);
		} catch (e: any) {
			error_handler(e);
		}
	};

	const recomputePriority = (p: Propagator) => {
		const id = propagator_id(p);
		const age = ageMap.get(id) ?? 0;
		const prio = getInformativeness(p) + age;
		pq.enqueue(p, prio);
	};

	const alert_propagator = (propagator: Propagator) => {
		recomputePriority(propagator);
		if (immediate_execute) {
			execute_propagator(propagator, (e) => { throw e; });
		}
	};

	const alert_propagators = (props: Propagator[]) => {
		for (const p of props) alert_propagator(p);
	};

	const execute_sequential = (error_handler: (e: Error) => void) => {
		while (!pq.isEmpty()) {
			const next = pq.dequeue();
			if (!next) break;
			execute_propagator(next, error_handler);
		}
	};

	const steppable_run = (error_handler: (e: Error) => void) => {
		const next = pq.dequeue();
		if (next) execute_propagator(next, error_handler);
	};

	const set_immediate_execute = (value: boolean) => {
		immediate_execute = value;
	};

	const clear_all_tasks = () => {
		pq.clear();
		ageMap.clear();
		lastSeenInputs.clear();
	};

	const summarize = () => {
		return `PQ: ${pq.toString()}`;
	};

	const markForDisposal = (id: string) => {
		disposalQueue.add(id);
	};

	const cleanupDisposedItems = () => {
		disposalQueue.forEach((id) => {
			const cell = find_cell_by_id(id);
			if (cell) {
				set_global_state(PublicStateCommand.REMOVE_CELL, cell);
			}
			const propagator = find_propagator_by_id(id);
			if (propagator) {
				set_global_state(PublicStateCommand.REMOVE_PROPAGATOR, propagator);
			}
		});
		disposalQueue.clear();
	};

	const getDisposalQueueSize = () => disposalQueue.size;

	return {
		alert_propagator,
		alert_propagators,
		execute_sequential,
		steppable_run,
		summarize,
		clear_all_tasks,
		set_immediate_execute,
		record_alerted_propagator: (v: boolean) => { record_alerted_propagator = v; },
		markForDisposal,
		cleanupDisposedItems,
		getDisposalQueueSize
	};
};
