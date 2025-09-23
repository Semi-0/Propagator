import { describe, test, expect } from 'bun:test';
import { buildGraph, patches } from '../tasks/t2_sum_project.js';
import { runHybrid } from '../runners/hybrid.js';
import { getCell } from '../core/csi.js';
import type { Interval } from '../core/lattices.js';

describe('Sum Projection Task', () => {
  test('should propagate constraints correctly', async () => {
    const graph = buildGraph();
    const patchList = patches(42);
    
    await runHybrid(graph, patchList, 'fifo', 42);
    
    // Check final values
    const cellA = getCell<Interval>(graph, 'a');
    const cellB = getCell<Interval>(graph, 'b');
    const cellC = getCell<Interval>(graph, 'c');
    
    expect(cellA).toBeDefined();
    expect(cellB).toBeDefined();
    expect(cellC).toBeDefined();
    
    // a should be [1, 3]
    expect(cellA!.value).toEqual({ min: 1, max: 3 });
    
    // c should be [5, 8]
    expect(cellC!.value).toEqual({ min: 5, max: 8 });
    
    // b should be constrained by a + b = c
    // If a ∈ [1, 3] and c ∈ [5, 8], then b ∈ [5-3, 8-1] = [2, 7]
    expect(cellB!.value).toEqual({ min: 2, max: 7 });
  });
});
