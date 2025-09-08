import { describe, test, expect } from 'bun:test';
import { buildGraph, patches } from '../tasks/micro_chain.js';
import { runHybrid } from '../runners/hybrid.js';
import { step } from '../runners/yampa.js';
import { getCell } from '../core/csi.js';
import type { Interval } from '../core/lattices.js';

describe('Yampa Runner', () => {
  test('should produce same results as hybrid runner', async () => {
    const graph1 = buildGraph();
    const graph2 = buildGraph();
    const patchList = patches(42);
    
    await runHybrid(graph1, patchList, 'fifo', 42);
    await step(graph2, 1.0, patchList, 42);
    
    // Results should be identical
    const cellC1 = getCell<Interval>(graph1, 'C');
    const cellC2 = getCell<Interval>(graph2, 'C');
    
    expect(cellC1!.value).toEqual(cellC2!.value);
  });
  
  test('should handle multiple steps correctly', async () => {
    const graph = buildGraph();
    const patchList1 = patches(42);
    const patchList2 = [{ cellId: 'A', delta: { min: 2, max: 4 } as Interval }];
    
    await step(graph, 1.0, patchList1, 42);
    await step(graph, 1.0, patchList2, 43);
    
    const cellC = getCell<Interval>(graph, 'C');
    expect(cellC!.value).toEqual({ min: 2, max: 4 });
  });
});
