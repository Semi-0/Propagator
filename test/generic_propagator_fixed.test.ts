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
import { compound_propagator, primitive_propagator, construct_propagator } from "../Propagator/Propagator";
import { construct_reactor } from "../Shared/Reactivity/Reactor";
import { get_traced_timestamp_layer, has_timestamp_layer } from "../AdvanceReactivity/traced_timestamp/TracedTimestampLayer.ts";
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
import { p_composite, com_celsius_to_fahrenheit, com_meters_feet_inches, p_add, p_divide, p_filter_a, p_index, p_map_a, p_multiply, p_reduce, p_subtract, p_switch, p_sync, p_zip, c_if_a, c_if_b, p_range, c_range, ce_add, p_and } from "../Propagator/BuiltInProps";
import { function_to_primitive_propagator } from "../Propagator/Propagator";
import { inspect_content, inspect_strongest } from "../Helper/Debug";
import { link, ce_pipe } from "../Propagator/Sugar";
import { bi_pipe } from "../Propagator/Sugar";
import { com_if } from "../Propagator/BuiltInProps";
import { trace } from "console";
import { construct_traced_timestamp_set, empty_traced_timestamp_set } from "../AdvanceReactivity/traced_timestamp/TracedTimeStampSet";
import { reactive_scheduler } from "../Shared/Scheduler/ReactiveScheduler";
import { is_layered_object, type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic.ts";
import { to_array } from "generic-handler/built_in_generics/generic_collection.ts";

// Import the fixed generic propagator functions
import {
  generic_propagator_prototype,
  define_generic_propagator_handler,
  match_cells_prototype,
  match_cells,
  p_is_string,
  ce_is_string,
  p_is_number,
  ce_is_number,
  p_is_boolean,
  ce_is_boolean,
  p_not,
  ce_not,
  construct_simple_generic_propagator,
  create_typed_generic_propagator,


} from "../GenericPropagator/generic_propagator_fixed";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_global_state(PublicStateCommand.SET_SCHEDULER, reactive_scheduler());
  set_merge(reactive_merge);
});

describe("Fixed Generic Propagator Tests", () => {
  
  describe("Basic Generic Propagator Prototype", () => {
    test("generic_propagator_prototype should create an interface propagator", async () => {
      // Create dispatcher and result cells
      const dispatcher1 = construct_cell("dispatcher1");
      const dispatcher2 = construct_cell("dispatcher2");
      const result1 = construct_cell("result1");
      const result2 = construct_cell("result2");
      
      const dispatchers = [dispatcher1, dispatcher2];
      const dispatched_results = [result1, result2];
      
      // Create the interface propagator
      const interface_propagator = generic_propagator_prototype(
        "test_interface",
        dispatchers,
        dispatched_results
      );
      
      // Create input and output cells for testing
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output1 = construct_cell("output1");
      const output2 = construct_cell("output2");
      
      const inputs = [input1, input2];
      const outputs = [output1, output2];
      
      // Create the actual propagator
      const propagator = interface_propagator(inputs, outputs);
      
      // Test that the propagator connects inputs to dispatchers and results to outputs
      update(input1, 100);
      update(input2, 200);
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      // The dispatchers should receive the input values
      expect(cell_strongest_base_value(dispatcher1)).toBe(100);
      expect(cell_strongest_base_value(dispatcher2)).toBe(200);
      
      // Update the results and check outputs
      update(result1, 300);
      update(result2, 400);
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      // The outputs should receive the result values
      expect(cell_strongest_base_value(output1)).toBe(300);
      expect(cell_strongest_base_value(output2)).toBe(400);
    });
  });

  describe("Fixed Match Cells Implementation", () => {
    test("match_cells_prototype should work with single predicate", async () => {
      // Create predicate cell
      const predicate = construct_cell("predicate") as Cell<boolean>;
      const output = construct_cell("output") as Cell<boolean>;
      
      // Create the match cells prototype
      const match_propagator = match_cells_prototype(predicate, output);
      
      // Create input cell
      const input = construct_cell("input");
      
      // Create the actual propagator
      const propagator = match_propagator(input);
      
      // Test the matching logic
      update(predicate, true);
      update(input, 100);
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      // The output should match the predicate
      expect(cell_strongest_base_value(output)).toBe(true);
      
      // Test with false predicate
      update(predicate, false);
      await execute_all_tasks_sequential((error: Error) => {});
      
      expect(cell_strongest_base_value(output)).toBe(false);
    });

    test("match_cells_prototype should work with two predicates", async () => {
      // Create predicate cells
      const predicate1 = construct_cell("predicate1") as Cell<boolean>;
      const predicate2 = construct_cell("predicate2") as Cell<boolean>;
      const output = construct_cell("output") as Cell<boolean>;
      
      // Create the match cells prototype
      const match_propagator = match_cells_prototype(predicate1, predicate2, output);
      
      // Create input cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      
      const inputs = [input1, input2];
      
      // Create the actual propagator
      const propagator = match_propagator(...inputs);
      
      // Test the matching logic
      update(predicate1, true);
      update(predicate2, true);
      update(input1, 100);
      update(input2, 200);
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      // The output should be true if both predicates are true
      expect(cell_strongest_base_value(output)).toBe(true);
      
      // Test with one predicate false
      update(predicate1, false);
      await execute_all_tasks_sequential((error: Error) => {});
      
      expect(cell_strongest_base_value(output)).toBe(false);
    });

    test("match_cells should return a cell with matching result", async () => {
      // Create predicate cells
      const predicate1 = construct_cell("predicate1") as Cell<boolean>;
      const predicate2 = construct_cell("predicate2") as Cell<boolean>;
      
      // Create the match cells
      const result = match_cells(predicate1, predicate2);
      
      // Test the matching logic
      update(predicate1, true);
      update(predicate2, true);
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      // The result should be true if both predicates are true
      expect(cell_strongest_base_value(result)).toBe(true);
      
      // Test with one predicate false
      update(predicate1, false);
      await execute_all_tasks_sequential((error: Error) => {});
      
      expect(cell_strongest_base_value(result)).toBe(false);
    });

    test("match_cells should throw error for empty predicate arrays", () => {
      // This should throw an error
      expect(() => {
        match_cells();
      }).toThrow("At least one predicate is required");
    });
  });

  describe("Enhanced Type Predicates", () => {
    test("p_is_string should correctly identify strings", async () => {
      const input = construct_cell("input");
      const output = construct_cell("output") as Cell<boolean>;
      
      p_is_string(input, output);
      
      // Test with string
      update(input, "hello");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(true);
      
      // Test with number
      update(input, 42);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(false);
      
      // Test with boolean
      update(input, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(false);
    });

    test("p_is_number should correctly identify numbers", async () => {
      const input = construct_cell("input");
      const output = construct_cell("output") as Cell<boolean>;
      
      p_is_number(input, output);
      
      // Test with number
      update(input, 42);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(true);
      
      // Test with string
      update(input, "hello");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(false);
      
      // Test with boolean
      update(input, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(false);
    });

    test("p_is_boolean should correctly identify booleans", async () => {
      const input = construct_cell("input");
      const output = construct_cell("output") as Cell<boolean>;
      
      p_is_boolean(input, output);
      
      // Test with boolean
      update(input, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(true);
      
      update(input, false);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(true);
      
      // Test with string
      update(input, "hello");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(false);
      
      // Test with number
      update(input, 42);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(false);
    });

    test("p_not should correctly negate boolean values", async () => {
      const input = construct_cell("input") as Cell<boolean>;
      const output = construct_cell("output") as Cell<boolean>;
      
      p_not(input, output);
      
      // Test with true
      update(input, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(false);
      
      // Test with false
      update(input, false);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(true);
    });

    test("ce_is_string should work as cell expression", async () => {
      const input = construct_cell("input");
      
      const result = ce_is_string(input);
      
      // Test with string
      update(input, "hello");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result)).toBe(true);
      
      // Test with number
      update(input, 42);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result)).toBe(false);
    });

    test("ce_is_number should work as cell expression", async () => {
      const input = construct_cell("input");
      
      const result = ce_is_number(input);
      
      // Test with number
      update(input, 42);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result)).toBe(true);
      
      // Test with string
      update(input, "hello");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result)).toBe(false);
    });

    test("ce_not should work as cell expression", async () => {
      const input = construct_cell("input") as Cell<boolean>;
      
      const result = ce_not(input);
      
      // Test with true
      update(input, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result)).toBe(false);
      
      // Test with false
      update(input, false);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result)).toBe(true);
    });
  });

  describe("Simple Generic Propagator Constructor", () => {
    test("construct_simple_generic_propagator should create a working propagator", async () => {
      // Define a simple handler that adds two inputs
      const add_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return p_add(inputs[0], inputs[1], outputs[0]);
      };
      
      // Create a simple generic propagator
      const add_propagator = construct_simple_generic_propagator(
        "simple_add",
        2, // 2 inputs
        1, // 1 output
        add_handler
      );
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output = construct_cell("output");
      
      const inputs = [input1, input2];
      const outputs = [output];
      
      // Create the actual propagator
      const propagator = add_propagator(inputs, outputs);
      
      // Test the propagator
      update(input1, 10);
      update(input2, 20);
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      expect(cell_strongest_base_value(output)).toBe(30);
    });
  });

  describe("Type-Safe Generic Propagator", () => {
    test("create_typed_generic_propagator should handle type checking", async () => {
      // Create a type-safe number adder
      const number_adder = create_typed_generic_propagator<number>(
        "number_adder",
        (value: any) => typeof value === "number",
        (inputs: Cell<number>[], outputs: Cell<any>[]) => {
          return p_add(inputs[0], inputs[1], outputs[0]);
        }
      );
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output = construct_cell("output");
      
      const inputs = [input1, input2];
      const outputs = [output];
      
      // Create the propagator
      const propagator = number_adder(inputs, outputs);
      
      // Test with valid numbers
      update(input1, 10);
      update(input2, 20);
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      // Should work with numbers
      expect(cell_strongest_base_value(output)).toBe(30);
      
      // Test with invalid types (strings)
      update(input1, "hello");
      update(input2, "world");
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      // Should not compute with invalid types
      // The output should remain the previous value or be the_nothing
      expect(cell_strongest_base_value(output)).toBe(30); // Should remain 30
    });
  });

  describe("Core Generic Propagator Functions", () => {
    beforeEach(() => {
      // Clear any state before each test
      set_global_state(PublicStateCommand.CLEAN_UP);
      set_global_state(PublicStateCommand.SET_SCHEDULER, reactive_scheduler());
      set_merge(reactive_merge);
    });

    test("generic_propagator_prototype should create interface propagator", async () => {
      // Create dispatcher and result cells
      const dispatcher1 = construct_cell("dispatcher1");
      const dispatcher2 = construct_cell("dispatcher2");
      const result1 = construct_cell("result1");
      const result2 = construct_cell("result2");
      
      const dispatchers = [dispatcher1, dispatcher2];
      const dispatched_results = [result1, result2];
      
      // Create the interface propagator
      const interface_propagator = generic_propagator_prototype(
        "test_interface",
        dispatchers,
        dispatched_results
      );
      
      expect(interface_propagator).toBeDefined();
      expect(typeof interface_propagator).toBe("function");
      
      // Test that it can create a propagator
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output1 = construct_cell("output1");
      const output2 = construct_cell("output2");
      
      const inputs = [input1, input2];
      const outputs = [output1, output2];
      
      const propagator = interface_propagator(inputs, outputs);
      expect(propagator).toBeDefined();
    });

    test("define_generic_propagator_handler should define handlers for interface propagator", async () => {
      // Create interface propagator
      const dispatcher1 = construct_cell("dispatcher1");
      const result1 = construct_cell("result1");
      
      const interface_propagator = generic_propagator_prototype(
        "test_interface",
        [dispatcher1],
        [result1]
      );
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const output1 = construct_cell("output1");
      
      const inputs = [input1];
      const outputs = [output1];
      
      // Create the propagator
      const propagator = interface_propagator(inputs, outputs);
      
      // Define a handler that adds 10 to the input
      const add_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const add_prop = function_to_primitive_propagator(
              "add_10",
              (value: any) => typeof value === "number" ? value + 10 : value
            );
            add_prop(inputs[0], outputs[0]);
          },
          "add_10_handler"
        );
      };
      
      // Define a critic that checks if input is a number
      const number_critic = (...cells: Cell<any>[]) => {
        return ce_is_number(cells[0]) as Cell<boolean>;
      };
      
      // Define the handler
      define_generic_propagator_handler(
        interface_propagator,
        number_critic,
        add_handler
      );
      
      // Test the handler
      update(input1, 5);
      await execute_all_tasks_sequential((error: Error) => {});
      
      // The result should be 15 (5 + 10)
      expect(cell_strongest_base_value(result1)).toBe(15);
    });

    test("match_cells_prototype should create matching propagator", async () => {
      // Create predicate cells
      const predicate1 = construct_cell("predicate1") as Cell<boolean>;
      const predicate2 = construct_cell("predicate2") as Cell<boolean>;
      const output = construct_cell("output") as Cell<boolean>;
      
      // Create the match cells prototype
      const match_propagator = match_cells_prototype(predicate1, predicate2, output);
      
      expect(match_propagator).toBeDefined();
      expect(typeof match_propagator).toBe("function");
      
      // Test that it can create a propagator
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      
      const inputs = [input1, input2];
      const propagator = match_propagator(...inputs);
      
      expect(propagator).toBeDefined();
      
      // Test the matching logic
      update(predicate1, true);
      update(predicate2, true);
      update(input1, 100);
      update(input2, 200);
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      expect(cell_strongest_base_value(output)).toBe(true);
    });

    test("match_cells should return cell with combined predicate result", async () => {
      // Create predicate cells
      const predicate1 = construct_cell("predicate1") as Cell<boolean>;
      const predicate2 = construct_cell("predicate2") as Cell<boolean>;
      
      // Create the match cells
      const result = match_cells(predicate1, predicate2);
      
      expect(result).toBeDefined();
      
      // Test with both predicates true
      update(predicate1, true);
      update(predicate2, true);
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      expect(cell_strongest_base_value(result)).toBe(true);
      
      // Test with one predicate false
      update(predicate1, false);
      await execute_all_tasks_sequential((error: Error) => {});
      
      expect(cell_strongest_base_value(result)).toBe(false);
    });

    test("match_cells should handle multiple predicates with complex logic", async () => {
      // Create multiple predicate cells for complex scenarios
      const is_string_pred = construct_cell("is_string_pred") as Cell<boolean>;
      const is_number_pred = construct_cell("is_number_pred") as Cell<boolean>;
      const is_positive_pred = construct_cell("is_positive_pred") as Cell<boolean>;
      const is_even_pred = construct_cell("is_even_pred") as Cell<boolean>;
      const is_valid_pred = construct_cell("is_valid_pred") as Cell<boolean>;
      
      // Test 1: Single predicate
      const single_result = match_cells(is_string_pred);
      
      update(is_string_pred, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(single_result)).toBe(true);
      
      update(is_string_pred, false);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(single_result)).toBe(false);
      
      // Test 2: Two predicates (AND logic)
      const two_result = match_cells(is_number_pred, is_positive_pred);
      
      update(is_number_pred, true);
      update(is_positive_pred, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(two_result)).toBe(true);
      
      update(is_number_pred, false);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(two_result)).toBe(false);
      
      // Test 3: Three predicates (AND logic)
      const three_result = match_cells(is_number_pred, is_positive_pred, is_even_pred);
      
      update(is_number_pred, true);
      update(is_positive_pred, true);
      update(is_even_pred, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(three_result)).toBe(true);
      
      update(is_even_pred, false);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(three_result)).toBe(false);
      
      // Test 4: Four predicates (AND logic)
      const four_result = match_cells(is_string_pred, is_number_pred, is_positive_pred, is_valid_pred);
      
      update(is_string_pred, true);
      update(is_number_pred, true);
      update(is_positive_pred, true);
      update(is_valid_pred, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(four_result)).toBe(true);
      
      update(is_valid_pred, false);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(four_result)).toBe(false);
    });

    test("match_cells should work with dynamic predicate updates", async () => {
      // Create predicate cells that can be updated dynamically
      const predicate1 = construct_cell("predicate1") as Cell<boolean>;
      const predicate2 = construct_cell("predicate2") as Cell<boolean>;
      const predicate3 = construct_cell("predicate3") as Cell<boolean>;
      
      // Create match cells with three predicates
      const result = match_cells(predicate1, predicate2, predicate3);
      
      // Test all combinations systematically
      const test_combinations = [
        { p1: false, p2: false, p3: false, expected: false },
        { p1: true, p2: false, p3: false, expected: false },
        { p1: false, p2: true, p3: false, expected: false },
        { p1: false, p2: false, p3: true, expected: false },
        { p1: true, p2: true, p3: false, expected: false },
        { p1: true, p2: false, p3: true, expected: false },
        { p1: false, p2: true, p3: true, expected: false },
        { p1: true, p2: true, p3: true, expected: true },
      ];
      
      for (const combo of test_combinations) {
        update(predicate1, combo.p1);
        update(predicate2, combo.p2);
        update(predicate3, combo.p3);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        expect(cell_strongest_base_value(result)).toBe(combo.expected);
      }
    });

    test("match_cells should handle predicate chains with intermediate results", async () => {
      // Create predicate cells and initialize them with false
      const predicate1 = construct_cell("predicate1") as Cell<boolean>;
      const predicate2 = construct_cell("predicate2") as Cell<boolean>;
      const predicate3 = construct_cell("predicate3") as Cell<boolean>;
      const predicate4 = construct_cell("predicate4") as Cell<boolean>;
      
      // Initialize all predicates to false first
      update(predicate1, false);
      update(predicate2, false);
      update(predicate3, false);
      update(predicate4, false);
      await execute_all_tasks_sequential((error: Error) => {});
      
      // Create match cells with four predicates (tests the chaining logic)
      const result = match_cells(predicate1, predicate2, predicate3, predicate4);
      
      // Test the chaining by setting predicates one by one
      update(predicate1, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result)).toBe(false); // Still false because others are false
      
      update(predicate2, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result)).toBe(false); // Still false
      
      update(predicate3, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result)).toBe(false); // Still false
      
      update(predicate4, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result)).toBe(true); // Now all are true
      
      // Test breaking the chain
      update(predicate2, false);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result)).toBe(false); // Back to false
      
      // Test restoring the chain
      update(predicate2, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result)).toBe(true); // Back to true
    });

    test("construct_simple_generic_propagator should create working propagator", async () => {
      // Define a simple handler that multiplies two inputs
      const multiply_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return p_multiply(inputs[0], inputs[1], outputs[0]);
      };
      
      // Create a simple generic propagator
      const multiply_propagator = construct_simple_generic_propagator(
        "simple_multiply",
        2, // 2 inputs
        1, // 1 output
        multiply_handler
      );
      
      expect(multiply_propagator).toBeDefined();
      expect(typeof multiply_propagator).toBe("function");
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output = construct_cell("output");
      
      const inputs = [input1, input2];
      const outputs = [output];
      
      // Create the actual propagator
      const propagator = multiply_propagator(inputs, outputs);
      
      expect(propagator).toBeDefined();
      
      // Test the propagator
      update(input1, 5);
      update(input2, 6);
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      expect(cell_strongest_base_value(output)).toBe(30);
    });

    test("should handle multiple handlers with different predicates", async () => {
      // Create interface propagator
      const dispatcher1 = construct_cell("dispatcher1");
      const result1 = construct_cell("result1");
      
      const interface_propagator = generic_propagator_prototype(
        "multi_handler_interface",
        [dispatcher1],
        [result1]
      );
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const output1 = construct_cell("output1");
      
      const inputs = [input1];
      const outputs = [output1];
      
      // Create the propagator
      const propagator = interface_propagator(inputs, outputs);
      
      // Define handlers for different types
      const string_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const string_prop = function_to_primitive_propagator(
              "string_handler",
              (value: any) => typeof value === "string" ? value.toUpperCase() : value
            );
            string_prop(inputs[0], outputs[0]);
          },
          "string_handler"
        );
      };
      
      const number_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const number_prop = function_to_primitive_propagator(
              "number_handler",
              (value: any) => typeof value === "number" ? value * 2 : value
            );
            number_prop(inputs[0], outputs[0]);
          },
          "number_handler"
        );
      };
      
      // Define critics
      const string_critic = (...cells: Cell<any>[]) => ce_is_string(cells[0]) as Cell<boolean>;
      const number_critic = (...cells: Cell<any>[]) => ce_is_number(cells[0]) as Cell<boolean>;
      
      // Define handlers
      define_generic_propagator_handler(
        interface_propagator,
        string_critic,
        string_handler
      );
      
      define_generic_propagator_handler(
        interface_propagator,
        number_critic,
        number_handler
      );
      
      // Test string handler
      update(input1, "hello");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result1)).toBe("HELLO");
      
      // Test number handler
      update(input1, 5);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result1)).toBe(10);
    });

    test("should execute the most recently added handler when multiple handlers match", async () => {
      // Create interface propagator
      const dispatcher1 = construct_cell("dispatcher1");
      const result1 = construct_cell("result1");
      
      const interface_propagator = generic_propagator_prototype(
        "priority_handler_interface",
        [dispatcher1],
        [result1]
      );
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const output1 = construct_cell("output1");
      
      const inputs = [input1];
      const outputs = [output1];
      
      // Create the propagator
      const propagator = interface_propagator(inputs, outputs);
      
      // Define handlers
      const handler1 = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const prop1 = function_to_primitive_propagator(
              "handler1",
              (value: any) => "response from handler 1"
            );
            prop1(inputs[0], outputs[0]);
          },
          "handler1"
        );
      };
      
      const handler2 = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const prop2 = function_to_primitive_propagator(
              "handler2",
              (value: any) => "response from handler 2"
            );
            prop2(inputs[0], outputs[0]);
          },
          "handler2"
        );
      };
      
      // Define critics that both match
      const critic1 = (...cells: Cell<any>[]) => ce_is_string(cells[0]) as Cell<boolean>;
      const critic2 = (...cells: Cell<any>[]) => ce_is_string(cells[0]) as Cell<boolean>; // Same as critic1
      
      // Define handlers in order
      define_generic_propagator_handler(
        interface_propagator,
        critic1,
        handler1
      );
      
      define_generic_propagator_handler(
        interface_propagator,
        critic2,
        handler2
      );
      
      // Test that the second handler takes precedence
      update(input1, "test");
      await execute_all_tasks_sequential((error: Error) => {});
      
      // Should get response from handler 2 (most recently added)
      expect(cell_strongest_base_value(result1)).toBe("response from handler 2");
    });

    test("should integrate match_cells with define_generic_propagator_handler for elegant type-based routing", async () => {
      // Create interface propagator for string operations
      const dispatcher1 = construct_cell("dispatcher1");
      const dispatcher2 = construct_cell("dispatcher2");
      const result1 = construct_cell("result1");
      
      const string_interface = generic_propagator_prototype(
        "string_operations_interface",
        [dispatcher1, dispatcher2],
        [result1]
      );
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output1 = construct_cell("output1");
      
      const inputs = [input1, input2];
      const outputs = [output1];
      
      // Create the propagator
      const propagator = string_interface(inputs, outputs);
      
      // Define string concatenation handler
      const combine_strings = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const concat_prop = function_to_primitive_propagator(
              "string_concat",
              (a: any, b: any) => {
                if (typeof a === "string" && typeof b === "string") {
                  return a + " " + b;
                }
                return no_compute;
              }
            );
            concat_prop(inputs[0], inputs[1], outputs[0]);
          },
          "combine_strings"
        );
      };
      
      // Define number addition handler
      const add_numbers = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const add_prop = function_to_primitive_propagator(
              "number_add",
              (a: any, b: any) => {
                if (typeof a === "number" && typeof b === "number") {
                  return a + b;
                }
                return no_compute;
              }
            );
            add_prop(inputs[0], inputs[1], outputs[0]);
          },
          "add_numbers"
        );
      };
      
      // Define mixed type handler (string + number)
      const combine_string_number = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const mixed_prop = function_to_primitive_propagator(
              "string_number_combine",
              (a: any, b: any) => {
                if (typeof a === "string" && typeof b === "number") {
                  return `${a}${b}`;
                }
                return no_compute;
              }
            );
            mixed_prop(inputs[0], inputs[1], outputs[0]);
          },
          "combine_string_number"
        );
      };
      
      // Define critics using match_cells for elegant type checking
      const both_strings = (...cells: Cell<any>[]) => match_cells(
        ce_is_string(cells[0]) as Cell<boolean>,
        ce_is_string(cells[1]) as Cell<boolean>
      );
      
      const both_numbers = (...cells: Cell<any>[]) => match_cells(
        ce_is_number(cells[0]) as Cell<boolean>,
        ce_is_number(cells[1]) as Cell<boolean>
      );
      
      const string_then_number = (...cells: Cell<any>[]) => match_cells(
        ce_is_string(cells[0]) as Cell<boolean>,
        ce_is_number(cells[1]) as Cell<boolean>
      );
      
      // Define handlers with match_cells critics
      define_generic_propagator_handler(
        string_interface,
        both_strings,
        combine_strings
      );
      
      define_generic_propagator_handler(
        string_interface,
        both_numbers,
        add_numbers
      );
      
      define_generic_propagator_handler(
        string_interface,
        string_then_number,
        combine_string_number
      );
      
      // Test string concatenation
      update(input1, "Hello");
      update(input2, "World");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result1)).toBe("Hello World");
      
      // Test number addition
      update(input1, 5);
      update(input2, 3);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result1)).toBe(8);
      
      // Test string + number combination
      update(input1, "Item");
      update(input2, 42);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result1)).toBe("Item42");
    });

    test("should handle complex type combinations with match_cells", async () => {
      // Create interface propagator for complex type operations
      const dispatcher1 = construct_cell("dispatcher1");
      const dispatcher2 = construct_cell("dispatcher2");
      const dispatcher3 = construct_cell("dispatcher3");
      const result1 = construct_cell("result1");
      
      const complex_interface = generic_propagator_prototype(
        "complex_operations_interface",
        [dispatcher1, dispatcher2, dispatcher3],
        [result1]
      );
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const input3 = construct_cell("input3");
      const output1 = construct_cell("output1");
      
      const inputs = [input1, input2, input3];
      const outputs = [output1];
      
      // Create the propagator
      const propagator = complex_interface(inputs, outputs);
      
      // Define handlers for different type combinations
      const all_strings_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const all_strings_prop = function_to_primitive_propagator(
              "all_strings",
              (a: any, b: any, c: any) => {
                if (typeof a === "string" && typeof b === "string" && typeof c === "string") {
                  return `${a}-${b}-${c}`;
                }
                return no_compute;
              }
            );
            all_strings_prop(inputs[0], inputs[1], inputs[2], outputs[0]);
          },
          "all_strings_handler"
        );
      };
      
      const all_numbers_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const all_numbers_prop = function_to_primitive_propagator(
              "all_numbers",
              (a: any, b: any, c: any) => {
                if (typeof a === "number" && typeof b === "number" && typeof c === "number") {
                  return a * b + c;
                }
                return no_compute;
              }
            );
            all_numbers_prop(inputs[0], inputs[1], inputs[2], outputs[0]);
          },
          "all_numbers_handler"
        );
      };
      
      const mixed_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const mixed_prop = function_to_primitive_propagator(
              "mixed_types",
              (a: any, b: any, c: any) => {
                if (typeof a === "string" && typeof b === "number" && typeof c === "boolean") {
                  return `${a}${b}${c}`;
                }
                return no_compute;
              }
            );
            mixed_prop(inputs[0], inputs[1], inputs[2], outputs[0]);
          },
          "mixed_handler"
        );
      };
      
      // Define complex critics using match_cells
      const all_strings_critic = (...cells: Cell<any>[]) => match_cells(
        ce_is_string(cells[0]) as Cell<boolean>,
        ce_is_string(cells[1]) as Cell<boolean>,
        ce_is_string(cells[2]) as Cell<boolean>
      );
      
      const all_numbers_critic = (...cells: Cell<any>[]) => match_cells(
        ce_is_number(cells[0]) as Cell<boolean>,
        ce_is_number(cells[1]) as Cell<boolean>,
        ce_is_number(cells[2]) as Cell<boolean>
      );
      
      const mixed_critic = (...cells: Cell<any>[]) => match_cells(
        ce_is_string(cells[0]) as Cell<boolean>,
        ce_is_number(cells[1]) as Cell<boolean>,
        ce_is_boolean(cells[2]) as Cell<boolean>
      );
      
      // Define handlers
      define_generic_propagator_handler(
        complex_interface,
        all_strings_critic,
        all_strings_handler
      );
      
      define_generic_propagator_handler(
        complex_interface,
        all_numbers_critic,
        all_numbers_handler
      );
      
      define_generic_propagator_handler(
        complex_interface,
        mixed_critic,
        mixed_handler
      );
      
      // Test all strings
      update(input1, "A");
      update(input2, "B");
      update(input3, "C");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result1)).toBe("A-B-C");
      
      // Test all numbers
      update(input1, 2);
      update(input2, 3);
      update(input3, 4);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result1)).toBe(10); // 2 * 3 + 4
      
      // Test mixed types
      update(input1, "Test");
      update(input2, 123);
      update(input3, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result1)).toBe("Test123true");
    });
  });
})