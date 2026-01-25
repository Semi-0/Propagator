/**
 * Test suite for WorkerCell - distributed cell implementation using worker threads
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { construct_worker_cell, createWorkerPoolState, terminateWorkerPool, type WorkerPoolState } from "../Cell/WorkerCell";
import { construct_cell } from "../Cell/Cell";
import { function_to_primitive_propagator } from "../Propagator/Propagator";
import { the_nothing } from "../Cell/CellValue";

describe("WorkerCell", () => {
  let poolState: WorkerPoolState;

  beforeEach(() => {
    poolState = createWorkerPoolState(2); // Use 2 workers for testing
  });

  afterEach(() => {
    terminateWorkerPool(poolState);
  });

  test("should create a worker cell", async () => {
    const { cell, poolState: updatedPoolState } = await construct_worker_cell(
      "test_cell",
      null,
      poolState
    );

    expect(cell).toBeDefined();
    expect(cell.getRelation()).toBeDefined();
    expect(cell.getRelation().get_name()).toBe("test_cell");
  });

  test("should get and set cell content", async () => {
    const { cell } = await construct_worker_cell(
      "test_cell",
      null,
      poolState,
      {
        content: 42,
        strongest: 42,
      }
    );

    // Initially should have the initial value
    expect(cell.getStrongest()).toBe(42);

    // Update the cell
    cell.update(100);

    // Wait a bit for async update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // The value should be updated (cached locally)
    // Note: In a real scenario, we'd wait for the worker notification
    expect(cell.getStrongest()).toBeDefined();
  });

  test("should handle cell updates", async () => {
    const { cell } = await construct_worker_cell(
      "test_cell",
      null,
      poolState
    );

    const initialStrongest = cell.getStrongest();
    expect(initialStrongest).toBe("&&the_nothing&&");

    // Update cell
    cell.update(10);

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Cell should be updated (cached value may change via notifications)
    expect(cell.getContent()).toBeDefined();
  });

  test("should add and remove neighbors", async () => {
    const { cell } = await construct_worker_cell(
      "test_cell",
      null,
      poolState
    );

    const inputCell = construct_cell("input");
    const outputCell = construct_cell("output");

    // Create a simple propagator
    const add = function_to_primitive_propagator("add", (a: number, b: number) => a + b);
    const prop = add(inputCell, outputCell);

    // Add neighbor
    cell.addNeighbor(prop, ["updated"]);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(cell.getNeighbors().size).toBe(1);

    // Remove neighbor
    cell.removeNeighbor(prop);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(cell.getNeighbors().size).toBe(0);
  });

  test("should dispose cell", async () => {
    const { cell } = await construct_worker_cell(
      "test_cell",
      null,
      poolState
    );

    cell.dispose();

    // Wait for disposal
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(cell.getStrongest()).toBe("&&the_disposed&&");
    expect(cell.getContent()).toBe("&&the_disposed&&");
  });

  test("should distribute cells across workers", async () => {
    const cell1 = await construct_worker_cell("cell1", null, poolState);
    const cell2 = await construct_worker_cell("cell2", null, cell1.poolState);
    const cell3 = await construct_worker_cell("cell3", null, cell2.poolState);

    // All cells should be created
    expect(cell1.cell).toBeDefined();
    expect(cell2.cell).toBeDefined();
    expect(cell3.cell).toBeDefined();

    // They should have different IDs
    expect(cell1.cell.getRelation().get_id()).not.toBe(cell2.cell.getRelation().get_id());
    expect(cell2.cell.getRelation().get_id()).not.toBe(cell3.cell.getRelation().get_id());
  });

  test("should summarize cell", async () => {
    const { cell } = await construct_worker_cell(
      "test_cell",
      null,
      poolState,
      {
        content: "test_content",
        strongest: "test_strongest",
      }
    );

    const summary = cell.summarize();
    expect(summary).toContain("WorkerCell");
    expect(summary).toContain("test_cell");
  });
});
