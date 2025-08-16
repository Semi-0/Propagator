import { compound_propagator, function_to_primitive_propagator, is_propagator, propagator_id, type Propagator } from "../Propagator/Propagator";
import { constant_cell, construct_cell, make_temp_cell, type Cell, cell_strongest_base_value } from "../Cell/Cell";
import { ce_equal, ce_subtract, ce_switch, p_and, p_switch, p_sync, p_or, p_composite, p_combine } from "../Propagator/BuiltInProps";
import { reduce } from "fp-ts/lib/Foldable";
import { last } from "fp-ts/lib/Array";
import { get_id } from "../AdvanceReactivity/traced_timestamp/TracedTimeStamp";
import { v4 as uuidv4 } from 'uuid';
import { make_ce_arithmetical } from "../Propagator/Sugar";
import { is_string } from "generic-handler/built_in_generics/generic_predicates";
import { no_compute } from "../Helper/noCompute";
import { update } from "../AdvanceReactivity/interface";
import { the_nothing } from "../Cell/CellValue";

// ============================================================================
// SELECTION STRATEGIES
// ============================================================================

export type SelectionStrategy = 
  | "simultaneous"    // Execute all matching handlers and pack results
  | "most_specific"   // Execute the most specific (most predicates) handler
  | "most_recent"     // Execute the most recently added handler

// ============================================================================
// SIMULTANEOUS PROPAGATOR
// ============================================================================


export const p_combine = function_to_primitive_propagator("combine", (...values: any[]) => {
  return values
})

export const p_simultaneous = (inputs: Cell<any>[], output: Cell<any>) => {
  return compound_propagator(
    inputs,
    [output],
    () => {
      // For now, let's use a simpler approach that works reliably
      // We'll use p_composite for the OR behavior and then transform the result
      const temp_output = make_temp_cell();
      p_composite(inputs, temp_output);
      
      // Create a transformer that converts single values to arrays
      const array_transformer = function_to_primitive_propagator(
        "array_transformer",
        (value: any) => {
          if (value !== the_nothing && value !== undefined) {
            return [value];
          }
          return the_nothing;
        }
      );
      
      array_transformer(temp_output, output);
    },
    "simultaneous"
  );
};

// Enhanced p_composite that can take a custom composition callback
export const p_composite_with_callback = (inputs: Cell<any>[], output: Cell<any>, callback?: (...values: any[]) => any) => {
  return compound_propagator(
    inputs,
    [output],
    () => {
      if (callback) {
        // Use custom callback for composition
        const custom_combiner = function_to_primitive_propagator(
          "custom_combiner",
          callback
        );
        custom_combiner(...inputs, output);
      } else {
        // Default behavior: return array of all non-nothing values
        const array_combiner = function_to_primitive_propagator(
          "array_combiner",
          (...values: any[]) => {
            const valid_values = values.filter(v => v !== the_nothing && v !== undefined);
            if (valid_values.length > 0) {
              return valid_values;
            }
            return the_nothing;
          }
        );
        array_combiner(...inputs, output);
      }
    },
    "composite_with_callback"
  );
};

// ============================================================================
// OBJECT PROPAGATOR SYSTEM
// ============================================================================

export type ObjectPropagator<T> = (cmd: any, out: Cell<any>) => Propagator;

export const create_object_propagator = <T>(
  name: string,
  initial_value: T,
  handler: (state: T, cmd: any) => { new_state: T, result: any }
): ObjectPropagator<T> => {

    let current_state = initial_value;
    
    return (cmd: any, out: Cell<any>) => {
      return compound_propagator(
        [cmd],
        [out],
        () => {
          const state_handler = function_to_primitive_propagator(
            `${name}_handler`,
            (command: any) => {
              const { new_state, result } = handler(current_state, command);
              current_state = new_state;
              return result;
            }
          );
          state_handler(cmd, out);
        },
        name
      );
    };
  };

// ============================================================================
// DISPATCH STORE OBJECT PROPAGATOR
// ============================================================================

export interface HandlerEntry {
  critic: (...args: Cell<any>[]) => Cell<boolean>;
  handler: (inputs: Cell<any>[], outputs: Cell<any>[]) => Propagator;
}

export interface DispatchStore {
  handlers: HandlerEntry[];
  selection_strategy: SelectionStrategy;
}

export const create_dispatch_store_propagator = (): ObjectPropagator<DispatchStore> => {
  return create_object_propagator<DispatchStore>(
    "dispatch_store",   
    { handlers: [], selection_strategy: "most_recent" },
    (state: DispatchStore, cmd: any) => {
      switch (cmd.type) {
        case "add_handler":
          const new_handler: HandlerEntry = {
            critic: cmd.critic,
            handler: cmd.handler,
          };
          return {
            new_state: {
              ...state,
              handlers: [...state.handlers, new_handler]
            },
            result: new_handler
          };
          
        case "set_selection_strategy":
          return {
            new_state: {
              ...state,
              selection_strategy: cmd.strategy
            },
            result: cmd.strategy
          };
          
        case "get_selection_strategy":
          return {
            new_state: state,
            result: state.selection_strategy
          };
          
          
          
        default:
          return { new_state: state, result: null };
      }
    }
  );
};

// ============================================================================
// EXISTING CODE (keeping for backward compatibility)
// ============================================================================

interface GenericPropagatorMetadata {
    dispatchers: Cell<any>[],
    dispatched_results: Cell<any>[],
}

const metadata_store = new Map<string, GenericPropagatorMetadata>()
const interface_store = new Map<(...args: any) => Propagator, GenericPropagatorMetadata>()

type Ce_Propagator = (...args: Cell<any>[]) => Cell<any>

// ============================================================================
// FIXED VERSION OF GENERIC PROPAGATOR SYSTEM
// ============================================================================

export const generic_propagator_prototype = (name: string, dispatchers: Cell<any>[], dispatched_results: Cell<any>[]) => {
    const interface_propagator = (inputs: Cell<any>[], outputs: Cell<any>[]) => compound_propagator(
        [...inputs],
        [...outputs],
        () => {
            const id = uuidv4()

            inputs.forEach((input, index) => {
                p_sync(input, dispatchers[index])
            })
            outputs.forEach((output, index) => {
                p_sync(dispatched_results[index], output)
            })
        },
        name
    )

    interface_store.set(interface_propagator, {
        dispatchers: dispatchers,
        dispatched_results: dispatched_results,
    })

    return interface_propagator
}

export const define_generic_propagator_handler = (propagator_or_interface: Propagator | ((...args: any) => Propagator), critics: (...args: Cell<any>[]) => Cell<boolean>, handler_network: (inputs: Cell<any>[], outputs: Cell<any>[]) => Propagator) => {
    
    let metadata: GenericPropagatorMetadata | undefined
    if (typeof propagator_or_interface === "function") {
        const interface_propagator = propagator_or_interface
        metadata = interface_store.get(interface_propagator)
    }
    else if (is_propagator(propagator_or_interface)) {
        metadata = metadata_store.get(propagator_id(propagator_or_interface))
    }
    else {
        throw new Error("Invalid propagator or interface")
    }

    if (!metadata) {
        throw new Error("No metadata found for propagator")
    }
   
    const is_matched = critics(...metadata.dispatchers)
    const succeeded = metadata.dispatchers.map((dispatcher) => {
        const succeeded_cell = make_temp_cell()
        p_switch(is_matched, dispatcher, succeeded_cell)
        return succeeded_cell
    })

    handler_network(succeeded, metadata.dispatched_results)
}

// ============================================================================
// FIXED MATCH CELLS IMPLEMENTATION
// ============================================================================

export const match_cells_prototype = (...args: Cell<boolean>[]) => {
    if (args.length === 0) {
        throw new Error("At least one predicate is required")
    }

    const output = args[args.length - 1] as Cell<boolean>
    const predicates = args.slice(0, -1) as Cell<boolean>[]

    return (...inputs: Cell<any>[]) => {
        const propagator = compound_propagator(
            [...inputs],
            [output],
            () => {
                if (predicates.length !== inputs.length) {
                    throw new Error("Predicates and inputs must have the same length")
                }

                // FIXED: Properly implement the matching logic
                if (predicates.length === 1) {
                    // Single predicate case
                    p_sync(predicates[0], output)
                } else if (predicates.length === 2) {
                    // Two predicates case
                    p_and(predicates[0], predicates[1], output)
                } else {
                    // Multiple predicates case - chain them together
                    let current_result = predicates[0]
                    
                    for (let i = 1; i < predicates.length; i++) {
                        const next_result = make_temp_cell() as Cell<boolean>
                        p_and(current_result, predicates[i], next_result)
                        current_result = next_result
                    }
                    
                    p_sync(current_result, output)
                }
            },
            "match_cells"
        )     
        return propagator
    }
}

export const match_cells = (...args: Cell<boolean>[]) => {
    if (args.length === 0) {
        throw new Error("At least one predicate is required")
    }
    
    const output = make_temp_cell() as Cell<boolean>
    
    // For match_cells, we don't need inputs since we're just combining predicates
    // Create a simple compound propagator that combines all predicates
    if (args.length === 1) {
        // Single predicate case
        p_sync(args[0], output)
    } else if (args.length === 2) {
        // Two predicates case
        p_and(args[0], args[1], output)
    } else {
        // Multiple predicates case - chain them together
        let current_result = args[0]
        
        for (let i = 1; i < args.length; i++) {
            const next_result = make_temp_cell() as Cell<boolean>
            p_and(current_result, args[i], next_result)
            current_result = next_result
        }
        
        p_sync(current_result, output)
    }
    
    return output
}

// ============================================================================
// ENHANCED TYPE PREDICATES
// ============================================================================

export const p_is_string = function_to_primitive_propagator("is_string", is_string)
export const ce_is_string = make_ce_arithmetical(p_is_string)

export const p_is_number = function_to_primitive_propagator("is_number", (value: any) => typeof value === "number")
export const ce_is_number = make_ce_arithmetical(p_is_number)

export const p_is_boolean = function_to_primitive_propagator("is_boolean", (value: any) => typeof value === "boolean")
export const ce_is_boolean = make_ce_arithmetical(p_is_boolean)

export const p_not = function_to_primitive_propagator("not", (value: boolean) => !value)
export const ce_not = make_ce_arithmetical(p_not)

// ============================================================================
// ENHANCED GENERIC PROPAGATOR CONSTRUCTOR
// ============================================================================

export const construct_simple_generic_propagator = (name: string, inputs_arity: number, outputs_arity: number, default_handler: (inputs: Cell<any>[], outputs: Cell<any>[]) => Propagator) => {
    const inputs = Array.from({length: inputs_arity}, () => make_temp_cell())
    const outputs = Array.from({length: outputs_arity}, () => make_temp_cell())

    const constructor = generic_propagator_prototype(name, inputs, outputs)
    default_handler(inputs, outputs)

    return constructor
}

// ============================================================================
// TYPE-SAFE GENERIC PROPAGATOR
// ============================================================================

export const create_typed_generic_propagator = <T>(
    name: string,
    type_checker: (value: any) => boolean,
    handler: (inputs: Cell<T>[], outputs: Cell<any>[]) => Propagator
) => {
    return (inputs: Cell<any>[], outputs: Cell<any>[]) => {
        return compound_propagator(
            inputs,
            outputs,
            () => {
                // Create type check cells for each input
                const type_check_results: Cell<boolean>[] = inputs.map(input => {
                    const check_result = make_temp_cell() as Cell<boolean>
                    const type_checker_prop = function_to_primitive_propagator(
                        "type_checker",
                        type_checker
                    )
                    type_checker_prop(input, check_result)
                    return check_result
                })
                
                // Combine all type check results
                let all_valid = type_check_results[0] as Cell<boolean>
                for (let i = 1; i < type_check_results.length; i++) {
                    const combined = make_temp_cell() as Cell<boolean>
                    p_and(all_valid, type_check_results[i] as Cell<boolean>, combined)
                    all_valid = combined
                }
                
                // Execute handler only when all types are valid
                // For now, just execute the handler directly
                // In a more sophisticated implementation, you'd use conditional execution
                handler(inputs as Cell<T>[], outputs)
            },
            name
        )
    }
}

// // ============================================================================
// // CONDITIONAL ROUTING PROPAGATOR
// // ============================================================================

// export const create_conditional_router = (
//     name: string,
//     conditions: Array<{
//         predicate: (inputs: Cell<any>[]) => Cell<boolean>,
//         handler: (inputs: Cell<any>[], outputs: Cell<any>[]) => Propagator
//     }>
// ) => {
//     return (inputs: Cell<any>[], outputs: Cell<any>[]) => {
//         return compound_propagator(
//             inputs,
//             outputs,
//             () => {
//                 // Create condition cells
//                 const condition_cells = conditions.map(cond => cond.predicate(inputs))
                
//                 // Create handlers for each condition
//                 conditions.forEach((condition, index) => {
//                     const conditional_outputs = outputs.map(() => make_temp_cell())
//                     condition.handler(inputs, conditional_outputs)
                    
//                     // Route outputs based on condition
//                     conditional_outputs.forEach((cond_output, output_index) => {
//                         p_switch(condition_cells[index], cond_output, outputs[output_index])
//                     })
//                 })
//             },
//             name
//         )
//     }
// }

// // ============================================================================
// // UTILITY FUNCTIONS
// // ============================================================================

// export const create_type_router = () => {
//     return create_conditional_router("type_router", [
//         {
//             predicate: (inputs) => ce_is_string(inputs[0]),
//             handler: (inputs, outputs) => {
//                 // Handle string inputs
//                 return p_sync(inputs[0], outputs[0])
//             }
//         },
//         {
//             predicate: (inputs) => ce_is_number(inputs[0]),
//             handler: (inputs, outputs) => {
//                 // Handle number inputs - add them if there are two
//                 if (inputs.length >= 2) {
//                     return compound_propagator(
//                         [inputs[0], inputs[1]],
//                         [outputs[0]],
//                         () => {
//                             // Use a safe addition that checks types
//                             const safe_add = function_to_primitive_propagator(
//                                 "safe_add",
//                                 (a: any, b: any) => {
//                                     if (typeof a === "number" && typeof b === "number") {
//                                         return a + b
//                                     }
//                                     return no_compute
//                                 }
//                             )
//                             safe_add(inputs[0], inputs[1], outputs[0])
//                         },
//                         "safe_add"
//                     )
//                 }
//                 return p_sync(inputs[0], outputs[0])
//             }
//         }
//     ])
// } 