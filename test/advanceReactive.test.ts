import { describe, test, expect, beforeEach } from "bun:test";
import type { Cell } from "@/cell/Cell";
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
  r_divide,
  r_inspect_strongest,
  r_inspect_content
} from "../AdvanceReactivity/operator";
import { update } from "../AdvanceReactivity/update";
import {
  construct_cell,
  cell_strongest_value,
  cell_strongest_base_value,
  cell_content_value
} from "@/cell/Cell";
import { execute_all_tasks_sequential } from "../Shared/Reactivity/Scheduler";
import { get_base_value } from "sando-layer/Basic/Layer";
import { no_compute } from "../Helper/noCompute";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { the_nothing } from "@/cell/CellValue";
import { compound_propagator } from "../Propagator/Propagator";
import { construct_reactor } from "../Shared/Reactivity/Reactor";
import { c_sum_propotional } from "../AdvanceReactivity/operator";
import {  annotate_now, construct_traced_timestamp, has_timestamp_layer, stale, timestamp_set_merge, type traced_timestamp } from "../AdvanceReactivity/traced_timestamp/tracedTimestampLayer";
import { construct_better_set, set_equal, set_map, to_array } from "generic-handler/built_in_generics/generic_better_set";
import { is_timestamp_value_set, reactive_merge } from "../AdvanceReactivity/traced_timestamp/generic_patch";
import { generic_merge } from "@/cell/Merge";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";

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


   describe("timestamp set merge tests", () => {
    test("timestamp merge should update staled timestamp", () => {

      const timestampA = construct_traced_timestamp(1, "1")
      const timestampB = construct_traced_timestamp(2, "1")
      const setA = construct_better_set(
        [timestampA], 
        (a: traced_timestamp) => a.id.toString()
      )
      stale(timestampA)

      const setB = construct_better_set(
        [timestampB], 
        (a: traced_timestamp) => a.id.toString()
      )

      const result = timestamp_set_merge(setA, setB)
      expect(set_equal(result, setB)).toEqual(true)
      
   })


    test("timestamp should propagate timestamp from multiple sources - A", () => {
      const timestampA = construct_traced_timestamp(1, "1")
      const timestampB = construct_traced_timestamp(2, "2")
      const setA = construct_better_set(
        [timestampA], 
        (a: traced_timestamp) => a.id.toString()
      )
      const setB = construct_better_set(
        [timestampB], 
        (a: traced_timestamp) => a.id.toString()
      )
      const result = timestamp_set_merge(setA, setB)
      expect(to_array(result)).toEqual([timestampA, timestampB])
    })


    test("timestamp should propagate timestamp from multiple sources - B", () => {
      const timestampA = construct_traced_timestamp(1, "1")
      const timestampB = construct_traced_timestamp(2, "2")
      const timestampC = construct_traced_timestamp(3, "3")
      const setA = construct_better_set(
        [timestampA], 
        (a: traced_timestamp) => a.id.toString()
      )
      const setB = construct_better_set(
        [timestampB], 
        (a: traced_timestamp) => a.id.toString()
      )
      const setC = construct_better_set(
        [timestampC], 
        (a: traced_timestamp) => a.id.toString()
      )
      const result = timestamp_set_merge(setA, setB)
      expect(to_array(result)).toEqual([timestampA, timestampB])

      const result2 = timestamp_set_merge(result, setC)
      expect(to_array(result2)).toEqual([timestampA, timestampB, timestampC])
    })

    test("multiple timestamp merged with new fresher timestamp should update according to its source id ", () => {
      const timestampA = construct_traced_timestamp(1, "1")
      const timestampB = construct_traced_timestamp(2, "2")
      const timestampC = construct_traced_timestamp(3, "3")
      const setA = construct_better_set(
        [timestampA], 
        (a: traced_timestamp) => a.id.toString()
      )

      
      const setB = construct_better_set(
        [timestampB], 
        (a: traced_timestamp) => a.id.toString()
      )
      const setC = construct_better_set(
        [timestampC], 
        (a: traced_timestamp) => a.id.toString()
      )
      const result = timestamp_set_merge(setA, setB)
      expect(to_array(result)).toEqual([timestampA, timestampB]) 

      const result3 = timestamp_set_merge(result, setC)
      expect(to_array(result3)).toEqual([timestampA, timestampB, timestampC]) 

      const timestampD = construct_traced_timestamp(4, "1")
      const setD = construct_better_set(
        [timestampD], 
        (a: traced_timestamp) => a.id.toString()
      )

      stale(timestampA)
      const result4 = timestamp_set_merge(result3, setD)
      expect(to_array(result4)).toEqual([timestampD, timestampB, timestampC])   
  })

})


describe("timestamp value merge tests", () => {
  test("timestamp value merge should update according to its source id ", () => {
    const v_a = annotate_now("1")(1)
    const v_b = annotate_now("2")(2)


    const s_b_a = reactive_merge(v_a, v_b)

    expect(to_array(s_b_a)).toEqual([v_a, v_b])
   
    const s_b = generic_merge(v_a, v_b)

    expect(to_array(s_b)).toEqual([v_a, v_b])
    
  })


  test("integrated test with cell", async () => {
    const cell_a = construct_cell("a")

    update(cell_a, 1)

    await new Promise((resolve) => setTimeout(resolve, 100))

    await execute_all_tasks_sequential((error: Error) => {});
    expect(get_base_value(cell_strongest_value(cell_a))).toBe(1) 

    update(cell_a, 2)

    await new Promise((resolve) => setTimeout(resolve, 100))

    await execute_all_tasks_sequential((error: Error) => {});
    expect(get_base_value(cell_strongest_value(cell_a))).toBe(2)
  })
})



  // -------------------------
  // Check update and subscribe functionality directly.
  // -------------------------
  describe("Update and subscribe functionality tests", () => {
    // Test update function without premise
    test("update (no premise) should update a cell with the annotated value", async () => {
      const cell = construct_cell("updateNoPremise");
      update(cell, 42);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(cell))).toBe(42);
    });

    // Test update function with premise
    test("update (with premise) should update a cell with support info", async () => {
      const cell = construct_cell("updateWithPremise");
      update(cell, 100);
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

      update(cell, 77);
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

      update(condition, false);
      update(thenCell, "initial");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(the_nothing);

      update(condition, true);
      update(thenCell, "updated");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(output))).toBe("updated");
    });

    // Test or operator
    test("or operator should select the fresher cell value", async () => {
      const cellA = construct_cell("A");
      const cellB = construct_cell("B");
      const output = construct_cell("output");
      r_or(output, cellA, cellB);


      // await new Promise((resolve) => setTimeout(resolve, 2));
      update(cellA, "first");
      await execute_all_tasks_sequential((error: Error) => {
        if (error) throw error;
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(get_base_value(cell_strongest_value(output))).toBe("first");

      update(cellB, "second");
      await execute_all_tasks_sequential((error: Error) => {
        if (error) throw error;
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(get_base_value(cell_strongest_value(output))).toBe("second");

      update(cellA, "third");
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
      update(input, 5);
      const output = r_pipe(input, r_apply((x: number) => {
        console.log("applyPipeTest")
        console.log(to_string(x))
        return x + 10
      }));



      r_inspect_content(output)
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

      update(input, 3);
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

      update(input, 4);
      await execute_all_tasks_sequential((error: Error) => {});
      // Expected: (4 * 3) - 2 = 10
      expect(get_base_value(cell_strongest_value(piped))).toBe(10);
    });

    // Test pipe_r with filter_e.
    // If the value does not pass the predicate, the output stays at the_nothing.
    test("pipe_r with filter_e should filter cell value", async () => {
      const input = construct_cell("filterTest");
      const filtered = r_pipe(input, r_filter((x: number) => x > 10));

      update(input, 5);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(filtered)).toBe(the_nothing);

      update(input, 15);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(filtered))).toBe(15);
    });

    // Test pipe_r with reduce_e, which accumulates updates over time.
    test("pipe_r with reduce_e should accumulate values", async () => {
      const input = construct_cell("reduceTest");
      const reduced = r_pipe(input, r_reduce((acc: number, x: number) => acc + x, 0));

      update(input, 5);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(reduced))).toBe(5);

      update(input, 3);
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
              update(fahrenheit, f);
            }
          })(c_to_f);

          r_subscribe((c: number) => {
            if (get_base_value(cell_strongest_value(celsius)) !== c) {
              update(celsius, c);
            }
          })(f_to_c);

          // Return a combined reactor
          return construct_reactor();
        },
        "temperature_converter"
      );

      // Test Celsius to Fahrenheit conversion
      update(celsius, 0);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(celsius))).toBe(0);
      expect(get_base_value(cell_strongest_value(fahrenheit))).toBe(32);

      // Test Fahrenheit to Celsius conversion
      update(fahrenheit, 212);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(celsius))).toBe(100);
      expect(get_base_value(cell_strongest_value(fahrenheit))).toBe(212);

      // Test another Celsius to Fahrenheit conversion
      update(celsius, 25);
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
              update(feet, ft);
            }
          })(m_to_ft);

          r_subscribe((m: number) => {
            if (get_base_value(cell_strongest_value(meters)) !== m) {
              update(meters, m);
            }
          })(ft_to_m);

          r_subscribe((inch: number) => {
            if (get_base_value(cell_strongest_value(inches)) !== inch) {
              update(inches, inch);
            }
          })(ft_to_in);

          r_subscribe((ft: number) => {
            if (get_base_value(cell_strongest_value(feet)) !== ft) {
              update(feet, ft);
            }
          })(in_to_ft);

          return construct_reactor();
        },
        "length_converter"
      );

      // Test meters to feet to inches
      update(meters, 1);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(meters))).toBeCloseTo(1);
      expect(get_base_value(cell_strongest_value(feet))).toBeCloseTo(3.28084);
      expect(get_base_value(cell_strongest_value(inches))).toBeCloseTo(39.37008);

      // Test inches back to feet and meters
      update(inches, 12);
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
    update(cell, 100);
    await execute_all_tasks_sequential((error: Error) => {});
    expect(get_base_value(cell_strongest_value(output))).toBe(100);
    
    // Change the cell value.
    update(cell, 200);
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
    update(cell1, "x");
    update(cell2, "y");
    await execute_all_tasks_sequential((error: Error) => {});
    let result = get_base_value(cell_strongest_value(output));
    expect(result).toEqual(["x", "y"]);

    // Update one cell with a new value.
    update(cell1, "x2");
    await execute_all_tasks_sequential((error: Error) => {});
    result = get_base_value(cell_strongest_value(output));
    expect(result).toEqual(["x", "y"]);

    // Update with the same values
    update(cell2, "y2");
    await execute_all_tasks_sequential((error: Error) => {});
    const sameResult = get_base_value(cell_strongest_value(output));
    expect(sameResult).toEqual(["x2", "y2"]);
  });

  // New test: Verify that r_zip works with cells produced from other operators
  test("r_zip operator should combine values produced by other operators", async () => {
    const raw1 = construct_cell("zipTransformTest1") as Cell<number>;
    const raw2 = construct_cell("zipTransformTest2") as Cell<number>;

    // Create transformed cells using r_apply operator
    const transformed1 = r_pipe(raw1, r_apply((x: number) => x * 2));
    const transformed2 = r_pipe(raw2, r_apply((x: number) => x + 5));

    const zipOutput = construct_cell("zipTransformOutput");
    r_zip(zipOutput, transformed1, transformed2);

    update(raw1, 10);
    update(raw2, 20);
    await execute_all_tasks_sequential((error: Error) => {});

    const result = get_base_value(cell_strongest_value(zipOutput));
    // Expected: transformed1 = 10 * 2 = 20, transformed2 = 20 + 5 = 25
    expect(result).toEqual([20, 25]);
  });
});

describe("Arithmetic Operators Tests", () => {
  test("r_add should correctly add the values of input cells", async () => {
    const cell1 = construct_cell("rAddInput1");
    const cell2 = construct_cell("rAddInput2");
    const output = construct_cell("rAddOutput");
    // Connect the add operator to the inputs and output.
    r_add(output, cell1, cell2);

    update(cell1, 10);
    update(cell2, 15);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(get_base_value(cell_strongest_value(output))).toBe(25);
  });

  test("r_subtract should correctly subtract the second cell from the first", async () => {
    const cell1 = construct_cell("rSubtractInput1");
    const cell2 = construct_cell("rSubtractInput2");
    const output = construct_cell("rSubtractOutput");
    r_subtract(output, cell1, cell2);

    update(cell1, 20);
    update(cell2, 5);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(get_base_value(cell_strongest_value(output))).toBe(15);
  });

  test("r_multiply should correctly multiply the values of two input cells", async () => {
    const cell1 = construct_cell("rMultiplyInput1");
    const cell2 = construct_cell("rMultiplyInput2");
    const output = construct_cell("rMultiplyOutput");
    r_multiply(output, cell1, cell2);

    update(cell1, 3);
    update(cell2, 7);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(get_base_value(cell_strongest_value(output))).toBe(21);
  });

  test("r_multiply should correctly multiply the values of three input cells", async () => {
    const cell1 = construct_cell("rMultiply3Input1");
    const cell2 = construct_cell("rMultiply3Input2");
    const cell3 = construct_cell("rMultiply3Input3");
    const output = construct_cell("rMultiply3Output");
    r_multiply(output, cell1, cell2, cell3);

    update(cell1, 2);
    update(cell2, 3);
    update(cell3, 4);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(get_base_value(cell_strongest_value(output))).toBe(24);
  });

  test("r_divide should correctly divide the first cell by the second", async () => {
    const cell1 = construct_cell("rDivideInput1");
    const cell2 = construct_cell("rDivideInput2");
    const output = construct_cell("rDivideOutput");
    r_divide(output, cell1, cell2);

    update(cell1, 100);
    update(cell2, 4);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(get_base_value(cell_strongest_value(output))).toBe(25);
  });

  test("r_divide should correctly handle multiple divisions when more cells are supplied", async () => {
    const cell1 = construct_cell("rDivideInputA");
    const cell2 = construct_cell("rDivideInputB");
    const cell3 = construct_cell("rDivideInputC");
    const output = construct_cell("rDivideOutputMultiple");
    r_divide(output, cell1, cell2, cell3);

    update(cell1, 120);  // 120 / 2 = 60, then 60 / 3 = 20
    update(cell2, 2);
    update(cell3, 3);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(get_base_value(cell_strongest_value(output))).toBe(20);
  });
});

describe("Proportional Sum Tests", () => {
  test("c_sum_propotional should maintain proportional relationships between inputs", async () => {
    // Create input cells and output cell
    const input1 = construct_cell("propSum1") as Cell<number>;
    const input2 = construct_cell("propSum2") as Cell<number>;
    const output = construct_cell("propSumOutput") as Cell<number>;

    // Set up the proportional sum relationship
    c_sum_propotional(output, input1, input2);

    // Initial values establishing a 1:2 ratio
    update(input1, 10);
    update(input2, 20);
    await execute_all_tasks_sequential((error: Error) => {});

    // Verify initial sum and proportions
    expect(get_base_value(cell_strongest_value(output))).toBe(30);
    expect(get_base_value(cell_strongest_value(input1))).toBe(10);
    expect(get_base_value(cell_strongest_value(input2))).toBe(20);

    // Change the total sum - should maintain 1:2 ratio

    update(output, 60);

    await execute_all_tasks_sequential((error: Error) => {});

    console.log(to_string(cell_content_value(output)))
    // Verify new values maintain the same proportion
    expect(get_base_value(cell_strongest_value(output))).toBe(60);
    expect(get_base_value(cell_strongest_value(input1))).toBe(20); // 1/3 of 60
    expect(get_base_value(cell_strongest_value(input2))).toBe(40); // 2/3 of 60

    // Test with three inputs
    const input3 = construct_cell("propSum3") as Cell<number>;
    const output2 = construct_cell("propSumOutput2") as Cell<number>;
    
    // Set up new relationship with three inputs
    c_sum_propotional(output2, input1, input2, input3);
    
    // Initial values establishing a 1:2:3 ratio
    update(input1, 10);
    update(input2, 20);
    update(input3, 30);
    await execute_all_tasks_sequential((error: Error) => {});

    // Verify initial sum and proportions
    expect(get_base_value(cell_strongest_value(output2))).toBe(60);
    expect(get_base_value(cell_strongest_value(input1))).toBe(10);
    expect(get_base_value(cell_strongest_value(input2))).toBe(20);
    expect(get_base_value(cell_strongest_value(input3))).toBe(30);

    // Change the total sum - should maintain 1:2:3 ratio
    update(output2, 120);
    await execute_all_tasks_sequential((error: Error) => {});

    // Verify new values maintain the same proportion
    expect(get_base_value(cell_strongest_value(output2))).toBe(120);
    expect(get_base_value(cell_strongest_value(input1))).toBe(20);  // 1/6 of 120
    expect(get_base_value(cell_strongest_value(input2))).toBe(40);  // 2/6 of 120
    expect(get_base_value(cell_strongest_value(input3))).toBe(60);  // 3/6 of 120
  });
});

