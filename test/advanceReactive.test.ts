import { describe, test, expect, beforeEach } from "bun:test";
import {
  curried_generic_map,
  r_subscribe,
  r_filter,
  r_reduce,
  r_apply,
  r_until,
  r_or,
  r_compose,
  r_pipe,
  r_first,
  r_zip,
  r_add,
  r_subtract,
  r_multiply,
  r_divide
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
      r_subscribe((val: number) => {
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
      r_until(condition, thenCell, output);

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
      r_or(output, cellA, cellB);

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
      const output = r_pipe(input, r_apply((x: number) => x + 10));

      update(input, 5, undefined);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(output))).toBe(15);
    });

    // Test compose_r by chaining two apply_e operators.
    test("compose_r should chain multiple operators", async () => {
      const input = construct_cell("composeTest");
      const composed = r_compose(
        r_apply((x: number) => x * 2),
        r_apply((x: number) => x + 1)
      )(input);

      update(input, 3, undefined);
      await execute_all_tasks_sequential((error: Error) => {});
      // Expected: (3 * 2) + 1 = 7
      expect(get_base_value(cell_strongest_value(composed))).toBe(7);
    });

    // Test pipe_r by chaining two operators.
    test("pipe_r should chain multiple operators", async () => {
      const input = construct_cell("pipeTest");
      const piped = r_pipe(
        input,
        r_apply((x: number) => x * 3),
        r_apply((x: number) => x - 2)
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
      const filtered = r_pipe(input, r_filter((x: number) => x > 10));

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
      const reduced = r_pipe(input, r_reduce((acc: number, x: number) => acc + x, 0));

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
          const c_to_f = r_pipe(
            celsius,
            r_filter(x => x !== the_nothing),
            r_apply((c: number) => c * 9/5 + 32)
          );

          const f_to_c = r_pipe(
            fahrenheit,
            r_filter(x => x !== the_nothing),
            r_apply((f: number) => (f - 32) * 5/9)
          );

          // Subscribe to update the other cell when one changes
          r_subscribe((f: number) => {
            if (get_base_value(cell_strongest_value(fahrenheit)) !== f) {
              update(fahrenheit, f, "c_to_f");
            }
          })(c_to_f);

          r_subscribe((c: number) => {
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
          const m_to_ft = r_pipe(
            meters,
            r_filter(x => x !== the_nothing),
            r_apply((m: number) => m * 3.28084)
          );

          const ft_to_in = r_pipe(
            feet,
            r_filter(x => x !== the_nothing),
            r_apply((ft: number) => ft * 12)
          );

          const in_to_ft = r_pipe(
            inches,
            r_filter(x => x !== the_nothing),
            r_apply((inch: number) => inch / 12)
          );

          const ft_to_m = r_pipe(
            feet,
            r_filter(x => x !== the_nothing),
            r_apply((ft: number) => ft / 3.28084)
          );

          // Set up subscriptions
          r_subscribe((ft: number) => {
            if (get_base_value(cell_strongest_value(feet)) !== ft) {
              update(feet, ft, "m_to_ft");
            }
          })(m_to_ft);

          r_subscribe((m: number) => {
            if (get_base_value(cell_strongest_value(meters)) !== m) {
              update(meters, m, "ft_to_m");
            }
          })(ft_to_m);

          r_subscribe((inch: number) => {
            if (get_base_value(cell_strongest_value(inches)) !== inch) {
              update(inches, inch, "ft_to_in");
            }
          })(ft_to_in);

          r_subscribe((ft: number) => {
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

describe("Zip and First operator tests", () => {
  test("r_first operator should return the first value and ignore subsequent updates", async () => {
    const cell = construct_cell("firstOpTest");
    const output = construct_cell("firstOpTestOutput");
    const firstOutput = r_first(output, cell);
    
    // Set the initial value.
    update(cell, 100, undefined);
    await execute_all_tasks_sequential((error: Error) => {});
    expect(get_base_value(cell_strongest_value(output))).toBe(100);
    
    // Change the cell value.
    update(cell, 200, undefined);
    await execute_all_tasks_sequential((error: Error) => {});
    // Expect the first propagator to continue returning the initial value.
    expect(get_base_value(cell_strongest_value(output))).toBe(100);
  });

  test("r_zip operator should output an array of values when cell values change", async () => {
    const cell1 = construct_cell("zipOpTest1");
    const cell2 = construct_cell("zipOpTest2");
    const output = construct_cell("zipOpTestOutput");
    const zipped = r_zip(output, cell1, cell2);

    // First update: both cells are updated.
    update(cell1, "x", undefined);
    update(cell2, "y", undefined);
    await execute_all_tasks_sequential((error: Error) => {});
    let result = get_base_value(cell_strongest_value(output));
    expect(result).toEqual(["x", "y"]);

    // Update one cell with a new value.
    update(cell1, "x2", undefined);
    await execute_all_tasks_sequential((error: Error) => {});
    result = get_base_value(cell_strongest_value(output));
    expect(result).toEqual(["x2", "y"]);

    // Update with the same values (i.e. no change in the underlying timestamps)
    update(cell1, "x2", undefined);
    update(cell2, "y", undefined);
    await execute_all_tasks_sequential((error: Error) => {});
    // The output should remain the same since no new computation should be triggered.
    const sameResult = get_base_value(cell_strongest_value(output))
    expect(sameResult).toEqual(["x2", "y"]);
  });
});

describe("Arithmetic Operators Tests", () => {
  test("r_add should correctly add the values of input cells", async () => {
    const cell1 = construct_cell("rAddInput1");
    const cell2 = construct_cell("rAddInput2");
    const output = construct_cell("rAddOutput");
    // Connect the add operator to the inputs and output.
    r_add(output, cell1, cell2);

    update(cell1, 10, undefined);
    update(cell2, 15, undefined);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(get_base_value(cell_strongest_value(output))).toBe(25);
  });

  test("r_subtract should correctly subtract the second cell from the first", async () => {
    const cell1 = construct_cell("rSubtractInput1");
    const cell2 = construct_cell("rSubtractInput2");
    const output = construct_cell("rSubtractOutput");
    r_subtract(output, cell1, cell2);

    update(cell1, 20, undefined);
    update(cell2, 5, undefined);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(get_base_value(cell_strongest_value(output))).toBe(15);
  });

  test("r_multiply should correctly multiply the values of two input cells", async () => {
    const cell1 = construct_cell("rMultiplyInput1");
    const cell2 = construct_cell("rMultiplyInput2");
    const output = construct_cell("rMultiplyOutput");
    r_multiply(output, cell1, cell2);

    update(cell1, 3, undefined);
    update(cell2, 7, undefined);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(get_base_value(cell_strongest_value(output))).toBe(21);
  });

  test("r_multiply should correctly multiply the values of three input cells", async () => {
    const cell1 = construct_cell("rMultiply3Input1");
    const cell2 = construct_cell("rMultiply3Input2");
    const cell3 = construct_cell("rMultiply3Input3");
    const output = construct_cell("rMultiply3Output");
    r_multiply(output, cell1, cell2, cell3);

    update(cell1, 2, undefined);
    update(cell2, 3, undefined);
    update(cell3, 4, undefined);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(get_base_value(cell_strongest_value(output))).toBe(24);
  });

  test("r_divide should correctly divide the first cell by the second", async () => {
    const cell1 = construct_cell("rDivideInput1");
    const cell2 = construct_cell("rDivideInput2");
    const output = construct_cell("rDivideOutput");
    r_divide(output, cell1, cell2);

    update(cell1, 100, undefined);
    update(cell2, 4, undefined);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(get_base_value(cell_strongest_value(output))).toBe(25);
  });

  test("r_divide should correctly handle multiple divisions when more cells are supplied", async () => {
    const cell1 = construct_cell("rDivideInputA");
    const cell2 = construct_cell("rDivideInputB");
    const cell3 = construct_cell("rDivideInputC");
    const output = construct_cell("rDivideOutputMultiple");
    r_divide(output, cell1, cell2, cell3);

    update(cell1, 120, undefined);  // 120 / 2 = 60, then 60 / 3 = 20
    update(cell2, 2, undefined);
    update(cell3, 3, undefined);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(get_base_value(cell_strongest_value(output))).toBe(20);
  });
});