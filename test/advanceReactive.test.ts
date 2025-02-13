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
import { compound_propagator } from "../Propagator/Propagator";
import { construct_reactor } from "../Shared/Reactivity/Reactor";

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
      const output = construct_cell("output");
      until(condition, thenCell, output);

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
      const output = construct_cell("output");
      or(output, cellA, cellB);

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

  // -------------------------
  // Bi-directional reactive propagator tests
  // -------------------------
  describe("Bi-directional reactive propagator tests", () => {
    test("should maintain temperature conversion relationship bi-directionally", async () => {
      const celsius = construct_cell("celsius");
      const fahrenheit = construct_cell("fahrenheit");

      // Create bi-directional conversion using compound_propagator
      compound_propagator(
        [celsius, fahrenheit],
        [celsius, fahrenheit],
        () => {
          // Watch both cells
          const c_to_f = pipe_r(
            celsius,
            filter_e(x => x !== the_nothing),
            apply_e((c: number) => c * 9/5 + 32)
          );

          const f_to_c = pipe_r(
            fahrenheit,
            filter_e(x => x !== the_nothing),
            apply_e((f: number) => (f - 32) * 5/9)
          );

          // Subscribe to update the other cell when one changes
          subscribe((f: number) => {
            if (get_base_value(cell_strongest_value(fahrenheit)) !== f) {
              update(fahrenheit, f, "c_to_f");
            }
          })(c_to_f);

          subscribe((c: number) => {
            if (get_base_value(cell_strongest_value(celsius)) !== c) {
              update(celsius, c, "f_to_c");
            }
          })(f_to_c);

          // Return a combined reactor
          return construct_reactor();
        },
        "temperature_converter"
      );

      // Test Celsius to Fahrenheit conversion
      update(celsius, 0, undefined);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(celsius))).toBe(0);
      expect(get_base_value(cell_strongest_value(fahrenheit))).toBe(32);

      // Test Fahrenheit to Celsius conversion
      update(fahrenheit, 212, undefined);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(celsius))).toBe(100);
      expect(get_base_value(cell_strongest_value(fahrenheit))).toBe(212);

      // Test another Celsius to Fahrenheit conversion
      update(celsius, 25, undefined);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(celsius))).toBe(25);
      expect(get_base_value(cell_strongest_value(fahrenheit))).toBe(77);
    });

    test("should handle multiple linked cells in a bi-directional chain", async () => {
      const meters = construct_cell("meters");
      const feet = construct_cell("feet");
      const inches = construct_cell("inches");

      // Create bi-directional conversions between all three units
      compound_propagator(
        [meters, feet, inches],
        [meters, feet, inches],
        () => {
          // Conversion factors
          const m_to_ft = pipe_r(
            meters,
            filter_e(x => x !== the_nothing),
            apply_e((m: number) => m * 3.28084)
          );

          const ft_to_in = pipe_r(
            feet,
            filter_e(x => x !== the_nothing),
            apply_e((ft: number) => ft * 12)
          );

          const in_to_ft = pipe_r(
            inches,
            filter_e(x => x !== the_nothing),
            apply_e((inch: number) => inch / 12)
          );

          const ft_to_m = pipe_r(
            feet,
            filter_e(x => x !== the_nothing),
            apply_e((ft: number) => ft / 3.28084)
          );

          // Set up subscriptions
          subscribe((ft: number) => {
            if (get_base_value(cell_strongest_value(feet)) !== ft) {
              update(feet, ft, "m_to_ft");
            }
          })(m_to_ft);

          subscribe((m: number) => {
            if (get_base_value(cell_strongest_value(meters)) !== m) {
              update(meters, m, "ft_to_m");
            }
          })(ft_to_m);

          subscribe((inch: number) => {
            if (get_base_value(cell_strongest_value(inches)) !== inch) {
              update(inches, inch, "ft_to_in");
            }
          })(ft_to_in);

          subscribe((ft: number) => {
            if (get_base_value(cell_strongest_value(feet)) !== ft) {
              update(feet, ft, "in_to_ft");
            }
          })(in_to_ft);

          return construct_reactor();
        },
        "length_converter"
      );

      // Test meters to feet to inches
      update(meters, 1, undefined);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(meters))).toBeCloseTo(1);
      expect(get_base_value(cell_strongest_value(feet))).toBeCloseTo(3.28084);
      expect(get_base_value(cell_strongest_value(inches))).toBeCloseTo(39.37008);

      // Test inches back to feet and meters
      update(inches, 12, undefined);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(inches))).toBe(12);
      expect(get_base_value(cell_strongest_value(feet))).toBe(1);
      expect(get_base_value(cell_strongest_value(meters))).toBeCloseTo(0.3048);
    });
  });
})

//   describe("c_sum_propotional tests", () => {
//     test("c_sum_propotional computes weighted sum correctly", async () => {
//       const input1 = construct_cell("input1");
//       const input2 = construct_cell("input2");
//       const output = construct_cell("output");

//       // Create the c_sum_propotional propagator.
//       c_sum_propotional([input1, input2], output);

//       // Test case 1:
//       // For inputs 2 and 4:
//       // sum = 2 + 4 = 6
//       // For each input, product = x * (x/sum) → (2²/6 + 4²/6) = (4 + 16)/6 = 20/6 ≈ 3.3333
//       update(input1, 2, undefined);
//       update(input2, 4, undefined);
//       await execute_all_tasks_sequential((error: Error) => {});
//       const result1 = get_base_value(cell_strongest_value(output));
//       expect(result1).toBeCloseTo(20 / 6, 5);

//       // Test case 2:
//       // For inputs 3 and 6:
//       // sum = 3 + 6 = 9
//       // product for each: (3²/9 + 6²/9) = (9 + 36)/9 = 45/9 = 5
//       update(input1, 3, undefined);
//       update(input2, 6, undefined);
//       await execute_all_tasks_sequential((error: Error) => {});
//       const result2 = get_base_value(cell_strongest_value(output));
//       expect(result2).toBeCloseTo(5, 5);
//     });
//   });
// });