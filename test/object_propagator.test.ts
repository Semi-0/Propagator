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

// Import the object propagator system
import {
  create_object_propagator,
  create_dispatch_store_propagator,
  create_enhanced_generic_propagator,
  construct_simple_generic_propagator_v2,
  p_simultaneous,
  p_composite_with_callback,
  type ObjectPropagator,
  type SelectionStrategy,
  type HandlerEntry,
  type DispatchStore,
  match_cells,
  ce_is_string,
  ce_is_number,
  ce_is_boolean
} from "../GenericPropagator/generic_propagator_fixed";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_global_state(PublicStateCommand.SET_SCHEDULER, reactive_scheduler());
  set_merge(reactive_merge);
});

describe("Object Propagator System Tests", () => {
  
  describe("Basic Object Propagator", () => {
    test("create_object_propagator should create and use a simple object propagator", async () => {
      // Create a counter object propagator
      const counter_propagator = create_object_propagator(
        "counter",
        { count: 0 },
        (state, cmd) => {
          if (cmd.type === "increment") {
            return { new_state: { count: state.count + 1 }, result: state.count + 1 };
          } else if (cmd.type === "decrement") {
            return { new_state: { count: state.count - 1 }, result: state.count - 1 };
          } else if (cmd.type === "get") {
            return { new_state: state, result: state.count };
          }
          return { new_state: state, result: the_nothing };
        }
      );
      
      // Create the object propagator instance
      const obj_prop = counter_propagator({ count: 0 });
      const cmd_cell = construct_cell("cmd");
      const result_cell = construct_cell("result");
      
      // Connect the object propagator
      obj_prop(cmd_cell, result_cell);
      
      // Test increment
      update(cmd_cell, { type: "increment" });
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result_cell)).toBe(1);
      
      // Test increment again
      update(cmd_cell, { type: "increment" });
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result_cell)).toBe(2);
      
      // Test get
      update(cmd_cell, { type: "get" });
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result_cell)).toBe(2);
      
      // Test decrement
      update(cmd_cell, { type: "decrement" });
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result_cell)).toBe(1);
    });

    test("create_object_propagator should handle complex state transitions", async () => {
      // Create a calculator object propagator
      const calculator_propagator = create_object_propagator(
        "calculator",
        { operations: [], result: 0 },
        (state, cmd) => {
          if (cmd.type === "add") {
            const new_result = state.result + cmd.value;
            return { 
              new_state: { 
                operations: [...state.operations, `add ${cmd.value}`], 
                result: new_result 
              }, 
              result: new_result 
            };
          } else if (cmd.type === "multiply") {
            const new_result = state.result * cmd.value;
            return { 
              new_state: { 
                operations: [...state.operations, `multiply ${cmd.value}`], 
                result: new_result 
              }, 
              result: new_result 
            };
          } else if (cmd.type === "get_history") {
            return { new_state: state, result: state.operations };
          } else if (cmd.type === "clear") {
            return { 
              new_state: { operations: [], result: 0 }, 
              result: 0 
            };
          }
          return { new_state: state, result: the_nothing };
        }
      );
      
      // Create the object propagator instance
      const obj_prop = calculator_propagator({ operations: [], result: 0 });
      const cmd_cell = construct_cell("cmd");
      const result_cell = construct_cell("result");
      
      // Connect the object propagator
      obj_prop(cmd_cell, result_cell);
      
      // Test initial state
      update(cmd_cell, { type: "get_history" });
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result_cell)).toEqual([]);
      
      // Test add operation
      update(cmd_cell, { type: "add", value: 5 });
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result_cell)).toBe(5);
      
      // Test multiply operation
      update(cmd_cell, { type: "multiply", value: 3 });
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result_cell)).toBe(15);
      
      // Test get history
      update(cmd_cell, { type: "get_history" });
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result_cell)).toEqual(["add 5", "multiply 3"]);
      
      // Test clear
      update(cmd_cell, { type: "clear" });
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result_cell)).toBe(0);
    });
  });

  describe("Dispatch Store Object Propagator", () => {
    test("create_dispatch_store_propagator should manage handlers and selection strategies", async () => {
      // Create a dispatch store
      const dispatch_store = create_dispatch_store_propagator("test_store");
      const cmd_cell = construct_cell("cmd");
      const result_cell = construct_cell("result");
      
      // Connect the dispatch store
      dispatch_store(cmd_cell, result_cell);
      
      // Test add handler
      const add_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const add_prop = function_to_primitive_propagator(
              "add_handler",
              (a: any, b: any) => typeof a === "number" && typeof b === "number" ? a + b : the_nothing
            );
            add_prop(inputs[0], inputs[1], outputs[0]);
          },
          "add_handler"
        );
      };
      
      const string_concat_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const concat_prop = function_to_primitive_propagator(
              "string_concat_handler",
              (a: any, b: any) => typeof a === "string" && typeof b === "string" ? a + b : the_nothing
            );
            concat_prop(inputs[0], inputs[1], outputs[0]);
          },
          "string_concat_handler"
        );
      };
      
      // Add handlers
      dispatch_store.add_handler(
        (...cells: Cell<any>[]) => ce_is_number(cells[0]) as Cell<boolean>,
        add_handler,
        1
      );
      
      dispatch_store.add_handler(
        (...cells: Cell<any>[]) => ce_is_string(cells[0]) as Cell<boolean>,
        string_concat_handler,
        1
      );
      
      // Test number handler
      update(cmd_cell, { type: "process", inputs: [5, 3] });
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result_cell)).toBe(8);
      
      // Test string handler
      update(cmd_cell, { type: "process", inputs: ["hello", "world"] });
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result_cell)).toBe("helloworld");
    });

    test("dispatch store should handle selection strategy changes", async () => {
      // Create a dispatch store
      const dispatch_store = create_dispatch_store_propagator("strategy_test_store");
      const cmd_cell = construct_cell("cmd");
      const result_cell = construct_cell("result");
      
      // Connect the dispatch store
      dispatch_store(cmd_cell, result_cell);
      
      // Create handlers that both match the same input
      const handler1 = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const prop1 = function_to_primitive_propagator(
              "handler1",
              (value: any) => "result from handler 1"
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
              (value: any) => "result from handler 2"
            );
            prop2(inputs[0], outputs[0]);
          },
          "handler2"
        );
      };
      
      // Add handlers with different priorities
      dispatch_store.add_handler(
        (...cells: Cell<any>[]) => ce_is_string(cells[0]) as Cell<boolean>,
        handler1,
        1
      );
      
      dispatch_store.add_handler(
        (...cells: Cell<any>[]) => ce_is_string(cells[0]) as Cell<boolean>,
        handler2,
        2
      );
      
      // Test with most_recent strategy (default)
      update(cmd_cell, { type: "process", inputs: ["test"] });
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result_cell)).toBe("result from handler 2");
      
      // Change to most_specific strategy
      dispatch_store.set_selection_strategy("most_specific");
      update(cmd_cell, { type: "process", inputs: ["test"] });
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result_cell)).toBe("result from handler 2");
      
      // Change to priority strategy
      dispatch_store.set_selection_strategy("priority");
      update(cmd_cell, { type: "process", inputs: ["test"] });
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(result_cell)).toBe("result from handler 2");
    });
  });

  describe("Enhanced Generic Propagator with Selection Strategies", () => {
    test("should use most_recent selection strategy", async () => {
      const { interface_propagator, add_handler } = create_enhanced_generic_propagator(
        "test_most_recent",
        "most_recent"
      );
      
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output = construct_cell("output");
      const inputs = [input1, input2];
      const outputs = [output];
      const propagator = interface_propagator(inputs, outputs);
      
      const handler1 = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(inputs, outputs, () => {
          const prop1 = function_to_primitive_propagator(
            "handler1",
            (value: any) => "handler1_result"
          );
          prop1(inputs[0], outputs[0]);
        }, "handler1");
      };
      
      const handler2 = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(inputs, outputs, () => {
          const prop2 = function_to_primitive_propagator(
            "handler2",
            (value: any) => "handler2_result"
          );
          prop2(inputs[0], outputs[0]);
        }, "handler2");
      };
      
      const critic1 = (...cells: Cell<any>[]) => ce_is_string(cells[0]) as Cell<boolean>;
      const critic2 = (...cells: Cell<any>[]) => ce_is_string(cells[0]) as Cell<boolean>;
      
      add_handler(critic1, handler1, 1);
      add_handler(critic2, handler2, 1);
      
      update(input1, "test");
      update(input2, "test2");
      await execute_all_tasks_sequential((error: Error) => {});
      
      // Should get the most recently added handler result
      const result = cell_strongest_base_value(output);
      expect(result).toBe("handler2_result");
    });

    test("should use most_specific selection strategy", async () => {
      const { interface_propagator, add_handler } = create_enhanced_generic_propagator(
        "test_most_specific",
        "most_specific"
      );
      
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output = construct_cell("output");
      const inputs = [input1, input2];
      const outputs = [output];
      const propagator = interface_propagator(inputs, outputs);
      
      const handler1 = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(inputs, outputs, () => {
          const prop1 = function_to_primitive_propagator(
            "handler1",
            (value: any) => "handler1_result"
          );
          prop1(inputs[0], outputs[0]);
        }, "handler1");
      };
      
      const handler2 = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(inputs, outputs, () => {
          const prop2 = function_to_primitive_propagator(
            "handler2",
            (value: any) => "handler2_result"
          );
          prop2(inputs[0], outputs[0]);
        }, "handler2");
      };
      
      // Handler1 checks one input, Handler2 checks two inputs (more specific)
      const critic1 = (...cells: Cell<any>[]) => ce_is_string(cells[0]) as Cell<boolean>;
      const critic2 = (...cells: Cell<any>[]) => match_cells(
        ce_is_string(cells[0]) as Cell<boolean>,
        ce_is_string(cells[1]) as Cell<boolean>
      );
      
      add_handler(critic1, handler1, 1);
      add_handler(critic2, handler2, 1);
      
      update(input1, "test");
      update(input2, "test2");
      await execute_all_tasks_sequential((error: Error) => {});
      
      // Should get the most specific handler result (handler2 checks 2 inputs)
      const result = cell_strongest_base_value(output);
      expect(result).toBe("handler2_result");
    });

    test("should use simultaneous selection strategy", async () => {
      const { interface_propagator, add_handler } = create_enhanced_generic_propagator(
        "test_simultaneous",
        "simultaneous"
      );
      
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output = construct_cell("output");
      const inputs = [input1, input2];
      const outputs = [output];
      const propagator = interface_propagator(inputs, outputs);
      
      const handler1 = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(inputs, outputs, () => {
          const prop1 = function_to_primitive_propagator(
            "handler1",
            (value: any) => "handler1_result"
          );
          prop1(inputs[0], outputs[0]);
        }, "handler1");
      };
      
      const handler2 = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(inputs, outputs, () => {
          const prop2 = function_to_primitive_propagator(
            "handler2",
            (value: any) => "handler2_result"
          );
          prop2(inputs[0], outputs[0]);
        }, "handler2");
      };
      
      const critic1 = (...cells: Cell<any>[]) => ce_is_string(cells[0]) as Cell<boolean>;
      const critic2 = (...cells: Cell<any>[]) => ce_is_string(cells[0]) as Cell<boolean>;
      
      add_handler(critic1, handler1, 1);
      add_handler(critic2, handler2, 1);
      
      update(input1, "test");
      update(input2, "test2");
      await execute_all_tasks_sequential((error: Error) => {});
      
      // Should get one of the handler results (since p_composite acts like OR)
      const result = cell_strongest_base_value(output);
      expect(result).toBeDefined();
      expect(result === "handler1_result" || result === "handler2_result").toBe(true);
    });

    test("should handle dynamic strategy changes", async () => {
      const { interface_propagator, add_handler, set_selection_strategy } = create_enhanced_generic_propagator(
        "test_dynamic_strategy",
        "most_recent"
      );
      
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output = construct_cell("output");
      const inputs = [input1, input2];
      const outputs = [output];
      const propagator = interface_propagator(inputs, outputs);
      
      const handler1 = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(inputs, outputs, () => {
          const prop1 = function_to_primitive_propagator(
            "handler1",
            (value: any) => "handler1_result"
          );
          prop1(inputs[0], outputs[0]);
        }, "handler1");
      };
      
      const handler2 = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(inputs, outputs, () => {
          const prop2 = function_to_primitive_propagator(
            "handler2",
            (value: any) => "handler2_result"
          );
          prop2(inputs[0], outputs[0]);
        }, "handler2");
      };
      
      const critic1 = (...cells: Cell<any>[]) => ce_is_string(cells[0]) as Cell<boolean>;
      const critic2 = (...cells: Cell<any>[]) => ce_is_string(cells[0]) as Cell<boolean>;
      
      add_handler(critic1, handler1, 1);
      add_handler(critic2, handler2, 1);
      
      // Test with most_recent strategy
      update(input1, "test");
      update(input2, "test2");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe("handler2_result");
      
      // Change to most_specific strategy
      set_selection_strategy("most_specific");
      update(input1, "test");
      update(input2, "test2");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe("handler2_result");
      
      // Change to priority strategy
      set_selection_strategy("priority");
      update(input1, "test");
      update(input2, "test2");
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(output)).toBe("handler2_result");
    });
  });

  describe("Redefined Construct Simple Generic Propagator", () => {
    test("should work with object propagator", async () => {
      // Create a calculator object propagator
      const calculator_propagator = create_object_propagator(
        "calculator",
        { operations: [], result: 0 },
        (state, cmd) => {
          if (cmd.type === "add") {
            const new_result = state.result + cmd.value;
            return { 
              new_state: { 
                operations: [...state.operations, `add ${cmd.value}`], 
                result: new_result 
              }, 
              result: new_result 
            };
          } else if (cmd.type === "multiply") {
            const new_result = state.result * cmd.value;
            return { 
              new_state: { 
                operations: [...state.operations, `multiply ${cmd.value}`], 
                result: new_result 
              }, 
              result: new_result 
            };
          } else if (cmd.type === "get_result") {
            return { new_state: state, result: state.result };
          }
          return { new_state: state, result: the_nothing };
        }
      );
      
      // Create the enhanced generic propagator
      const interface_propagator = construct_simple_generic_propagator_v2(
        "calculator_interface",
        calculator_propagator,
        "most_recent"
      );
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output = construct_cell("output");
      const inputs = [input1, input2];
      const outputs = [output];
      
      // Create the propagator
      const propagator = interface_propagator(inputs, outputs);
      
      // Test add operation
      update(input1, { type: "add", value: 5 });
      update(input2, { type: "add", value: 3 });
      await execute_all_tasks_sequential((error: Error) => {});
      
      // Test get result
      update(input1, { type: "get_result" });
      update(input2, { type: "get_result" });
      await execute_all_tasks_sequential((error: Error) => {});
      
      const result = cell_strongest_base_value(output);
      expect(result).toBeDefined();
    });
  });

  describe("Integration with Match Cells", () => {
    test("should integrate object propagators with match_cells for type-based routing", async () => {
      // Create interface propagator for type-based operations
      const dispatcher1 = construct_cell("dispatcher1");
      const dispatcher2 = construct_cell("dispatcher2");
      const result1 = construct_cell("result1");
      
      const type_interface = create_enhanced_generic_propagator(
        "type_operations_interface",
        "most_recent"
      );
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output1 = construct_cell("output1");
      
      const inputs = [input1, input2];
      const outputs = [output1];
      
      // Create the propagator
      const propagator = type_interface.interface_propagator(inputs, outputs);
      
      // Define handlers for different type combinations
      const string_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const string_prop = function_to_primitive_propagator(
              "string_handler",
              (a: any, b: any) => {
                if (typeof a === "string" && typeof b === "string") {
                  return a + " " + b;
                }
                return no_compute;
              }
            );
            string_prop(inputs[0], inputs[1], outputs[0]);
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
              (a: any, b: any) => {
                if (typeof a === "number" && typeof b === "number") {
                  return a + b;
                }
                return no_compute;
              }
            );
            number_prop(inputs[0], inputs[1], outputs[0]);
          },
          "number_handler"
        );
      };
      
      const mixed_handler = (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
          inputs,
          outputs,
          () => {
            const mixed_prop = function_to_primitive_propagator(
              "mixed_handler",
              (a: any, b: any) => {
                if (typeof a === "string" && typeof b === "number") {
                  return `${a}${b}`;
                }
                return no_compute;
              }
            );
            mixed_prop(inputs[0], inputs[1], outputs[0]);
          },
          "mixed_handler"
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
      
      // Add handlers with match_cells critics
      type_interface.add_handler(both_strings, string_handler, 1);
      type_interface.add_handler(both_numbers, number_handler, 1);
      type_interface.add_handler(string_then_number, mixed_handler, 1);
      
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
      
      const complex_interface = create_enhanced_generic_propagator(
        "complex_operations_interface",
        "most_recent"
      );
      
      // Create input and output cells
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const input3 = construct_cell("input3");
      const output1 = construct_cell("output1");
      
      const inputs = [input1, input2, input3];
      const outputs = [output1];
      
      // Create the propagator
      const propagator = complex_interface.interface_propagator(inputs, outputs);
      
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
      
      // Add handlers
      complex_interface.add_handler(all_strings_critic, all_strings_handler, 1);
      complex_interface.add_handler(all_numbers_critic, all_numbers_handler, 1);
      complex_interface.add_handler(mixed_critic, mixed_handler, 1);
      
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

  describe("Simultaneous Propagator", () => {
    test("p_simultaneous should select the freshest input value in an array", async () => {
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const input3 = construct_cell("input3");
      const output = construct_cell("output");
      
      p_simultaneous([input1, input2, input3], output);
      
      // Update inputs
      update(input1, "value1");
      update(input2, "value2");
      update(input3, "value3");
      await execute_all_tasks_sequential((error: Error) => {});
      
      const result = cell_strongest_base_value(output);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain("value3"); // Should be the last updated value
      expect(result.length).toBe(1);
    });
    
    test("p_simultaneous should filter out the_nothing values", async () => {
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output = construct_cell("output");
      
      p_simultaneous([input1, input2], output);
      
      // Update only one input
      update(input1, "value1");
      await execute_all_tasks_sequential((error: Error) => {});
      
      const result = cell_strongest_base_value(output);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain("value1");
      expect(result.length).toBe(1);
    });
    
    test("p_composite_with_callback should use custom composition function", async () => {
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output = construct_cell("output");
      
      // Use custom callback to concatenate strings
      p_composite_with_callback([input1, input2], output, (val1, val2) => {
        if (val1 !== the_nothing && val2 !== the_nothing) {
          return `${val1}-${val2}`;
        }
        return the_nothing;
      });
      
      update(input1, "hello");
      update(input2, "world");
      await execute_all_tasks_sequential((error: Error) => {});
      
      const result = cell_strongest_base_value(output);
      expect(result).toBe("hello-world");
    });
    
    test("p_composite_with_callback should return array by default", async () => {
      const input1 = construct_cell("input1");
      const input2 = construct_cell("input2");
      const output = construct_cell("output");
      
      // Use default behavior (no callback)
      p_composite_with_callback([input1, input2], output);
      
      update(input1, "value1");
      update(input2, "value2");
      await execute_all_tasks_sequential((error: Error) => {});
      
      const result = cell_strongest_base_value(output);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain("value1");
      expect(result).toContain("value2");
    });
  });
}); 