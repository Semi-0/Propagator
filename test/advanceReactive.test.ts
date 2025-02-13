import { describe, test, expect, beforeEach } from "bun:test";
import {
  curried_generic_map,
  subscribe,
  filter_e,
  reduce_e,
  apply_e,
  until,
  or,
  compose_r,
  pipe_r
} from "../AdvanceReactivity/operator";
import { update } from "../AdvanceReactivity/update";
import {
  construct_cell,
  cell_strongest_value,
  cell_strongest_base_value
} from "@/cell/Cell";
import { execute_all_tasks_sequential } from "../Shared/Reactivity/Scheduler";
import { get_base_value } from "sando-layer/Basic/Layer";
import { no_compute } from "../Helper/noCompute";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { the_nothing } from "@/cell/CellValue";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
});
describe("Advance Reactive Tests", () => {
  // -------------------------
  // Basic helper - not using composition.
  // -------------------------
  describe("Basic helper tests", () => {
    test("curried_generic_map should map array correctly", () => {
      const addOne = (x: number) => x + 1;
      const mapAddOne = curried_generic_map(addOne);
      const result = mapAddOne([1, 2, 3]);
      expect(result).toEqual([2, 3, 4]);
    });
  });

  // -------------------------
  // Check update and subscribe functionality directly.
  // -------------------------
  describe("Update and subscribe functionality tests", () => {
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
      subscribe((val: number) => {
        captured = val;
      })(cell);

      update(cell, 77, undefined);
      await execute_all_tasks_sequential((error: Error) => {});
      // @ts-ignore
      expect(captured).toBe(77);
    });
  });

  // -------------------------
  // Check non-chainable operators that use multiple inputs.
  // -------------------------
  describe("Non-chainable operators tests", () => {
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

      update(cellA, "first", undefined);
      await execute_all_tasks_sequential((error: Error) => {
        if (error) throw error;
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(get_base_value(cell_strongest_value(output))).toBe("first");

      update(cellB, "second", undefined);
      await execute_all_tasks_sequential((error: Error) => {
        if (error) throw error;
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(get_base_value(cell_strongest_value(output))).toBe("second");

      update(cellA, "third", undefined);
      await execute_all_tasks_sequential((error: Error) => {
        if (error) throw error;
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(get_base_value(cell_strongest_value(output))).toBe("third");
    });
  });

  // -------------------------
  // Composable, chainable operators using compose_r and pipe_r.
  // -------------------------
  describe("Composable, chainable operators tests", () => {
    // Test pipe_r with a single operator (apply_e).
    test("pipe_r with apply_e operator should apply function to cell value", async () => {
      const input = construct_cell("applyPipeTest");
      const output = pipe_r(input, apply_e((x: number) => x + 10));

      update(input, 5, undefined);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(output))).toBe(15);
    });

    // Test compose_r by chaining two apply_e operators.
    test("compose_r should chain multiple operators", async () => {
      const input = construct_cell("composeTest");
      const composed = compose_r(
        apply_e((x: number) => x * 2),
        apply_e((x: number) => x + 1)
      )(input);

      update(input, 3, undefined);
      await execute_all_tasks_sequential((error: Error) => {});
      // Expected: (3 * 2) + 1 = 7
      expect(get_base_value(cell_strongest_value(composed))).toBe(7);
    });

    // Test pipe_r by chaining two operators.
    test("pipe_r should chain multiple operators", async () => {
      const input = construct_cell("pipeTest");
      const piped = pipe_r(
        input,
        apply_e((x: number) => x * 3),
        apply_e((x: number) => x - 2)
      );

      update(input, 4, undefined);
      await execute_all_tasks_sequential((error: Error) => {});
      // Expected: (4 * 3) - 2 = 10
      expect(get_base_value(cell_strongest_value(piped))).toBe(10);
    });

    // Test pipe_r with filter_e.
    // If the value does not pass the predicate, the output stays at the_nothing.
    test("pipe_r with filter_e should filter cell value", async () => {
      const input = construct_cell("filterTest");
      const filtered = pipe_r(input, filter_e((x: number) => x > 10));

      update(input, 5, undefined);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(filtered)).toBe(the_nothing);

      update(input, 15, undefined);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(filtered))).toBe(15);
    });

    // Test pipe_r with reduce_e, which accumulates updates over time.
    test("pipe_r with reduce_e should accumulate values", async () => {
      const input = construct_cell("reduceTest");
      const reduced = pipe_r(input, reduce_e((acc: number, x: number) => acc + x, 0));

      update(input, 5, undefined);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(reduced))).toBe(5);

      update(input, 3, undefined);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(reduced))).toBe(8);
    });
  });
});