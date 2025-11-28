import { describe, test, expect, beforeEach } from "bun:test";
import type { Cell } from "@/cell/Cell";

import { r_constant, update } from "../AdvanceReactivity/interface";
import {
  construct_cell,
  cell_strongest_base_value,
  set_handle_contradiction,
  cell_content,
  cell_strongest,
  make_temp_cell
} from "@/cell/Cell";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { get_base_value } from "sando-layer/Basic/Layer";
import { no_compute } from "../Helper/noCompute";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { is_contradiction, the_nothing } from "@/cell/CellValue";
import { compound_propagator, primitive_propagator, construct_propagator, function_to_primitive_propagator } from "../Propagator/Propagator";
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
import { com_celsius_to_fahrenheit, com_meters_feet_inches, p_add, p_divide, p_filter_a, p_index, p_map_a, p_multiply, p_reduce, p_subtract, p_switch, p_sync, p_zip, c_if_a, c_if_b, p_range, c_range, ce_add, p_and, p_concat, p_not } from "../Propagator/BuiltInProps";
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
  define_generic_propagator_handler_network,
  match_cells,
  p_is_string,
  ce_is_string,
  construct_simple_generic_propagator_network,
  ce_is_number,
  ce_is_boolean,
  construct_simple_generic_propagator,
  propagator_to_handler_network,
  // New sub-functions for testing
  get_propagator_metadata,
  create_succeeded_cells,
  validate_critics,
  validate_handler_network,
  create_interface_propagator,
  store_interface_metadata,
  validate_dispatchers_and_results,
  validate_predicates,
  validate_inputs_match_predicates,
  is_last_index,
  match_predicates_recursive,
  create_match_cells_propagator
} from "../GenericPropagator/generic_propagator";
import { trace_func } from "../helper.ts";
import { v4 as uuidv4 } from 'uuid';

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
        uuidv4(),
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
    test("should handle numeric addition when inputs are numbers", async () => {
      // Create dispatcher and result cells
      const dispatcher1 = construct_cell("dispatcher1");
      const result1 = construct_cell("result1");

      
      
      // Create the interface propagator
      const interface_propagator = construct_simple_generic_propagator("test_interface", 2, 1)
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output1 = construct_cell("output1");
      
      const inputs = [input1, input2];
      const outputs = [output1];
      
      // Create the actual propagator
      const propagator = interface_propagator(input1, input2, output1);
      
      // Define a critic that checks if both inputs are numbers
   
      
      // Define the handler
      define_generic_propagator_handler(
        propagator,
        match_cells(ce_is_number, ce_is_number),
        p_add
      );
      
      // Test with numeric inputs - should trigger addition
      update(input1, 5);
      update(input2, 3);
      
      await execute_all_tasks_sequential(() => {});
      
      // Should add the numbers: 5 + 3 = 8
      expect(cell_strongest_base_value(output1)).toBe(8);
    });

    test("should handle string concatenation when inputs are strings", async () => {
      // Create dispatcher and result cells - need 2 dispatchers for 2 inputs
      const dispatcher1 = construct_cell("dispatcher1");
      const dispatcher2 = construct_cell("dispatcher2");
      const result1 = construct_cell("result1");
      
      const dispatchers = [dispatcher1, dispatcher2];
      const dispatched_results = [result1];
      
      // Create the interface propagator
      const interface_propagator = generic_propagator_prototype(
        uuidv4(),
        "test_interface",
        dispatchers,
        dispatched_results
      );
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output1 = construct_cell("output1");
      
      const inputs = [input1, input2];
      const outputs = [output1];
      
      // Create the actual propagator
      const propagator = interface_propagator(inputs, outputs);
      
      // Define a critic that checks if both inputs are strings
      // Define the handler
      define_generic_propagator_handler(
        propagator,
        match_cells(ce_is_string, ce_is_string),
        p_concat
      );
      
      // Test with string inputs - should trigger concatenation
      update(input1, "hello");
      update(input2, "world");
      
      await execute_all_tasks_sequential(() => {});
      
      // Should concatenate the strings: "hello" + "world" = "helloworld"
      expect(cell_strongest_base_value(output1)).toBe("helloworld");
    });

    test("should not trigger handler when inputs don't match critic", async () => {
      // Create dispatcher and result cells - need 2 dispatchers for 2 inputs
      const dispatcher1 = construct_cell("dispatcher1");
      const dispatcher2 = construct_cell("dispatcher2");
      const result1 = construct_cell("result1");
      
      const dispatchers = [dispatcher1, dispatcher2];
      const dispatched_results = [result1];
      
      // Create the interface propagator
      const interface_propagator = generic_propagator_prototype(
        uuidv4(),
        "test_interface",
        dispatchers,
        dispatched_results
      );
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output1 = construct_cell("output1");
      
      const inputs = [input1, input2];
      const outputs = [output1];
      
      // Create the actual propagator
      const propagator = interface_propagator(inputs, outputs);
      
      // Define a critic that only matches when both inputs are numbers
      // Define the handler
      define_generic_propagator_handler(
        propagator,
        match_cells(ce_is_number, ce_is_number),
        p_add
      );
      
      // Test with mixed inputs - should NOT trigger handler
      update(input1, 5);
      update(input2, "world"); // Mixed types
      
      await execute_all_tasks_sequential(() => {});
      
      // Should not trigger the handler, output should remain the_nothing
      expect(cell_strongest_base_value(output1)).toBe(the_nothing);
    });

    test("should support multiple handlers with different critics", async () => {
      // Create dispatcher and result cells - need 2 dispatchers for 2 inputs
      const dispatcher1 = construct_cell("dispatcher1");
      const dispatcher2 = construct_cell("dispatcher2");
      const result1 = construct_cell("result1");
      
      const dispatchers = [dispatcher1, dispatcher2];
      const dispatched_results = [result1];
      
      // Create the interface propagator
      const interface_propagator = generic_propagator_prototype(
        uuidv4(),
        "test_interface",
        dispatchers,
        dispatched_results
      );
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output1 = construct_cell("output1");
      
      const inputs = [input1, input2];
      const outputs = [output1];
      
      // Create the actual propagator
      const propagator = interface_propagator(inputs, outputs);
      
      // Define number critic and handler
      // Define string critic and handler
      // Define both handlers
      define_generic_propagator_handler(
        propagator,
        match_cells(ce_is_number, ce_is_number),
        trace_func("number handler", p_add)
      );
      
      define_generic_propagator_handler(
        propagator,
        match_cells(ce_is_string, ce_is_string),
        p_concat
      );
      
      // Test number handler
      update(input1, 10);
      update(input2, 20);
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output1)).toBe(30);
      
      // Test string handler
      update(input1, "hello");
      update(input2, "world");
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output1)).toBe("helloworld");
    });
  });

  describe("Match Cells Prototype", () => {
    test("match_cells_prototype should create a matching propagator", async () => {
      // Create predicate cells
   
      
      // Create the match cells prototype
      const match_propagator = match_cells(ce_is_boolean, ce_is_boolean);
      
      // Create input cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      
      const inputs = [input1, input2];
      
      // Create the actual propagator
      const output = match_propagator(...inputs);
      
      // Test the matching logic

      update(input1, 100);
      update(input2, 200);
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      // The output should be true if both predicates are true
      expect(cell_strongest_base_value(output)).toBe(false);


      update(input1, true);
      update(input2, true);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe(true);
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

      
      // Create a simple generic propagator
      const add_propagator = construct_simple_generic_propagator_network(
        "simple_add",
        2, // 2 inputs
        1  // 1 output
      );
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output = construct_cell("output");
      
      const inputs = [input1, input2];
      const outputs = [output];
      
      // Create the actual propagator
      const propagator = add_propagator(inputs, outputs);


      define_generic_propagator_handler(
        propagator,
        match_cells(ce_is_number, ce_is_number),
        p_add
      );
      
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
        uuidv4(),
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
        propagator,
        string_critic,
        p_sync
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

    
 });

  describe("Propagator to Handler Network", () => {
    test("should convert propagator constructor to handler network", async () => {
      // Create a simple propagator constructor that adds two inputs
      const add_propagator_constructor = (input1: Cell<number>, input2: Cell<number>, output: Cell<number>) => {
        return p_add(input1, input2, output);
      };

      // Convert to handler network
      const handler_network = propagator_to_handler_network(add_propagator_constructor);

      // Create test cells
      const input1 = construct_cell<number>("input1");
      const input2 = construct_cell<number>("input2");
      const output = construct_cell<number>("output");

      const inputs = [input1, input2];
      const outputs = [output];

      // Create the propagator using the handler network
      const propagator = handler_network(inputs, outputs);

      // Test the functionality
      update(input1, 5);
      update(input2, 3);

      await execute_all_tasks_sequential(() => {});

      // Should add the numbers: 5 + 3 = 8
      expect(cell_strongest_base_value(output)).toBe(8);
    });

    test("should handle multiple inputs and outputs", async () => {
      // Create a propagator constructor that processes multiple inputs and outputs
      const multi_propagator_constructor = (
        input1: Cell<number>, 
        input2: Cell<number>, 
        output1: Cell<number>, 
        output2: Cell<number>
      ) => {
        return compound_propagator([input1, input2], [output1, output2], () => {
          p_add(input1, input2, output1);
          p_multiply(input1, input2, output2);
        }, "multi_ops");
      };

      // Convert to handler network
      const handler_network = propagator_to_handler_network(multi_propagator_constructor);

      // Create test cells
      const input1 = construct_cell<number>("input1");
      const input2 = construct_cell<number>("input2");
      const output1 = construct_cell<number>("output1");
      const output2 = construct_cell<number>("output2");

      const inputs = [input1, input2];
      const outputs = [output1, output2];

      // Create the propagator using the handler network
      const propagator = handler_network(inputs, outputs);

      // Test the functionality
      update(input1, 4);
      update(input2, 3);

      await execute_all_tasks_sequential(() => {});

      // Should add: 4 + 3 = 7
      expect(cell_strongest_base_value(output1)).toBe(7);
      // Should multiply: 4 * 3 = 12
      expect(cell_strongest_base_value(output2)).toBe(12);
    });

    test("should work with string operations", async () => {
      // Create a propagator constructor that concatenates strings
      const concat_propagator_constructor = (input1: Cell<string>, input2: Cell<string>, output: Cell<string>) => {
        return p_concat(input1, input2, output);
      };

      // Convert to handler network
      const handler_network = propagator_to_handler_network(concat_propagator_constructor);

      // Create test cells
      const input1 = construct_cell<string>("input1");
      const input2 = construct_cell<string>("input2");
      const output = construct_cell<string>("output");

      const inputs = [input1, input2];
      const outputs = [output];

      // Create the propagator using the handler network
      const propagator = handler_network(inputs, outputs);

      // Test the functionality
      update(input1, "hello");
      update(input2, "world");

      await execute_all_tasks_sequential(() => {});

      // Should concatenate: "hello" + "world" = "helloworld"
      expect(cell_strongest_base_value(output)).toBe("helloworld");
    });

    test("should work with boolean operations", async () => {
      // Create a propagator constructor that performs logical AND
      const and_propagator_constructor = (input1: Cell<boolean>, input2: Cell<boolean>, output: Cell<boolean>) => {
        return p_and(input1, input2, output);
      };

      // Convert to handler network
      const handler_network = propagator_to_handler_network(and_propagator_constructor);

      // Create test cells
      const input1 = construct_cell<boolean>("input1");
      const input2 = construct_cell<boolean>("input2");
      const output = construct_cell<boolean>("output");

      const inputs = [input1, input2];
      const outputs = [output];

      // Create the propagator using the handler network
      const propagator = handler_network(inputs, outputs);

      // Test with both true
      update(input1, true);
      update(input2, true);

      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output)).toBe(true);

      // Test with one false
      update(input2, false);
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output)).toBe(false);
    });

    test("should work with compound propagators", async () => {
      // Create a compound propagator constructor
      const compound_propagator_constructor = (input1: Cell<number>, input2: Cell<number>, output: Cell<number>) => {
        return compound_propagator(
          [input1, input2],
          [output],
          () => {
            // Custom logic: multiply first input by 2, then add second input
            const doubled = make_temp_cell();
            p_multiply(input1, r_constant(2), doubled);
            p_add(doubled, input2, output);
          },
          "compound_operation"
        );
      };

      // Convert to handler network
      const handler_network = propagator_to_handler_network(compound_propagator_constructor);

      // Create test cells
      const input1 = construct_cell<number>("input1");
      const input2 = construct_cell<number>("input2");
      const output = construct_cell<number>("output");

      const inputs = [input1, input2];
      const outputs = [output];

      // Create the propagator using the handler network
      const propagator = handler_network(inputs, outputs);

      // Test the functionality: (3 * 2) + 4 = 10
      update(input1, 3);
      update(input2, 4);

      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output)).toBe(10);
    });

    test("should handle empty inputs and outputs", async () => {
      // Create a propagator constructor that takes no inputs or outputs (just for testing)
      const no_op_propagator_constructor = () => {
        return compound_propagator([], [], () => {
          // Do nothing
        }, "no_op");
      };

      // Convert to handler network
      const handler_network = propagator_to_handler_network(no_op_propagator_constructor);

      // Create empty arrays
      const inputs: Cell<any>[] = [];
      const outputs: Cell<any>[] = [];

      // Create the propagator using the handler network
      const propagator = handler_network(inputs, outputs);

      // Should not throw an error
      await execute_all_tasks_sequential(() => {});
      expect(propagator).toBeDefined();
    });

    test("should work with single input and output", async () => {
      // Create a propagator constructor that doubles a number
      const double_propagator_constructor = (input: Cell<number>, output: Cell<number>) => {
        return p_multiply(input, r_constant(2), output);
      };

      // Convert to handler network
      const handler_network = propagator_to_handler_network(double_propagator_constructor);

      // Create test cells
      const input = construct_cell<number>("input");
      const output = construct_cell<number>("output");

      const inputs = [input];
      const outputs = [output];

      // Create the propagator using the handler network
      const propagator = handler_network(inputs, outputs);

      // Test the functionality
      update(input, 7);

      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output)).toBe(14);
    });

    test("should work with mixed type operations", async () => {
      // Create a propagator constructor that converts number to string
      const number_to_string_constructor = (input: Cell<number>, output: Cell<string>) => {
        return compound_propagator(
          [input],
          [output],
          () => {
            // Convert number to string using a custom function
            const string_prop = function_to_primitive_propagator(
              "number_to_string",
              (num: number) => num.toString()
            );
            string_prop(input, output);
          },
          "number_to_string"
        );
      };

      // Convert to handler network
      const handler_network = propagator_to_handler_network(number_to_string_constructor);

      // Create test cells
      const input = construct_cell<number>("input");
      const output = construct_cell<string>("output");

      const inputs = [input];
      const outputs = [output];

      // Create the propagator using the handler network
      const propagator = handler_network(inputs, outputs);

      // Test the functionality
      update(input, 42);

      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output)).toBe("42");
    });

    test("should work with reactive updates", async () => {
      // Create a propagator constructor that adds three numbers
      const add_three_constructor = (input1: Cell<number>, input2: Cell<number>, input3: Cell<number>, output: Cell<number>) => {
        const temp = make_temp_cell();
        const add1 = p_add(input1, input2, temp);
        const add2 = p_add(temp, input3, output);
        return compound_propagator([input1, input2, input3], [output], () => {
          add1;
          add2;
        }, "add_three");
      };

      // Convert to handler network
      const handler_network = propagator_to_handler_network(add_three_constructor);

      // Create test cells
      const input1 = construct_cell<number>("input1");
      const input2 = construct_cell<number>("input2");
      const input3 = construct_cell<number>("input3");
      const output = construct_cell<number>("output");

      const inputs = [input1, input2, input3];
      const outputs = [output];

      // Create the propagator using the handler network
      const propagator = handler_network(inputs, outputs);

      // Test reactive updates
      update(input1, 1);
      update(input2, 2);
      update(input3, 3);

      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output)).toBe(6);

      // Update one input and verify reactive behavior
      update(input1, 10);
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output)).toBe(15);
    });

    test("should work with conditional operations", async () => {
      // Create a propagator constructor that conditionally processes based on a boolean
      const conditional_constructor = (condition: Cell<boolean>, input: Cell<number>, output: Cell<number>) => {
        return p_switch(condition, input, output);
      };

      // Convert to handler network
      const handler_network = propagator_to_handler_network(conditional_constructor);

      // Create test cells
      const condition = construct_cell<boolean>("condition");
      const input = construct_cell<number>("input");
      const output = construct_cell<number>("output");

      const inputs = [condition, input];
      const outputs = [output];

      // Create the propagator using the handler network
      const propagator = handler_network(inputs, outputs);

      // Test with condition true
      update(condition, true);
      update(input, 42);

      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output)).toBe(42);

      // Test with condition false
      update(condition, false);
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output)).toBe(42);
    });
  });

  describe("Refactored Sub-Functions Tests", () => {
    
    describe("Validation Functions", () => {
      test("validate_critics should accept valid critics function", () => {
        const valid_critics = (...cells: Cell<any>[]) => ce_is_number(cells[0]);
        expect(() => validate_critics(valid_critics)).not.toThrow();
      });

      test("validate_critics should throw error for invalid critics", () => {
        expect(() => validate_critics("not a function" as any)).toThrow("Critics must be a function");
        expect(() => validate_critics(42 as any)).toThrow("Critics must be a function");
        expect(() => validate_critics(null as any)).toThrow("Critics must be a function");
      });

      test("validate_handler_network should accept valid handler network", () => {
        const valid_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => p_add(inputs[0], inputs[1], outputs[0]);
        expect(() => validate_handler_network(valid_handler)).not.toThrow();
      });

      test("validate_handler_network should throw error for invalid handler network", () => {
        expect(() => validate_handler_network("not a function" as any)).toThrow("Handler network must be a function");
        expect(() => validate_handler_network(42 as any)).toThrow("Handler network must be a function");
        expect(() => validate_handler_network(null as any)).toThrow("Handler network must be a function");
      });

      test("validate_dispatchers_and_results should accept valid arrays", () => {
        const dispatchers = [construct_cell("d1"), construct_cell("d2")];
        const results = [construct_cell("r1"), construct_cell("r2")];
        expect(() => validate_dispatchers_and_results(dispatchers, results)).not.toThrow();
      });

      test("validate_dispatchers_and_results should throw error for invalid dispatchers", () => {
        const results = [construct_cell("r1")];
        expect(() => validate_dispatchers_and_results("not array" as any, results)).toThrow("Dispatchers must be an array");
      });

      test("validate_dispatchers_and_results should throw error for invalid results", () => {
        const dispatchers = [construct_cell("d1")];
        expect(() => validate_dispatchers_and_results(dispatchers, "not array" as any)).toThrow("Dispatched results must be an array");
      });

      test("validate_dispatchers_and_results should throw error for mismatched lengths", () => {
        const dispatchers = [construct_cell("d1"), construct_cell("d2")];
        const results = [construct_cell("r1")];
        expect(() => validate_dispatchers_and_results(dispatchers, results)).toThrow("Dispatchers and dispatched results must have the same length");
      });

      test("validate_predicates should accept valid predicates array", () => {
        const predicates = [ce_is_number, ce_is_string];
        expect(() => validate_predicates(predicates)).not.toThrow();
      });

      test("validate_predicates should throw error for empty array", () => {
        expect(() => validate_predicates([])).toThrow("At least one predicate is required");
      });

      test("validate_predicates should throw error for non-function predicates", () => {
        const predicates = [ce_is_number, "not a function" as any];
        expect(() => validate_predicates(predicates)).toThrow("All predicates must be functions");
      });

      test("validate_inputs_match_predicates should accept matching lengths", () => {
        const predicates = [ce_is_number, ce_is_string];
        const inputs = [construct_cell("i1"), construct_cell("i2")];
        expect(() => validate_inputs_match_predicates(predicates, inputs)).not.toThrow();
      });

      test("validate_inputs_match_predicates should throw error for mismatched lengths", () => {
        const predicates = [ce_is_number, ce_is_string];
        const inputs = [construct_cell("i1")];
        expect(() => validate_inputs_match_predicates(predicates, inputs)).toThrow("Predicates and inputs must have the same length");
      });
    });

    describe("Utility Functions", () => {
      test("is_last_index should correctly identify last index", () => {
        expect(is_last_index(0, 1)).toBe(true);
        expect(is_last_index(1, 2)).toBe(true);
        expect(is_last_index(0, 2)).toBe(false);
        expect(is_last_index(1, 3)).toBe(false);
      });

      test("create_interface_propagator should create working propagator", async () => {
        const dispatchers = [construct_cell("d1"), construct_cell("d2")];
        const results = [construct_cell("r1"), construct_cell("r2")];
        
        const interface_propagator = create_interface_propagator("test", uuidv4(), dispatchers, results);
        
        const inputs = [construct_cell("i1"), construct_cell("i2")];
        const outputs = [construct_cell("o1"), construct_cell("o2")];
        
        const propagator = interface_propagator(inputs, outputs);
        
        update(inputs[0], 100);
        update(inputs[1], 200);
        
        await execute_all_tasks_sequential(() => {});
        
        expect(cell_strongest_base_value(dispatchers[0])).toBe(100);
        expect(cell_strongest_base_value(dispatchers[1])).toBe(200);
      });

      test("store_interface_metadata should store metadata correctly", () => {
        const dispatchers = [construct_cell("d1")];
        const results = [construct_cell("r1")];
        const interface_propagator = (inputs: Cell<any>[], outputs: Cell<any>[]) => compound_propagator(inputs, outputs, () => {}, "test");
        
        store_interface_metadata(uuidv4(), dispatchers, results);
        
        // This would require access to interface_store to verify, but we can test it doesn't throw
        expect(() => store_interface_metadata(uuidv4(), dispatchers, results)).not.toThrow();
      });

      test("create_succeeded_cells should create cells with switch logic", async () => {
        const dispatchers = [construct_cell("d1"), construct_cell("d2")];
        const critics = (...cells: Cell<any>[]) => ce_is_number(cells[0]);
        
        const succeeded = create_succeeded_cells(dispatchers, critics);
        
        expect(succeeded).toHaveLength(2);
        expect(succeeded.every(cell => cell !== null)).toBe(true);
        
        // Test that the cells are properly connected
        update(dispatchers[0], 42);
        await execute_all_tasks_sequential(() => {});
        
        // The succeeded cells should receive the values when critics match
        expect(cell_strongest_base_value(succeeded[0])).toBe(42);
      });

      test("create_match_cells_propagator should create working propagator", async () => {
        const predicates = [ce_is_number, ce_is_string];
        const inputs = [construct_cell("i1"), construct_cell("i2")];
        const output = construct_cell("output") as Cell<boolean>;
        
        const propagator = create_match_cells_propagator(predicates, inputs, output);
        
        update(inputs[0], 42);
        update(inputs[1], "hello");
        
        await execute_all_tasks_sequential(() => {});
        
        expect(cell_strongest_base_value(output)).toBe(true);
      });

      test("match_predicates_recursive should handle single predicate", async () => {
        const predicates = [ce_is_number];
        const inputs = [construct_cell("i1")];
        const output = construct_cell("output") as Cell<boolean>;
        
        update(inputs[0], 42);
        
        match_predicates_recursive(predicates, inputs, output, 0, r_constant(true));
        
        await execute_all_tasks_sequential(() => {});
        
        expect(cell_strongest_base_value(output)).toBe(true);
      });

      test("match_predicates_recursive should handle multiple predicates", async () => {
        const predicates = [ce_is_number, ce_is_string];
        const inputs = [construct_cell("i1"), construct_cell("i2")];
        const output = construct_cell("output") as Cell<boolean>;
        
        update(inputs[0], 42);
        update(inputs[1], "hello");
        
        match_predicates_recursive(predicates, inputs, output, 0, r_constant(true));
        
        await execute_all_tasks_sequential(() => {});
        
        expect(cell_strongest_base_value(output)).toBe(true);
      });

      test("match_predicates_recursive should handle false predicates", async () => {
        const predicates = [ce_is_number, ce_is_string];
        const inputs = [construct_cell("i1"), construct_cell("i2")];
        const output = construct_cell("output") as Cell<boolean>;
        
        update(inputs[0], 42);
        update(inputs[1], 123); // Not a string
        
        match_predicates_recursive(predicates, inputs, output, 0, r_constant(true));
        
        await execute_all_tasks_sequential(() => {});
        
        expect(cell_strongest_base_value(output)).toBe(false);
      });
    });

    describe("Metadata Functions", () => {
      test("get_propagator_metadata should throw error for invalid input", () => {
        expect(() => get_propagator_metadata("not a propagator" as any)).toThrow("Invalid propagator or interface");
        expect(() => get_propagator_metadata(42 as any)).toThrow("Invalid propagator or interface");
        expect(() => get_propagator_metadata(null as any)).toThrow("Invalid propagator or interface");
      });

      test("get_propagator_metadata should throw error for unknown interface", () => {
        const unknown_propagator = construct_propagator([construct_cell("d1")], [construct_cell("r1")], () => {}, uuidv4())
        expect(() => get_propagator_metadata(unknown_propagator)).toThrow("Propagator metadata not found in store");
      });

      test("get_propagator_metadata should work with valid interface", () => {
        const dispatchers = [construct_cell("d1")];
        const results = [construct_cell("r1")];
        const interface_propagator = generic_propagator_prototype(uuidv4(), "test", dispatchers, results);
        const propagator = interface_propagator([construct_cell("i1"), construct_cell("i2")], [construct_cell("o1")])  
        const metadata = get_propagator_metadata(propagator);
        
        expect(metadata.dispatchers).toBe(dispatchers);
        expect(metadata.dispatched_results).toBe(results);
      });
    });

    describe("Refactored Main Functions", () => {
      test("refactored generic_propagator_prototype should work correctly", async () => {
        const dispatchers = [construct_cell("d1"), construct_cell("d2")];
        const results = [construct_cell("r1"), construct_cell("r2")];
        
        const interface_propagator = generic_propagator_prototype(uuidv4(), "test", dispatchers, results);
        
        const inputs = [construct_cell("i1"), construct_cell("i2")];
        const outputs = [construct_cell("o1"), construct_cell("o2")];
        
        const propagator = interface_propagator(inputs, outputs);
        
        update(inputs[0], 100);
        update(inputs[1], 200);
        
        await execute_all_tasks_sequential(() => {});
        
        expect(cell_strongest_base_value(dispatchers[0])).toBe(100);
        expect(cell_strongest_base_value(dispatchers[1])).toBe(200);
        
        update(results[0], 300);
        update(results[1], 400);
        
        await execute_all_tasks_sequential(() => {});
        
        expect(cell_strongest_base_value(outputs[0])).toBe(300);
        expect(cell_strongest_base_value(outputs[1])).toBe(400);
      });

      test("refactored generic_propagator_prototype should work without validation", () => {
        // Since we removed validation from generic_propagator_prototype, it should work without validation
        const dispatcher = construct_cell("dispatcher");
        const result = construct_cell("result");
        const interface_propagator = generic_propagator_prototype(uuidv4(), "test", [dispatcher], [result]);
        expect(typeof interface_propagator).toBe("function");
      });

      test("refactored match_cells should work correctly", async () => {
        const match_function = match_cells(ce_is_number, ce_is_string);
        
        const input1 = construct_cell("input1");
        const input2 = construct_cell("input2");
        
        const result = match_function(input1, input2);
        
        update(input1, 42);
        update(input2, "hello");
        
        await execute_all_tasks_sequential(() => {});
        
        expect(cell_strongest_base_value(result)).toBe(true);
      });

      test("refactored match_cells should validate predicates", () => {
        expect(() => match_cells()).toThrow("At least one predicate is required");
        expect(() => match_cells("not a function" as any)).toThrow("All predicates must be functions");
      });

      test("refactored define_generic_propagator_handler_network should work correctly", async () => {
        const dispatchers = [construct_cell("d1"), construct_cell("d2")];
        const results = [construct_cell("r1")];
        const interface_propagator = generic_propagator_prototype(uuidv4(), "test", dispatchers, results);
        
        const critics = (...cells: Cell<any>[]) => ce_is_number(cells[0]);
        const handler_network = (inputs: Cell<any>[], outputs: Cell<any>[]) => p_add(inputs[0], inputs[1], outputs[0]);
        
        const inputs = [construct_cell("i1"), construct_cell("i2")];
        const outputs = [construct_cell("o1")];
        
        const propagator = interface_propagator(inputs, outputs);
        
        define_generic_propagator_handler_network(propagator, critics, handler_network);
        
        update(inputs[0], 5);
        update(inputs[1], 3);
        
        await execute_all_tasks_sequential(() => {});
        
        expect(cell_strongest_base_value(outputs[0])).toBe(8);
      });

      test("refactored define_generic_propagator_handler_network should validate inputs", () => {
        const interface_propagator = generic_propagator_prototype(uuidv4(), "test", [construct_cell("d1")], [construct_cell("r1")]);
        const propagator = interface_propagator([construct_cell("i1"), construct_cell("i2")], [construct_cell("o1")])  
        expect(() => define_generic_propagator_handler_network(propagator, "not function" as any, (inputs, outputs) => p_sync(inputs[0], outputs[0]))).toThrow("Critics must be a function");
        expect(() => define_generic_propagator_handler_network(propagator, (...cells) => ce_is_number(cells[0]), "not function" as any)).toThrow("Handler network must be a function");
      });
    });
  });
}); 