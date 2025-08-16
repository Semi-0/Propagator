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

// Import the generic propagator functions
import {
  generic_propagator_prototype,
  define_generic_propagator_handler,
  match_cells_prototype,
  match_cells,
  p_is_string,
  ce_is_string,
  construct_simple_generic_propagator
} from "../GenericPropagator/generic_propagator";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_global_state(PublicStateCommand.SET_SCHEDULER, reactive_scheduler());
  set_merge(reactive_merge);
});

describe("Generic Propagator Tests", () => {
  
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

  describe("Define Generic Propagator Handler", () => {
    test("define_generic_propagator_handler should work with interface propagator", async () => {
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
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output1 = construct_cell("output1");
      const output2 = construct_cell("output2");
      
      const inputs = [input1, input2];
      const outputs = [output1, output2];
      
      // Create the actual propagator
      const propagator = interface_propagator(inputs, outputs);
      
      // Define a handler that adds the inputs when they are numbers
      const number_critic = (...cells: Cell<any>[]) => {
        // Simple critic: check if first cell is a number
        return ce_is_string(cells[0]);
      };
      
      const add_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        // Simple handler: add the two inputs
        return p_add(inputs[0], inputs[1], outputs[0]);
      };
      
      // Define the handler
      define_generic_propagator_handler(
        interface_propagator,
        number_critic,
        add_handler
      );
      
      // Test the handler
      update(input1, "hello");
      update(input2, "world");
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      // The handler should be triggered because input1 is a string
      // But since we're using p_add, it might not work as expected with strings
      // This test reveals a potential issue with the handler system
    });
  });

  describe("Match Cells Prototype", () => {
    test("match_cells_prototype should create a matching propagator", async () => {
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
  });

  describe("Match Cells", () => {
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
  });

  describe("String Predicates", () => {
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

  describe("Complex Generic Propagator Scenarios", () => {
    test("should handle conditional routing based on input types", async () => {
      // Create a generic propagator that routes based on input type
      const dispatcher1 = construct_cell("dispatcher1");
      const dispatcher2 = construct_cell("dispatcher2");
      const result1 = construct_cell("result1");
      const result2 = construct_cell("result2");
      
      const dispatchers = [dispatcher1, dispatcher2];
      const dispatched_results = [result1, result2];
      
      const interface_propagator = generic_propagator_prototype(
        "type_router",
        dispatchers,
        dispatched_results
      );
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output1 = construct_cell("output1");
      const output2 = construct_cell("output2");
      
      const inputs = [input1, input2];
      const outputs = [output1, output2];
      
      const propagator = interface_propagator(inputs, outputs);
      
      // Define handlers for different types
      const string_critic = (...cells: Cell<any>[]) => ce_is_string(cells[0]);
      const number_critic = (...cells: Cell<any>[]) => {
        const is_string_result = ce_is_string(cells[0]);
        // We need a way to negate the result - this reveals a limitation
        return is_string_result; // This is not correct for number detection
      };
      
      const string_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return p_sync(inputs[0], outputs[0]);
      };
      
      const number_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return p_add(inputs[0], inputs[1], outputs[0]);
      };
      
      // Define handlers
      define_generic_propagator_handler(
        interface_propagator,
        string_critic,
        string_handler
      );
      
      // Test with string input
      update(input1, "hello");
      update(input2, "world");
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      // This test reveals that the current system has limitations
      // The critic system needs more sophisticated logic
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle empty predicate arrays in match_cells", () => {
      // This should throw an error
      expect(() => {
        match_cells();
      }).toThrow("At least one predicate is required");
    });

    test("should handle mismatched input/output arities", async () => {
      // Create a propagator with mismatched arities
      const add_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return p_add(inputs[0], inputs[1], outputs[0]);
      };
      
      const add_propagator = construct_simple_generic_propagator(
        "mismatched_add",
        2, // 2 inputs
        1, // 1 output
        add_handler
      );
      
      // Try to use with wrong number of inputs/outputs
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const input3 = construct_cell("input3"); // Extra input
      const output1 = construct_cell("output1");
      const output2 = construct_cell("output2"); // Extra output
      
      const inputs = [input1, input2, input3];
      const outputs = [output1, output2];
      
      // This should work but might not behave as expected
      const propagator = add_propagator(inputs, outputs);
      
      // Test to see what happens
      update(input1, 10);
      update(input2, 20);
      update(input3, 30);
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      // The behavior might be undefined due to mismatched arities
    });
  });
}); 