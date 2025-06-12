import { describe, test, expect, beforeEach } from "bun:test";
import type { Cell } from "@/cell/Cell";

import { r_constant, update } from "../AdvanceReactivity/interface";
import {
  construct_cell,
  cell_strongest_base_value,
  set_handle_contradiction,
  cell_content,
  cell_strongest
} from "@/cell/Cell";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { get_base_value } from "sando-layer/Basic/Layer";
import { no_compute } from "../Helper/noCompute";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { is_contradiction, the_nothing } from "@/cell/CellValue";
import { compound_propagator, primitive_propagator } from "../Propagator/Propagator";
import { construct_reactor } from "../Shared/Reactivity/Reactor";
import {   get_traced_timestamp_layer, has_timestamp_layer } from "../AdvanceReactivity/traced_timestamp/TracedTimestampLayer.ts";
import { stale } from "../AdvanceReactivity/traced_timestamp/Annotater";
import { construct_better_set } from "generic-handler/built_in_generics/generic_better_set";
import { trace_earliest_emerged_value, is_timestamp_value_set, reactive_merge, reactive_fresh_merge, trace_latest_emerged_value } from "../AdvanceReactivity/traced_timestamp/genericPatch";

import { generic_merge, set_merge, set_trace_merge } from "@/cell/Merge";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { exec } from "child_process";
import { construct_traced_timestamp } from "../AdvanceReactivity/traced_timestamp/TracedTimeStamp";
import type { traced_timestamp } from "../AdvanceReactivity/traced_timestamp/type";
import { time_stamp_set_merge, timestamp_set_union } from "../AdvanceReactivity/traced_timestamp/TimeStampSetMerge";
import { annotate_now_with_id } from "../AdvanceReactivity/traced_timestamp/Annotater";
import { p_composite, com_celsius_to_fahrenheit, com_meters_feet_inches, p_add, p_divide, p_filter_a, p_index, p_map_a, p_multiply, p_reduce, p_subtract, p_switch, p_sync, p_zip, c_if_a, c_if_b, p_range, c_range, ce_add } from "../Propagator/BuiltInProps";
import { inspect_content, inspect_strongest } from "../Helper/Debug";
import { link, ce_pipe } from "../Propagator/Sugar";
import { bi_pipe } from "../Propagator/Sugar";
import { com_if } from "../Propagator/BuiltInProps";
import { trace } from "console";
import { construct_traced_timestamp_set, empty_traced_timestamp_set } from "../AdvanceReactivity/traced_timestamp/TracedTimeStampSet";
import { reactive_scheduler } from "../Shared/Scheduler/ReactiveScheduler";
import {is_layered_object, type LayeredObject} from "sando-layer/Basic/LayeredObject";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic.ts";
import { to_array } from "generic-handler/built_in_generics/generic_collection.ts";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);

  set_global_state(PublicStateCommand.SET_SCHEDULER, reactive_scheduler())
//   set_handle_contradiction(trace_earliest_emerged_value)
  set_merge(reactive_merge)
  // set_merge(reactive_fresh_merge)
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
      const setA = construct_traced_timestamp_set(timestampA)
      stale(timestampA)

      const setB = construct_traced_timestamp_set(timestampB)

      const result = timestamp_set_union(setA, setB)
      expect(is_equal(result, setB)).toEqual(true)
      
   })


    test("timestamp should propagate timestamp from multiple sources - A", () => {
      const timestampA = construct_traced_timestamp(1, "1")
      const timestampB = construct_traced_timestamp(2, "2")
      const setA = construct_traced_timestamp_set(timestampA)
      const setB = construct_traced_timestamp_set(timestampB)
      const result = timestamp_set_union(setA, setB)
      expect(to_array(result)).toEqual([timestampA, timestampB])
    })


    test("timestamp should propagate timestamp from multiple sources - B", () => {
      const timestampA = construct_traced_timestamp(1, "1")
      const timestampB = construct_traced_timestamp(2, "2")
      const timestampC = construct_traced_timestamp(3, "3")
      const setA = construct_traced_timestamp_set(timestampA)
      const setB = construct_traced_timestamp_set(timestampB)
      const setC = construct_traced_timestamp_set(timestampC)
      const result = time_stamp_set_merge(setA, setB)
      expect(to_array(result)).toEqual([timestampA, timestampB])

      const result2 = time_stamp_set_merge(result, setC)
      expect(to_array(result2)).toEqual([timestampA, timestampB, timestampC])
    })

    test("timestamp set merge should be able to merge element into empty set", () => {
      const timestampA = construct_traced_timestamp(1, "1")
      const setA = construct_traced_timestamp_set(timestampA)
      const setB = empty_traced_timestamp_set()
      const result = time_stamp_set_merge(setA, setB)
      expect(to_array(result)).toEqual([timestampA])

      const setC = empty_traced_timestamp_set()
      const result2 = time_stamp_set_merge(result, setC)
      expect(to_array(result2)).toEqual([timestampA])
    })

    test("multiple timestamp merged with new fresher timestamp should update according to its source id ", () => {
      const timestampA = construct_traced_timestamp(1, "1")
      const timestampB = construct_traced_timestamp(2, "2")
      const timestampC = construct_traced_timestamp(3, "3")
      const setA = construct_traced_timestamp_set(timestampA)

      
      const setB = construct_traced_timestamp_set(timestampB)
      const setC = construct_traced_timestamp_set(timestampC)
      const result = time_stamp_set_merge(setA, setB)
      expect(to_array(result)).toEqual([timestampA, timestampB]) 

      const result3 = time_stamp_set_merge(result, setC)
      expect(to_array(result3)).toEqual([timestampA, timestampB, timestampC]) 

      const timestampD = construct_traced_timestamp(4, "1")
      const setD = construct_traced_timestamp_set(timestampD)

      stale(timestampA)
      const result4 = time_stamp_set_merge(result3, setD)
      expect(to_array(result4)).toEqual([timestampB, timestampC, timestampD])   
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
    const cell_a = construct_cell<number>("a")

    update(cell_a, 1)

    await new Promise((resolve) => setTimeout(resolve, 100))

    execute_all_tasks_sequential((error: Error) => {
      console.log(error)
    });

    update(cell_a, 2)

    await new Promise((resolve) => setTimeout(resolve, 100))

    execute_all_tasks_sequential((error: Error) => {
      console.log(error)
    });
    expect(cell_strongest_base_value(cell_a)).toBe(2)
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
      expect(cell_strongest_base_value(cell)).toBe(42);
    });

    // Test update function with premise
    test("update (with premise) should update a cell with support info", async () => {
      const cell = construct_cell("updateWithPremise");
      update(cell, 100);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(cell)).toBe(100);
    });
  })



  // -------------------------
  // Check non-chainable operators that use multiple inputs.
  // -------------------------
  describe("Non-chainable operators tests", () => {
    // Test until operator
    test("switch operator should output 'then' cell's value when condition is true", async () => {
      const condition: Cell<boolean> = construct_cell("condition");
      const thenCell = construct_cell("then");
      const output = construct_cell("output");
      p_switch(condition, thenCell, output);

      update(condition, false);
      update(thenCell, "initial");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(the_nothing);

      update(condition, true);
 
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe("initial");
    });

    test("p_sync should update output when input changes", async () => {
      const input = construct_cell("input");
      const output = construct_cell("output");
      p_sync(input, output);
      
      update(input, 1);
      await execute_all_tasks_sequential((error: Error) => {console.log(error)});
      expect(cell_strongest_base_value(output)).toBe(1);
     
      await new Promise((resolve) => setTimeout(resolve, 1));

      update(input, 2);

      await execute_all_tasks_sequential((error: Error) => {console.log(error)});
     
      expect(cell_strongest_base_value(output)).toBe(2);
    })

    // Test or operator
    test("or operator should select the fresher cell value", async () => {
      const cellA = construct_cell("A");
      const cellB = construct_cell("B");
      const output = construct_cell("output");
      p_composite([cellA, cellB], output);


      // await new Promise((resolve) => setTimeout(resolve, 2));
      update(cellA, "first");
      await execute_all_tasks_sequential((error: Error) => {
        if (error) throw error;
      });
      await new Promise((resolve) => setTimeout(resolve, 1));
      expect(cell_strongest_base_value(output)).toBe("first");

      update(cellB, "second");
      await execute_all_tasks_sequential((error: Error) => {
        if (error) throw error;
      });
      await new Promise((resolve) => setTimeout(resolve, 1));
      expect(cell_strongest_base_value(output)).toBe("second");

      update(cellA, "third");
      await execute_all_tasks_sequential((error: Error) => {
        if (error) throw error;
      });
      await new Promise((resolve) => setTimeout(resolve, 1));
      expect(cell_strongest_base_value(output)).toBe("third");
    });
  });


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

      expect(cell_strongest_base_value(output)).toBe(15);
    });

    // Test compose_r by chaining two apply_e operators.
    test("compose_r should chain multiple operators", async () => {
      const input = construct_cell("composeTest");
      const composed = ce_pipe(input, p_map_a((x: number) => x * 2), p_map_a((x: number) => x + 1));

      update(input, 3);
      await execute_all_tasks_sequential((error: Error) => {});
      // Expected: (3 * 2) + 1 = 7
 
      expect(cell_strongest_base_value(composed)).toBe(7);
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
      expect(cell_strongest_base_value(piped)).toBe(10);
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
      expect(cell_strongest_base_value(filtered)).toBe(15);
    });

    // Test pipe_r with reduce_e, which accumulates updates over time.
    test("pipe_r with reduce_e should accumulate values", async () => {
      const input = construct_cell("reduceTest");
      const reduced = ce_pipe(input, p_reduce((acc: number, x: number) => acc + x, 0));

      update(input, 5);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(reduced)).toBe(5);

      update(input, 3);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(reduced)).toBe(8);
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
      expect(cell_strongest_base_value(celsius)).toBe(0);
      expect(cell_strongest_base_value(fahrenheit)).toBe(32);

      // Test Fahrenheit to Celsius conversion
      update(fahrenheit, 212);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(celsius)).toBe(100);
      expect(cell_strongest_base_value(fahrenheit)).toBe(212);

      // // Test another Celsius to Fahrenheit conversion
      update(celsius, 25);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(celsius)).toBe(25);
      expect(cell_strongest_base_value(fahrenheit)).toBe(77);
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
      expect(cell_strongest_base_value(meters)).toBeCloseTo(1);
      expect(cell_strongest_base_value(feet)).toBeCloseTo(3.28084);
      expect(cell_strongest_base_value(inches)).toBeCloseTo(39.37008);

      // Test inches back to feet and meters
      update(inches, 12);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(inches)).toBe(12);
      expect(cell_strongest_base_value(feet)).toBe(1);
      expect(cell_strongest_base_value(meters)).toBeCloseTo(0.3048);
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
    expect(cell_strongest_base_value(output)).toBe(100);
    
    // Change the cell value.
    update(cell, 200);
    await execute_all_tasks_sequential((error: Error) => {});
    // Expect the first propagator to continue returning the initial value.
    expect(cell_strongest_base_value(output)).toBe(100);
  });


  test("r_constant should always broadcast new values", async () => {
    const result = ce_add(r_constant(1), r_constant(2))
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(result)).toBe(3)
    

    const r_1 = r_constant(1)
    await execute_all_tasks_sequential((error: Error) => {});

    const r_2 = r_constant(2)
    await execute_all_tasks_sequential((error: Error) => {});

    const r_3 = ce_add(r_1, r_2)
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(r_3)).toBe(3)
    
  })

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


    let result = cell_strongest_base_value(output);
    expect(result).toEqual(["x", "y"]);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update one cell with a new value.
    update(cell1, "x2");
    await execute_all_tasks_sequential((error: Error) => {});
    result = cell_strongest_base_value(output);
    expect(result).toEqual(["x", "y"]);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update with the same values
    update(cell2, "y2");
    await execute_all_tasks_sequential((error: Error) => {});
    const sameResult = cell_strongest_base_value(output);
    const r = get_traced_timestamp_layer(cell_strongest(output) as LayeredObject<number>)

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

    const result = cell_strongest_base_value(zipOutput);
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
    expect(cell_strongest_base_value(output)).toBe(25);
  });

  test("r_subtract should correctly subtract the second cell from the first", async () => {
    const cell1 = construct_cell("rSubtractInput1");
    const cell2 = construct_cell("rSubtractInput2");
    const output = construct_cell("rSubtractOutput");
    p_subtract(cell1, cell2, output);

    update(cell1, 20);
    update(cell2, 5);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(cell_strongest_base_value(output)).toBe(15);
  });

  test("r_multiply should correctly multiply the values of two input cells", async () => {
    const cell1 = construct_cell("rMultiplyInput1");
    const cell2 = construct_cell("rMultiplyInput2");
    const output = construct_cell("rMultiplyOutput");
    p_multiply(cell1, cell2, output);

    update(cell1, 3);
    update(cell2, 7);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(cell_strongest_base_value(output)).toBe(21);
  });

  test("r_divide should correctly divide the first cell by the second", async () => {
    const cell1 = construct_cell("rDivideInput1");
    const cell2 = construct_cell("rDivideInput2");
    const output = construct_cell("rDivideOutput");
    p_divide(cell1, cell2, output);

    update(cell1, 100);
    update(cell2, 4);
    await execute_all_tasks_sequential((error: Error) => { if (error) throw error; });
    expect(cell_strongest_base_value(output)).toBe(25);
  });

});


describe("Reactive Conditional (com_if) Tests", () => {
  test("com_if should correctly route values based on the condition in reactive context", async () => {
    // Initialize cells
    const condition = construct_cell("reactiveCondition") as Cell<boolean>;
    const thenValue = construct_cell("reactiveThen") as Cell<number> ;
    const otherwiseValue = construct_cell("reactiveElse") as Cell<number>;
    const output = construct_cell("reactiveOutput") as Cell<number>;
    
    // Set up the if propagator
    com_if(condition, thenValue, otherwiseValue, output);
    
    // Test when condition is true
    update(condition, true);
    update(thenValue, 42);
    update(otherwiseValue, 24);
    
    await execute_all_tasks_sequential((error: Error) => {});
    
    expect(cell_strongest_base_value(output)).toBe(42);
    
    // Test when condition changes to false
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(condition, false);
    
    await execute_all_tasks_sequential((error: Error) => {});
    
    expect(cell_strongest_base_value(output)).toBe(24);
    
    // Test when 'then' value changes while condition is false
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(thenValue, 100);
    
    await execute_all_tasks_sequential((error: Error) => {});
    
    // Output should still be the 'otherwise' value
    expect(cell_strongest_base_value(output)).toBe(24);
    
    // Test when 'otherwise' value changes while condition is false
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(otherwiseValue, 200);
    
    await execute_all_tasks_sequential((error: Error) => {});
    
    // Output should update to the new 'otherwise' value
    expect(cell_strongest_base_value(output)).toBe(200);
    
    // Test switching back to true condition
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(condition, true);
    
    await execute_all_tasks_sequential((error: Error) => {});
    
    // Output should now match the 'then' value
    expect(cell_strongest_base_value(output)).toBe(100);
    
    // Test updating 'then' value while condition is true
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(thenValue, 150);
    
    await execute_all_tasks_sequential((error: Error) => {});
    
    // Output should update to the new 'then' value
    expect(cell_strongest_base_value(output)).toBe(150);
    
    // Test rapid switching between conditions to verify timestamp behavior
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(condition, false);
    await execute_all_tasks_sequential((error: Error) => {});
    
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(condition, true);
    await execute_all_tasks_sequential((error: Error) => {});
    
    expect(cell_strongest_base_value(output)).toBe(150);
  });
  
 
});

// Add this helper function before the Complex Propagator Integration Tests describe block
function test_celsius_to_fahrenheit(celsius: Cell<number>, fahrenheit: Cell<number>) {
  // Create a bi-directional constraint between celsius and fahrenheit
  compound_propagator([celsius, fahrenheit], [celsius, fahrenheit], () => {
    // C to F conversion
    const c_to_f = ce_pipe(
      celsius,
      p_map_a((c: number) => c * 9/5 + 32)
    );
    
    // F to C conversion
    const f_to_c = ce_pipe(
      fahrenheit,
      p_map_a((f: number) => (f - 32) * 5/9)
    );
    
    // Connect the cells bi-directionally
    p_sync(c_to_f, fahrenheit);
    p_sync(f_to_c, celsius);
  }, "celsius_fahrenheit_converter");
}

describe("Complex Propagator Integration Tests", () => {
  test("Simple bi-directional temperature conversion with propagator", async () => {
    // Create cells for temperature in different units
    const celsius = construct_cell("celsius") as Cell<number>;
    const fahrenheit = construct_cell("fahrenheit") as Cell<number>;
    
    // Set up a simple bi-directional converter
    test_celsius_to_fahrenheit(celsius, fahrenheit);
    
    // Initialize with a celsius temperature
    update(celsius, 25);
    await execute_all_tasks_sequential((error: Error) => {});
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Verify the initial conversion to Fahrenheit (25°C = 77°F)
    const fahrenheitValue = cell_strongest_base_value(fahrenheit);
    if (typeof fahrenheitValue === 'number') {
      expect(fahrenheitValue).toBeCloseTo(77, 0);
    } else {
      // Handle the case when we get a non-numeric value
      console.log("Received fahrenheit value:", fahrenheitValue);
      // This should not happen if the conversion worked correctly
      expect(typeof fahrenheitValue).toBe('number');
    }
    
    // Now update the temperature via Fahrenheit
    update(fahrenheit, 32);
    await execute_all_tasks_sequential((error: Error) => {});
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Verify that Celsius was updated via bi-directional constraint (32°F = 0°C)
    const celsiusValue = cell_strongest_base_value(celsius);
    if (typeof celsiusValue === 'number') {
      expect(celsiusValue).toBeCloseTo(0, 0);
    } else {
      console.log("Received celsius value:", celsiusValue);
      expect(typeof celsiusValue).toBe('number');
    }
    
    // Update Celsius again to verify the bi-directional flow
    update(celsius, 100);
    await execute_all_tasks_sequential((error: Error) => {});
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Verify Fahrenheit updated to 212°F (boiling point)
    const finalFahrenheit = cell_strongest_base_value(fahrenheit);
    if (typeof finalFahrenheit === 'number') {
      expect(finalFahrenheit).toBeCloseTo(212, 0);
    } else {
      console.log("Received final fahrenheit:", finalFahrenheit);
      expect(typeof finalFahrenheit).toBe('number');
    }
  });

  test("Circle geometry with linked properties", async () => {
    // Create cells for circle properties
    const radius = construct_cell("radius") as Cell<number>;
    const diameter = construct_cell("diameter") as Cell<number>;
    const circumference = construct_cell("circumference") as Cell<number>;
    const area = construct_cell("area") as Cell<number>;
    
    // Set up bi-directional constraints between radius and diameter
    compound_propagator([radius, diameter], [radius, diameter], () => {
      // Radius to diameter
      const r_to_d = ce_pipe(
        radius,
        p_map_a((r: number) => r * 2)
      );
      
      // Diameter to radius
      const d_to_r = ce_pipe(
        diameter,
        p_map_a((d: number) => d / 2)
      );
      
      p_sync(r_to_d, diameter);
      p_sync(d_to_r, radius);
    }, "radius_diameter_converter");
    
    // Set up propagators for circumference and area based on radius
    compound_propagator([radius], [circumference, area], () => {
      // Radius to circumference (2πr)
      const r_to_c = ce_pipe(
        radius,
        p_map_a((r: number) => 2 * Math.PI * r)
      );
      
      // Radius to area (πr²)
      const r_to_a = ce_pipe(
        radius,
        p_map_a((r: number) => Math.PI * r * r)
      );
      
      p_sync(r_to_c, circumference);
      p_sync(r_to_a, area);
    }, "radius_to_circle_properties");
    
    // Set up propagator from circumference back to radius
    compound_propagator([circumference], [radius], () => {
      // Circumference to radius (c/2π)
      const c_to_r = ce_pipe(
        circumference,
        p_map_a((c: number) => c / (2 * Math.PI))
      );
      
      p_sync(c_to_r, radius);
    }, "circumference_to_radius");
    
    // Set up propagator from area back to radius
    compound_propagator([area], [radius], () => {
      // Area to radius (√(A/π))
      const a_to_r = ce_pipe(
        area,
        p_map_a((a: number) => Math.sqrt(a / Math.PI))
      );
      
      p_sync(a_to_r, radius);
    }, "area_to_radius");
    
    // Start with a radius of 5
    update(radius, 5);
    await execute_all_tasks_sequential((error: Error) => {});
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Verify all circle properties were calculated correctly
    const radiusValue = cell_strongest_base_value(radius);
    const diameterValue = cell_strongest_base_value(diameter);
    const circumferenceValue = cell_strongest_base_value(circumference);
    const areaValue = cell_strongest_base_value(area);
    
    if (typeof radiusValue === 'number') {
      expect(radiusValue).toBeCloseTo(5, 5);
    } else {
      console.log("Received radius value:", radiusValue);
      expect(typeof radiusValue).toBe('number');
    }
    
    if (typeof diameterValue === 'number') {
      expect(diameterValue).toBeCloseTo(10, 5);
    } else {
      console.log("Received diameter value:", diameterValue);
      expect(typeof diameterValue).toBe('number');
    }
    
    if (typeof circumferenceValue === 'number') {
      expect(circumferenceValue).toBeCloseTo(2 * Math.PI * 5, 5);
    } else {
      console.log("Received circumference value:", circumferenceValue);
      expect(typeof circumferenceValue).toBe('number');
    }
    
    if (typeof areaValue === 'number') {
      expect(areaValue).toBeCloseTo(Math.PI * 25, 5);
    } else {
      console.log("Received area value:", areaValue);
      expect(typeof areaValue).toBe('number');
    }
    
    // Now update the area and verify that radius (and other properties) update
    update(area, Math.PI * 100); // Area of a circle with radius 10
    await execute_all_tasks_sequential((error: Error) => {});
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Get updated values
    const newRadiusValue = cell_strongest_base_value(radius);
    const newDiameterValue = cell_strongest_base_value(diameter);
    const newCircumferenceValue = cell_strongest_base_value(circumference);
    
    if (typeof newRadiusValue === 'number') {
      expect(newRadiusValue).toBeCloseTo(10, 5);
    } else {
      console.log("Received new radius value:", newRadiusValue);
      expect(typeof newRadiusValue).toBe('number');
    }
    
    if (typeof newDiameterValue === 'number') {
      expect(newDiameterValue).toBeCloseTo(20, 5);
    } else {
      console.log("Received new diameter value:", newDiameterValue);
      expect(typeof newDiameterValue).toBe('number');
    }
    
    if (typeof newCircumferenceValue === 'number') {
      expect(newCircumferenceValue).toBeCloseTo(2 * Math.PI * 10, 5);
    } else {
      console.log("Received new circumference value:", newCircumferenceValue);
      expect(typeof newCircumferenceValue).toBe('number');
    }
    
    // Finally, update the circumference and see if everything updates correctly
    update(circumference, Math.PI * 3); // Circumference of a circle with radius 1.5
    await execute_all_tasks_sequential((error: Error) => {});
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Get final values
    const finalRadiusValue = cell_strongest_base_value(radius);
    const finalDiameterValue = cell_strongest_base_value(diameter);
    const finalAreaValue = cell_strongest_base_value(area);
    
    if (typeof finalRadiusValue === 'number') {
      expect(finalRadiusValue).toBeCloseTo(1.5, 5);
    } else {
      console.log("Received final radius value:", finalRadiusValue);
      expect(typeof finalRadiusValue).toBe('number');
    }
    
    if (typeof finalDiameterValue === 'number') {
      expect(finalDiameterValue).toBeCloseTo(3, 5);
    } else {
      console.log("Received final diameter value:", finalDiameterValue);
      expect(typeof finalDiameterValue).toBe('number');
    }
    
    if (typeof finalAreaValue === 'number') {
      expect(finalAreaValue).toBeCloseTo(Math.PI * 1.5 * 1.5, 5);
    } else {
      console.log("Received final area value:", finalAreaValue);
      expect(typeof finalAreaValue).toBe('number');
    }
  });

});


describe("Reactive c_if Conditional Tests", () => {
  test("c_if_a should correctly route values based on a boolean condition", async () => {
    // Initialize cells
    const condition = construct_cell("c_ifCondition") as Cell<boolean>;
    const thenValue = construct_cell("c_ifThen") as Cell<number>;
    const otherwiseValue = construct_cell("c_ifElse") as Cell<number>;
    const output = construct_cell("c_ifOutput") as Cell<number>;
    
    // Set up the c_if propagator
    c_if_a(condition, thenValue, otherwiseValue, output);
    
    // Set initial values
    update(thenValue, 100);
    update(otherwiseValue, 200);
    
    // Test when condition is true
    update(condition, true);
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(output)).toBe(100);
    
    // Test when condition changes to false
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(condition, false);
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(output)).toBe(200);
    
    // Test when 'then' value changes while condition is true
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(condition, true);
    await execute_all_tasks_sequential((error: Error) => {});
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(thenValue, 150);
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(output)).toBe(150);
    
    // Test when 'else' value changes while condition is false
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(condition, false);
    await execute_all_tasks_sequential((error: Error) => {});
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(otherwiseValue, 250);
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(output)).toBe(250);
    
    // Test that changing 'then' value doesn't affect output when condition is false
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(thenValue, 300);
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(output)).toBe(250);
    
    // Test that changing 'else' value doesn't affect output when condition is true
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(condition, true);
    await execute_all_tasks_sequential((error: Error) => {});
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(otherwiseValue, 350);
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(output)).toBe(300);
    
    // Test response to rapidly changing conditions
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(condition, false);
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(output)).toBe(350);
    
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(condition, true);
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(output)).toBe(300);
  });
  
  test("c_if_a should handle different data types and update reactively", async () => {
    // Initialize cells with string values
    const condition = construct_cell("c_ifStringCondition") as Cell<boolean>;
    const thenValue = construct_cell("c_ifStringThen") as Cell<string>;
    const otherwiseValue = construct_cell("c_ifStringElse") as Cell<string>;
    const output = construct_cell("c_ifStringOutput") as Cell<string>;
    
    // Set up the c_if propagator
    c_if_a(condition, thenValue, otherwiseValue, output);
    
    // Set initial values
    update(thenValue, "Condition is true");
    update(otherwiseValue, "Condition is false");
    update(condition, true);
    
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(output)).toBe("Condition is true");
    
    // Change condition and verify output updates
    await new Promise((resolve) => setTimeout(resolve, 100));
    update(condition, false);
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(output)).toBe("Condition is false");
    
    // Test with undefined condition (should be treated as false)
    await new Promise((resolve) => setTimeout(resolve, 100));
    // @ts-ignore - Intentionally testing with undefined
    update(condition, undefined);
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(output)).toBe("Condition is false");
    
    // Test with complex objects
    const objectCondition = construct_cell("c_ifObjectCondition") as Cell<boolean>;
    const objectThen = construct_cell("c_ifObjectThen") as Cell<{id: number, name: string}>;
    const objectElse = construct_cell("c_ifObjectElse") as Cell<{id: number, name: string}>;
    const objectOutput = construct_cell("c_ifObjectOutput") as Cell<{id: number, name: string}>;
    
    c_if_a(objectCondition, objectThen, objectElse, objectOutput);
    
    const thenObject = {id: 1, name: "Then Object"};
    const elseObject = {id: 2, name: "Else Object"};
    
    update(objectThen, thenObject);
    update(objectElse, elseObject);
    update(objectCondition, true);
    
    await execute_all_tasks_sequential((error: Error) => {});
    const outputObject = cell_strongest_base_value(objectOutput);
    expect(outputObject).toEqual(thenObject);
  });

});

describe("p_range test", () => {
  test("p_range should correctly handle values within the range", async () => {
    const input = construct_cell("input") as Cell<number>
    const min = construct_cell("min") as Cell<number>
    const max = construct_cell("max") as Cell<number>
    const output = construct_cell("output") as Cell<number>
    p_range(input, min, max, output)

    update(input, 10)
    update(min, 5)
    update(max, 15)
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(output)).toBe(10);
  });

  test("p_range should correctly handle values outside the range", async () => {
    const input = construct_cell("input") as Cell<number>
    const min = construct_cell("min") as Cell<number>
    const max = construct_cell("max") as Cell<number>
    const output = construct_cell("output") as Cell<number>
    p_range(input, min, max, output)

    update(input, 20)
    update(min, 5)
    update(max, 15)
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(output)).toBe(15);
  });

  test("p_range should correctly handle values at the boundaries", async () => {
    const input = construct_cell("input") as Cell<number>
    const min = construct_cell("min") as Cell<number>
    const max = construct_cell("max") as Cell<number>
    const output = construct_cell("output") as Cell<number>
    p_range(input, min, max, output)

    update(input, 5)
    update(min, 5)
    update(max, 15)
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(output)).toBe(5);
  });

  test("p_range should correctly handle values at the boundaries", async () => {
    const input = construct_cell("input") as Cell<number>
    const min = construct_cell("min") as Cell<number>
    const max = construct_cell("max") as Cell<number>
    const output = construct_cell("output") as Cell<number>
    p_range(input, min, max, output)

    update(input, 15)
    update(min, 5)
    update(max, 15)
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(output)).toBe(15);
  });
  
});


describe("handle cyclic dependencies", () => {
  test("c_range", async () => {
    
    const input = construct_cell("input") as Cell<number>
    const min = construct_cell("min") as Cell<number>
    const max = construct_cell("max") as Cell<number>

    c_range(input, min, max)

    update(min, 10)
    update(max, 20)

    update(input, 30)

 

    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(input)).toBe(20);

    update(input, 15)
    await execute_all_tasks_sequential((error: Error) => {});
    expect(cell_strongest_base_value(input)).toBe(15);
    
  })
})


describe("handle contradiction", () => {
  test("trace_earliest_emerged_value", async () => {
    set_handle_contradiction(trace_earliest_emerged_value)
    const a = construct_cell("a") as Cell<number>
    const b = construct_cell("b") as Cell<number>
    const output = construct_cell("output") as Cell<number>
    p_add(a, b, output)
    p_subtract(a, b, output)

    update(a, 10)
    update(b, 20)
    await execute_all_tasks_sequential((error: Error) => {});
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(cell_strongest_base_value(output)).toBe(30);
    
  })

  test("trace_latest_emerged_value", async () => {
    set_handle_contradiction(trace_latest_emerged_value)
    const a = construct_cell("a") as Cell<number>
    const b = construct_cell("b") as Cell<number>
    const output = construct_cell("output") as Cell<number>
    p_add(a, b, output)
    p_subtract(a, b, output)

    update(a, 10)
    update(b, 20)
    await execute_all_tasks_sequential((error: Error) => {console.log("error", error)});

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(cell_strongest_base_value(output)).toBe(-10);
    
  })
})