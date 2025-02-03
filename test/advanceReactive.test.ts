import { describe, test, expect } from "bun:test";
import {
  curried_generic_map,
  map_e,
  filter_e,
  reduce_e,
  subscribe,
  func_e,
  apply_e,
  until,
  or
} from "../AdvanceReactivity/operator";
import { update } from "../AdvanceReactivity/update";
import { construct_cell, cell_strongest_value, cell_strongest_base_value } from "@/cell/Cell";
import { execute_all_tasks_sequential } from "../Shared/Reactivity/Scheduler";
import { get_base_value } from "sando-layer/Basic/Layer";
import { no_compute } from "../Helper/noCompute";
import { beforeEach } from "bun:test";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { the_nothing } from "@/cell/CellValue";
beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP)
});

// Test curried_generic_map
test("curried_generic_map should map array correctly", () => {
  const addOne = (x: number) => x + 1;
  const mapAddOne = curried_generic_map(addOne);
  const result = mapAddOne([1, 2, 3]);
  expect(result).toEqual([2, 3, 4]);
});

// Test map_e operator
test("map_e operator should transform cell value by doubling it", async () => {
  const input = construct_cell("input");
  const doubleOp = map_e((x: number) => x * 2);
  const output = doubleOp(input);

  update(input, 5, undefined);
  await execute_all_tasks_sequential((error: Error) => { if(error) throw error; });
  expect(get_base_value(cell_strongest_value(output))).toBe(10);
});

// Test filter_e operator
test("filter_e operator should filter out odd numbers", async () => {
  const input = construct_cell("input");
  const evenFilter = filter_e((x: number) => x % 2 === 0);
  const output = evenFilter(input);

  update(input, 4, undefined);
  await execute_all_tasks_sequential((error: Error) => {});
  expect(get_base_value(cell_strongest_value(output))).toBe(4);

  update(input, 3, undefined);
  await execute_all_tasks_sequential((error: Error) => {});
  // When the predicate fails, the operator returns no_compute.
  expect(cell_strongest_base_value(output)).toBe(4);
});

// Test reduce_e operator
test("reduce_e operator should accumulate values", async () => {
  const input = construct_cell("input");
  const sumOp = reduce_e((acc: number, x: number) => acc + x, 0);
  const output = sumOp(input);

  update(input, 1, undefined);
  await execute_all_tasks_sequential((error: Error) => {});
  expect(get_base_value(cell_strongest_value(output))).toBe(1);

  update(input, 2, undefined);
  await execute_all_tasks_sequential((error: Error) => {});
  expect(get_base_value(cell_strongest_value(output))).toBe(3);

  update(input, 3, undefined);
  await execute_all_tasks_sequential((error: Error) => {});
  expect(get_base_value(cell_strongest_value(output))).toBe(6);
});

// Test update function without premise
test("update (no premise) should update a cell with the annotated value", async () => {
  const cell = construct_cell("updateNoPremise");
  update(cell, 42, undefined);
  await execute_all_tasks_sequential((error: Error) => {});
  expect(get_base_value(cell_strongest_value(cell))).toBe(42);
});

// Test update function with premise
test("update (with premise) should update a cell with support info", async () => {
  const cell = construct_cell("updateWithPremise");
  update(cell, 100, "premise1");
  await execute_all_tasks_sequential((error: Error) => {});
  expect(get_base_value(cell_strongest_value(cell))).toBe(100);
});

// Test subscribe helper
test("subscribe should trigger callback upon cell update", async () => {
  const cell = construct_cell("subscribeTest");
  let captured: number | null = null;
  subscribe((val: number) => { captured = val; })(cell);

  update(cell, 77, undefined);
  await execute_all_tasks_sequential((error: Error) => {});
  expect(captured).toBe(77);
});

// Test until operator
test("until operator should output 'then' cell's value when condition is true", async () => {
  const condition = construct_cell("condition");
  const thenCell = construct_cell("then");
  const output = until(condition, thenCell);

  update(condition, false, undefined);
  update(thenCell, "initial", undefined);
  await execute_all_tasks_sequential((error: Error) => {});
  expect(cell_strongest_base_value(output)).toBe(the_nothing);

  update(condition, true, undefined);
  update(thenCell, "updated", undefined);
  await execute_all_tasks_sequential((error: Error) => {});
  expect(get_base_value(cell_strongest_value(output))).toBe("updated");
});

// Test or operator
test("or operator should select the fresher cell value", async () => {
  const cellA = construct_cell("A");
  const cellB = construct_cell("B");
  const output = or(cellA, cellB);

  // Update cellA, wait for tasks and then wait 1 second before asserting.
  update(cellA, "first", undefined);
  await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
  await new Promise(resolve => setTimeout(resolve, 1000)); // explicit 1s delay
  expect(get_base_value(cell_strongest_value(output))).toBe("first");

  // Update cellB, wait for tasks and then wait 1 second before asserting.
  update(cellB, "second", undefined);
  await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
  await new Promise(resolve => setTimeout(resolve, 1000)); // explicit 1s delay
  expect(get_base_value(cell_strongest_value(output))).toBe("second");

  // Update cellA again, wait for tasks and then wait 1 second before asserting.
  update(cellA, "third", undefined);
  await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
  await new Promise(resolve => setTimeout(resolve, 1000)); // explicit 1s delay
  expect(get_base_value(cell_strongest_value(output))).toBe("third");
});

// Test apply_e operator
test("apply_e operator should apply function to cell value", async () => {
  const input = construct_cell("applyInput");
  const applyOp = apply_e((x: number) => x + 10);
  const output = applyOp(input);

  update(input, 5, undefined);
  await execute_all_tasks_sequential((error: Error) => {});
  expect(get_base_value(cell_strongest_value(output))).toBe(15);
});

// Test func_e operator
test("func_e operator should work like make_operator", async () => {
  const input = construct_cell("funcInput");
  const funcOp = func_e("func", (x: number) => x * 3);
  const output = funcOp(input);

  update(input, 4, undefined);
  await execute_all_tasks_sequential((error: Error) => {});
  expect(get_base_value(cell_strongest_value(output))).toBe(12);
});