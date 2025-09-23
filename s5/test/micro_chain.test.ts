import { describe, test, expect } from 'bun:test';
import { buildGraph, patches, observedCells } from '../tasks/micro_chain.js';
import { runHybrid } from '../runners/hybrid.js';
import { getCell } from '../core/csi.js';
import type { Interval } from '../core/lattices.js';

describe('Micro Chain Task', () => {
  test('should propagate A→B→C correctly', async () => {
    const graph = buildGraph();
    const patchList = patches(42);
    
    await runHybrid(graph, patchList, 'fifo', 42);
    
    // Check final values
    const cellA = getCell<Interval>(graph, 'A');
    const cellB = getCell<Interval>(graph, 'B');
    const cellC = getCell<Interval>(graph, 'C');
    
    expect(cellA).toBeDefined();
    expect(cellB).toBeDefined();
    expect(cellC).toBeDefined();
    
    expect(cellA!.value).toEqual({ min: 1, max: 5 });
    expect(cellB!.value).toEqual({ min: 1, max: 5 });
    expect(cellC!.value).toEqual({ min: 1, max: 5 });
  });
  
  test('should produce identical results with different seeds', async () => {
    const graph1 = buildGraph();
    const graph2 = buildGraph();
    const patchList = patches(42);
    
    await runHybrid(graph1, patchList, 'fifo', 123);
    await runHybrid(graph2, patchList, 'fifo', 456);
    
    // Results should be identical regardless of seed
    const cellC1 = getCell<Interval>(graph1, 'C');
    const cellC2 = getCell<Interval>(graph2, 'C');
    
    expect(cellC1!.value).toEqual(cellC2!.value);
  });
});
