import { describe, test, expect, beforeEach } from "bun:test";
import type { Cell } from "@/cell/Cell";

import { update } from "../AdvanceReactivity/interface";
import {
  construct_cell,
  cell_strongest_value,
  cell_strongest_base_value,
  cell_content_value,
  set_handle_contradiction,
  cell_subscribe
} from "@/cell/Cell";
import { execute_all_tasks_sequential } from "../Shared/Reactivity/Scheduler";
import { get_base_value } from "sando-layer/Basic/Layer";
import { no_compute } from "../Helper/noCompute";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { is_contradiction, the_nothing } from "@/cell/CellValue";
import { compound_propagator } from "../Propagator/Propagator";
import { construct_reactor } from "../Shared/Reactivity/Reactor";
import {   get_traced_timestamp_layer, has_timestamp_layer } from "../AdvanceReactivity/traced_timestamp/TracedTimestampLayer";
import { stale } from "../AdvanceReactivity/traced_timestamp/Annotater";
import { construct_better_set, set_equal, set_for_each, set_get_length, set_map, to_array } from "generic-handler/built_in_generics/generic_better_set";
import { trace_earliest_emerged_value, is_timestamp_value_set, reactive_merge, reactive_fresh_merge } from "../AdvanceReactivity/traced_timestamp/GenericPatch";

import { generic_merge, set_merge } from "@/cell/Merge";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { exec } from "child_process";
import { install_behavior_advice } from "../Propagator/PropagatorBehavior";
import { reactive_propagator_behavior } from "../AdvanceReactivity/traced_timestamp/ReactivePropagatorBehavior";
import { construct_traced_timestamp } from "../AdvanceReactivity/traced_timestamp/TracedTimeStamp";
import type { traced_timestamp } from "../AdvanceReactivity/traced_timestamp/type";
import { timestamp_set_merge } from "../AdvanceReactivity/traced_timestamp/TimeStampSetMerge";
import { annotate_now_with_id } from "../AdvanceReactivity/traced_timestamp/Annotater";
import { comp_reactive_or, com_celsius_to_fahrenheit, com_meters_feet_inches, p_add, p_divide, p_filter_a, p_index, p_map_a, p_multiply, p_reduce, p_subtract, p_switch, p_sync, p_zip } from "../Propagator/BuiltInProps";
import { inspect_content, inspect_strongest } from "../Helper/Debug";
import { link, ce_pipe } from "../Propagator/Sugar";
import { bi_pipe } from "../Propagator/Sugar";
import { com_if } from "../Propagator/BuiltInProps";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);

  install_behavior_advice(reactive_propagator_behavior)
  // set_merge(reactive_merge)
  set_merge(reactive_fresh_merge)
  // set_handle_contradiction(trace_earliest_emerged_value)
});
describe("Advance Reactive Tests", () => {
  // -------------------------
  // Basic helper - not using composition.
  // -------------------------



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
    const v_a = annotate_now_with_id("1")(1)
    const v_b = annotate_now_with_id("2")(2)


    const s_b_a = reactive_merge(v_a, v_b)

    expect(to_array(s_b_a)).toEqual([v_a, v_b])
   
  
    
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
  })



  // -------------------------
  // Check non-chainable operators that use multiple inputs.
  // -------------------------
  describe("Non-chainable operators tests", () => {
    // Test until operator
    test("until operator should output 'then' cell's value when condition is true", async () => {
      const condition: Cell<boolean> = construct_cell("condition");
      const thenCell = construct_cell("then");
      const output = construct_cell("output");
      p_switch(condition, thenCell, output);

      update(condition, false);
      update(thenCell, "initial");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(the_nothing);

      update(condition, true);
      update(thenCell, "updated");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(output))).toBe("updated");
    });

    test("p_sync should update output when input changes", async () => {
      const input = construct_cell("input");
      const output = construct_cell("output");
      p_sync(input, output);
      
      update(input, 1);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(output))).toBe(1);

      update(input, 2);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(get_base_value(cell_strongest_value(output))).toBe(2);
    })

    // Test or operator
    test("or operator should select the fresher cell value", async () => {
      const cellA = construct_cell("A");
      const cellB = construct_cell("B");
      const output = construct_cell("output");
      comp_reactive_or([cellA, cellB], output);


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
      const output = ce_pipe(input, p_map_a((x: number) => {
        console.log("applyPipeTest")
        console.log(to_string(x))
        return x + 10
      }));



      inspect_content(output)
      await execute_all_tasks_sequential((error: Error) => {});

      expect(get_base_value(cell_strongest_value(output))).toBe(15);
    });

    // Test compose_r by chaining two apply_e operators.
    test("compose_r should chain multiple operators", async () => {
      const input = construct_cell("composeTest");
      const composed = ce_pipe(input, p_map_a((x: number) => x * 2), p_map_a((x: number) => x + 1));

      update(input, 3);
      await execute_all_tasks_sequential((error: Error) => {});
      // Expected: (3 * 2) + 1 = 7
 
      expect(get_base_value(cell_strongest_value(composed))).toBe(7);
    });

    // Test pipe_r by chaining two operators.
    test("pipe_r should chain multiple operators", async () => {
      const input = construct_cell("pipeTest");
      const piped = ce_pipe(
        input,
        p_map_a((x: number) => x * 3),
        p_map_a((x: number) => x - 2)
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
      const filtered = ce_pipe(input, p_filter_a((x: number) => x > 10));

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
      const reduced = ce_pipe(input, p_reduce((acc: number, x: number) => acc + x, 0));

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
      // @ts-ignore
      com_celsius_to_fahrenheit(celsius, fahrenheit)

   
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

      // // Test another Celsius to Fahrenheit conversion
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
      // @ts-ignore
      com_meters_feet_inches(meters, feet, inches)
          // Bi-directional conversion between meters and feet


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
  test("p_index operator should return the first value and ignore subsequent updates", async () => {
    const cell = construct_cell("firstOpTest");
    const output = construct_cell("firstOpTestOutput");
    const firstOutput = p_index(1)(cell, output);
    
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
    const zip_func = construct_cell("zipOpTestFunc");
    p_zip([cell1, cell2], zip_func, output);

    // First update: both cells are updated.
    update(zip_func, (a: string, b: string) => [a, b]);
    update(cell1, "x");
    update(cell2, "y");
    await execute_all_tasks_sequential((error: Error) => {});


    let result = get_base_value(cell_strongest_value(output));
    expect(result).toEqual(["x", "y"]);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update one cell with a new value.
    update(cell1, "x2");
    await execute_all_tasks_sequential((error: Error) => {});
    result = get_base_value(cell_strongest_value(output));
    expect(result).toEqual(["x", "y"]);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update with the same values
    update(cell2, "y2");
    await execute_all_tasks_sequential((error: Error) => {});
    const sameResult = get_base_value(cell_strongest_value(output));
    const r = get_traced_timestamp_layer(cell_strongest_value(output))

    expect(sameResult).toEqual(["x2", "y2"]);
  });

  // New test: Verify that r_zip works with cells produced from other operators
  test("r_zip operator should combine values produced by other operators", async () => {
    const raw1 = construct_cell("zipTransformTest1") as Cell<number>;
    const raw2 = construct_cell("zipTransformTest2") as Cell<number>;
    const zip_func = construct_cell("zipTransformTestFunc");
    // Create transformed cells using r_apply operator
    const transformed1 = ce_pipe(raw1, p_map_a((x: number) => x * 2));
    const transformed2 = ce_pipe(raw2, p_map_a((x: number) => x + 5));

    const zipOutput = construct_cell("zipTransformOutput");
    p_zip([transformed1, transformed2], zip_func, zipOutput);
    update(zip_func, (a: number, b: number) => [a, b]);

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
    p_add(cell1, cell2, output);

    update(cell1, 10);
    update(cell2, 15);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(get_base_value(cell_strongest_value(output))).toBe(25);
  });

  test("r_subtract should correctly subtract the second cell from the first", async () => {
    const cell1 = construct_cell("rSubtractInput1");
    const cell2 = construct_cell("rSubtractInput2");
    const output = construct_cell("rSubtractOutput");
    p_subtract(cell1, cell2, output);

    update(cell1, 20);
    update(cell2, 5);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(get_base_value(cell_strongest_value(output))).toBe(15);
  });

  test("r_multiply should correctly multiply the values of two input cells", async () => {
    const cell1 = construct_cell("rMultiplyInput1");
    const cell2 = construct_cell("rMultiplyInput2");
    const output = construct_cell("rMultiplyOutput");
    p_multiply(cell1, cell2, output);

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
    p_multiply(cell1, cell2, cell3, output);

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
    p_divide(cell1, cell2, output);

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
    p_divide(cell1, cell2, cell3, output);

    update(cell1, 120);  // 120 / 2 = 60, then 60 / 3 = 20
    update(cell2, 2);
    update(cell3, 3);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(get_base_value(cell_strongest_value(output))).toBe(20);
  });
});

// describe("Proportional Sum Tests", () => {
//   test("c_sum_propotional should correctly calculate the proportional sum of input cells", async () => {
//     // Create input cells and output cell

//     const input1 = construct_cell("propSum1") as Cell<number>;
//     const input2 = construct_cell("propSum2") as Cell<number>;
//     const output = construct_cell("propSumOutput") as Cell<number>;

//     // Set up the proportional sum relationship
//     c_sum_propotional(output, input1, input2);

//     // Initial values establishing a 1:2 ratio
//     update(input1, 10);
//     update(input2, 20);
//     await execute_all_tasks_sequential((error: Error) => {});

//     // Verify initial sum and proportions
//     expect(get_base_value(cell_strongest_value(output))).toBe(30);
//     expect(get_base_value(cell_strongest_value(input1))).toBe(10);
//     expect(get_base_value(cell_strongest_value(input2))).toBe(20);

//     // Change the total sum - should maintain 1:2 ratio
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//     update(output, 60);

//     await execute_all_tasks_sequential((error: Error) => {});


//     // Verify new values maintain the same proportion
//     expect(get_base_value(cell_strongest_value(output))).toBe(60);
//     expect(get_base_value(cell_strongest_value(input1))).toBe(20); // 1/3 of 60
//     expect(get_base_value(cell_strongest_value(input2))).toBe(40); // 2/3 of 60



//     // Test with three inputs
//     const input3 = construct_cell("propSum3") as Cell<number>;
//     const output2 = construct_cell("propSumOutput2") as Cell<number>;
    
//     // // Set up new relationship with three inputs
    
//     c_sum_propotional(output2, input1, input2, input3);
    
//     // Initial values establishing a 1:2:3 ratio
//     update(input1, 10);
//     update(input2, 20);
//     update(input3, 30);
//     await execute_all_tasks_sequential((error: Error) => {});

//     // Verify initial sum and proportions
//     expect(get_base_value(cell_strongest_value(output2))).toBe(60);
//     expect(get_base_value(cell_strongest_value(input1))).toBe(10);
//     expect(get_base_value(cell_strongest_value(input2))).toBe(20);
//     expect(get_base_value(cell_strongest_value(input3))).toBe(30);

//     // wait for 1 second
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//     // Change the total sum - should maintain 1:2:3 ratio
//     update(output2, 120);
//     await execute_all_tasks_sequential((error: Error) => {});
 

//     // Verify new values maintain the same proportion
//     expect(get_base_value(cell_strongest_value(output2))).toBe(120);
//     expect(get_base_value(cell_strongest_value(input1))).toBe(20);  // 1/6 of 120
//     expect(get_base_value(cell_strongest_value(input2))).toBe(40);  // 2/6 of 120
//     expect(get_base_value(cell_strongest_value(input3))).toBe(60);  // 3/6 of 120


//     update(input1, 40)
//     r_inspect_strongest(output)

//     await execute_all_tasks_sequential((error: Error) => {})


//   });
// });

describe("Reactive Conditional (com_if) Tests", () => {
  test("com_if should correctly route values based on the condition in reactive context", async () => {
    // Initialize cells
    const condition = construct_cell("reactiveCondition");
    const thenValue = construct_cell("reactiveThen");
    const otherwiseValue = construct_cell("reactiveElse");
    const output = construct_cell("reactiveOutput");
    
    // Set up the if propagator
    com_if(condition, thenValue, otherwiseValue, output);
    
    // Test when condition is true
    update(condition, true);
    update(thenValue, 42);
    update(otherwiseValue, 24);
    
    await execute_all_tasks_sequential((error: Error) => {});
    
    expect(get_base_value(cell_strongest_value(output))).toBe(42);
    
    // Test when condition changes to false
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(condition, false);
    
    await execute_all_tasks_sequential((error: Error) => {});
    
    expect(get_base_value(cell_strongest_value(output))).toBe(24);
    
    // Test when 'then' value changes while condition is false
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(thenValue, 100);
    
    await execute_all_tasks_sequential((error: Error) => {});
    
    // Output should still be the 'otherwise' value
    expect(get_base_value(cell_strongest_value(output))).toBe(24);
    
    // Test when 'otherwise' value changes while condition is false
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(otherwiseValue, 200);
    
    await execute_all_tasks_sequential((error: Error) => {});
    
    // Output should update to the new 'otherwise' value
    expect(get_base_value(cell_strongest_value(output))).toBe(200);
    
    // Test switching back to true condition
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(condition, true);
    
    await execute_all_tasks_sequential((error: Error) => {});
    
    // Output should now match the 'then' value
    expect(get_base_value(cell_strongest_value(output))).toBe(100);
    
    // Test updating 'then' value while condition is true
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(thenValue, 150);
    
    await execute_all_tasks_sequential((error: Error) => {});
    
    // Output should update to the new 'then' value
    expect(get_base_value(cell_strongest_value(output))).toBe(150);
    
    // Test rapid switching between conditions to verify timestamp behavior
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(condition, false);
    await execute_all_tasks_sequential((error: Error) => {});
    
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(condition, true);
    await execute_all_tasks_sequential((error: Error) => {});
    
    expect(get_base_value(cell_strongest_value(output))).toBe(150);
  });
  
 
});

