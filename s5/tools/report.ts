#!/usr/bin/env bun

import { set_global_state, PublicStateCommand } from '../../Shared/PublicState.ts';
import { execute_all_tasks_sequential, set_scheduler } from '../../Shared/Scheduler/Scheduler.ts';
import { simple_scheduler } from '../../Shared/Scheduler/SimpleScheduler.ts';
import { runHybrid } from '../runners/hybrid.ts';
import { runYampa } from '../runners/yampa.ts';
import { runContextual } from '../runners/contextual.ts';
import { buildMicroChain } from '../tasks/micro_chain.ts';
import { buildMicroDiamond } from '../tasks/micro_diamond.ts';
import { buildSumProjection } from '../tasks/t2_sum_project.ts';

function nowMs(): number { return performance.now(); }

type Model = 'contextual' | 'hybrid' | 'yampa';

interface RunStats {
	model: Model;
	task: string;
	seed: number;
	elapsedMs: number;
	endValues: Record<string, unknown>;
}

async function execThunk(thunk: () => Promise<void> | void) {
	await thunk();
	await execute_all_tasks_sequential((e: Error) => { if (e) throw e; });
}

async function run_model(model: Model, task: string, seed: number): Promise<RunStats> {
	set_global_state(PublicStateCommand.CLEAN_UP);

	let builder: any;
	if (task === 'chain') builder = buildMicroChain;
	else if (task === 'diamond') builder = buildMicroDiamond;
	else if (task === 'sum') builder = buildSumProjection;
	else throw new Error(`Unknown task ${task}`);

	const { execute, observed, read } = builder();
	const t0 = nowMs();
	if (model === 'contextual') {
		set_scheduler(simple_scheduler());
		await runContextual(seed, () => execThunk(execute));
	} else if (model === 'hybrid') {
		await runHybrid(seed, () => execThunk(execute));
	} else if (model === 'yampa') {
		await runYampa(seed, () => execThunk(execute));
	}
	const elapsedMs = nowMs() - t0;
	return { model, task, seed, elapsedMs, endValues: read() };
}

function equalEndValues(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
	const ka = Object.keys(a).sort();
	const kb = Object.keys(b).sort();
	if (ka.length !== kb.length) return false;
	for (let i = 0; i < ka.length; i++) {
		if (ka[i] !== kb[i]) return false;
		if (JSON.stringify(a[ka[i]]) !== JSON.stringify(b[kb[i]])) return false;
	}
	return true;
}

async function main() {
	const tasks = ['chain','diamond','sum'] as const;
	const models: Model[] = ['contextual','hybrid','yampa'];
	const seeds = [0,1,2,3,4];
	const rows: Array<RunStats & { equal_fixpoint: boolean }> = [];

	for (const task of tasks) {
		const baseline = await run_model('contextual', task, 0);
		for (const model of models) {
			for (const seed of seeds) {
				const result = await run_model(model, task, seed);
				rows.push({ ...result, equal_fixpoint: equalEndValues(baseline.endValues, result.endValues) });
			}
		}
	}

	console.log('task,model,seed,equal_fixpoint,elapsed_ms,end_values');
	for (const r of rows) {
		console.log(`${r.task},${r.model},${r.seed},${r.equal_fixpoint ? 1 : 0},${r.elapsedMs.toFixed(3)},${JSON.stringify(r.endValues)}`);
	}

	const byKey = new Map<string, { n: number; ok: number; avgMs: number }>();
	for (const r of rows) {
		const key = `${r.task}-${r.model}`;
		const s = byKey.get(key) ?? { n: 0, ok: 0, avgMs: 0 };
		s.n += 1;
		s.ok += r.equal_fixpoint ? 1 : 0;
		s.avgMs += r.elapsedMs;
		byKey.set(key, s);
	}
	console.log('\nSummary:');
	for (const [key, s] of byKey) {
		console.log(`${key}: equal_fixpoint ${(100*s.ok/s.n).toFixed(1)}%, avg elapsed ${(s.avgMs/s.n).toFixed(2)} ms`);
	}
}

if (import.meta.main) {
	main().catch(e => { console.error(e); process.exit(1); });
}
