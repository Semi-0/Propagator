// import { compose } from "generic-handler/built_in_generics/generic_combinator";
// import type { Propagator } from "../Propagator/Propagator";
// import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
//
// /**
//  * A minimal priority queue keyed by (depth, inform, enqueueSeq) with stable FIFO for ties.
//  */
// class PropagatorQueue {
//   private items: Array<{
//     prop: Propagator;
//     depth: number;
//     inform: number;
//     seq: number;
//   }> = [];
//   private seqCounter = 0;
//
//   /**
//    * Enqueue or reprioritize a propagator.
//    * If already present, remove it first (moving to new seq ensures FIFO tie-break).
//    */
//   enqueue(prop: Propagator, depth: number, inform: number) {
//     const idx = this.items.findIndex(x => x.prop === prop);
//     if (idx >= 0) this.items.splice(idx, 1);
//     this.seqCounter += 1;
//     this.items.push({ prop, depth, inform, seq: this.seqCounter });
//     this.items.sort((a, b) => {
//       if (a.depth !== b.depth) return a.depth - b.depth;
//       if (a.inform !== b.inform) return a.inform - b.inform;
//       return a.seq - b.seq;
//     });
//   }
//
//   dequeue(): Propagator | undefined {
//     const item = this.items.shift();
//     return item ? item.prop : undefined;
//   }
//
//   isEmpty(): boolean {
//     return this.items.length === 0;
//   }
// }
//
// /** Standard scheduler interface */
// export interface StandardScheduler {
//   alert_propagator: (p: Propagator) => void;
//   alert_propagators: (ps: Propagator[]) => void;
//   run_scheduler: () => void;
//   run_scheduler_step: () => void;
// }
//
// /**
//  * Builds a map from each propagator to its dependent propagators.
//  */
// function buildDependentsMap(all: Propagator[]): Map<Propagator, Propagator[]> {
//   const outMap = new Map<string, Propagator[]>();
//   all.forEach(p => {
//     const outID = (p as any).getOutputID();
//     const arr = outMap.get(outID) ?? [];
//     arr.push(p);
//     outMap.set(outID, arr);
//   });
//   const deps = new Map<Propagator, Propagator[]>();
//   all.forEach(p => {
//     const inputs = p.getInputsID();
//     const consumers: Propagator[] = [];
//     inputs.forEach(id => {
//       const prods = outMap.get(id);
//       if (prods) consumers.push(...prods);
//     });
//     deps.set(p, consumers);
//   });
//   return deps;
// }
//
// /**
//  * Compute static depth for each propagator via BFS from sources.
//  */
// function computeDepths(all: Propagator[]): Map<Propagator, number> {
//   const dependents = buildDependentsMap(all);
//   const cellProducers = new Map<string, Propagator[]>();
//   all.forEach(p => {
//     const outID = (p as any).getOutputID();
//     const arr = cellProducers.get(outID) ?? [];
//     arr.push(p);
//     cellProducers.set(outID, arr);
//   });
//   const sources = all.filter(p =>
//     p.getInputsID().every(id => !cellProducers.has(id))
//   );
//   const depthMap = new Map<Propagator, number>();
//   const queue: Propagator[] = [];
//   sources.forEach(p => {
//     depthMap.set(p, 0);
//     queue.push(p);
//   });
//   while (queue.length) {
//     const p = queue.shift()!;
//     const d = depthMap.get(p)!;
//     (dependents.get(p) || []).forEach(nxt => {
//       if (!depthMap.has(nxt)) {
//         depthMap.set(nxt, d + 1);
//         queue.push(nxt);
//       }
//     });
//   }
//   const maxD = Math.max(...depthMap.values());
//   all.forEach(p => {
//     if (!depthMap.has(p)) depthMap.set(p, maxD + 1);
//   });
//   return depthMap;
// }
//
// /**
//  * Constructs a reactive scheduler:
//  * - depth-first priority
//  * - custom informativeness
//  * - FIFO tie-breaking
//  * - cycle safety
//  * - glitch-free (freshness gating upstream)
//  */
// export function makeReactiveScheduler(
//   allProps: Propagator[],
//   getInformativeness: (prop: Propagator) => number
// ): StandardScheduler {
//   const depthMap = computeDepths(allProps);
//   const freshCount = new Map<Propagator, number>();
//   allProps.forEach(p => freshCount.set(p, 0));
//   const pq = new PropagatorQueue();
//   const lastInform = new Map<Propagator, number>();
//   const dependents = buildDependentsMap(allProps);
//
//   function enqueueIfReady(p: Propagator) {
//     if (freshCount.get(p)! < p.getInputsID().length) return;
//     const d = depthMap.get(p)!;
//     const inf = getInformativeness(p);
//     pq.enqueue(p, d, inf);
//   }
//
//   function alertProp(p: Propagator) {
//     (dependents.get(p) || []).forEach(d => {
//       freshCount.set(d, freshCount.get(d)! + 1);
//       enqueueIfReady(d);
//     });
//   }
//
//   const activate = make_layered_procedure(
//     "activate_propagator",
//     1,
//     (p: Propagator) => p.activate()
//   );
//
//   function run_scheduler() {
//     while (!pq.isEmpty()) run_scheduler_step();
//   }
//
//   function run_scheduler_step() {
//     const p = pq.dequeue();
//     if (!p) return;
//     freshCount.set(p, 0);
//     const inf = getInformativeness(p);
//     if (lastInform.get(p) === inf) return;
//     lastInform.set(p, inf);
//     activate(p);
//     alertProp(p);
//   }
//
//   return {
//     alert_propagator: p => {
//       freshCount.set(p, p.getInputsID().length);
//       enqueueIfReady(p);
//     },
//     alert_propagators: ps => ps.forEach(alertProp),
//     run_scheduler,
//     run_scheduler_step
//   };
// }
