import { compound_propagator, function_to_primitive_propagator, is_propagator, propagator_id, type Propagator } from "../Propagator/Propagator";
import { constant_cell, construct_cell, make_temp_cell, type Cell } from "../Cell/Cell";
import { ce_equal, ce_subtract, ce_switch, p_and, p_switch, p_sync } from "../Propagator/BuiltInProps";
import { reduce } from "fp-ts/lib/Foldable";
import { last } from "fp-ts/lib/Array";
import { get_id } from "../AdvanceReactivity/traced_timestamp/TracedTimeStamp";
import { v4 as uuidv4 } from 'uuid';
import { make_ce_arithmetical } from "../Propagator/Sugar";
import { is_string } from "generic-handler/built_in_generics/generic_predicates";

interface GenericPropagatorMetadata {
    dispatchers: Cell<any>[],
    dispatched_results: Cell<any>[],
}

const metadata_store = new Map<string, GenericPropagatorMetadata>()
const interface_store = new Map<(...args: any) => Propagator, GenericPropagatorMetadata>()

type Ce_Propagator = (...args: Cell<any>[]) => Cell<any>
// helper function 


// // TODO: GENERIC LOOP
// export const loop_propagator = (source: Cell<any>, ce_conditon: Ce_Propagator, ce_body: Ce_Propagator, output: Cell<any>) => {

//     return compound_propagator(
//         [source],
//         [output],
//         () => {
//             const v_source = make_temp_cell()
//             const done = ce_conditon(v_source)
//             exp_if({
//                 condition: done, 
//                 then: exp_write(v_source, output),
//                 else: exp_feed(ce_body(v_source), v_source)
//             })
//         },
//         "loop_propagator"
//     )
// }

// export const p_make_array = function_to_primitive_propagator("make_array", (...args: any[]) => {
//     return args
// })

// export const combine_cells = (...args: Cell<any>[]) => {

//     if (args.length === 0) {
//         throw new Error("At least one cell is required")
//     }

//     const inputs = args.slice(0, -1)
//     const output = args[args.length - 1]

//     return compound_propagator(
//         [...inputs],
//         [output],
//         () => {
//            p_make_array(...[...inputs, output])
//         },
//         "combine_cells"
//     )
// }

// // to solve array for each, we need a generic loop propagator


// export const c_array_for_each = (array: Cell<any>, exp_body: (item: Cell<any>, index: Cell<number>) => void) => {
//     return compound_propagator(
//         [array],
//         [],
//         () => {
//             const current_index = make_temp_cell() as Cell<number>
//             const current_item = ce_array_index(array, current_index)

//             exp_loop(
//                 {
//                     condition: ce_equal(current_index, ce_sub_one(ce_array_length(array))),
//                     next: ce_increment(current_index),
//                     body: exp_body(current_item, current_index)
//                 }
//             )


//         },
//         "c_array_for_each"
//     )
// }

// export const spread_cells = (...args: Cell<any>[]) => {
//     if (args.length === 0) {
//         throw new Error("At least one cell is required")
//     }

//     const spread_from = args[0]
//     const spread_to = args.slice(1, -1)

//     return compound_propagator(
//         [spread_from],
//         [...spread_to],
//         () => {
//             c_array_for_each(spread_from, (item: Cell<any>, index: number) => {
//                 p_sync(item, spread_to[index])
//             })
//         },
//         "spread_cells"
//     )
// }

// export const p_object = (inital_setter...) => {
//     ...
//     return (cmd, out) => {
//         dispatch(cmd, out)
//     }
// }


export const generic_propagator_prototype = (name: string, dispatchers: Cell<any>[], dispatched_results: Cell<any>[]) => {
    // supposely the return propagator would have two condition
    // 1. as template (...args: Cell<any>[]) => Propagator
    // 2. as builted propagator (inputs: Cell<any>[], outputs: Cell<any>[]) => Propagator



    const interface_propagator = (inputs: Cell<any>[], outputs: Cell<any>[]) => compound_propagator(
        [...inputs],
        [...outputs],
        () => {
            const id = uuidv4()


            inputs.forEach((inputs, index) => {
                p_sync(inputs, dispatchers[index])
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


// what if handler is bisync?


export const define_generic_propagator_handler = (propagator_or_interface: Propagator | ((...args: any) => Propagator), critics: (...args: Cell<any>[]) => Cell<boolean>, handler_network: (inputs: Cell<any>[], outputs: Cell<any>[]) => Propagator) => {
    
    let metadata: GenericPropagatorMetadata | undefined
    if (typeof propagator_or_interface === "function") {
        const interface_propagator = propagator_or_interface
        metadata = interface_store.get(interface_propagator)

    }
    else if (is_propagator(propagator_or_interface)) {
        // if its propagator then it is not identity one
        metadata = metadata_store.get(propagator_id(propagator_or_interface))
    }
    else {
        throw new Error("Invalid propagator or interface")
    }

   
    const is_matched = critics(...metadata!.dispatchers)
    const succeeded = metadata!.dispatchers.map((dispatcher) => {
        const succeeded_cell = make_temp_cell()
        p_switch(is_matched, dispatcher, succeeded_cell)
        return succeeded_cell
    })

    handler_network(succeeded, metadata!.dispatched_results)
}

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

        const is_last_index = (index: number) => index === inputs.length - 1

        const mc = (index: number, last_result: Cell<any>) => {
            const current_predicate = predicates[index]
            if (is_last_index(index)) {
                p_and(last_result, current_predicate, output as Cell<any>)
            }
            else {
                const next_result = make_temp_cell()
                p_and(last_result, current_predicate, next_result)
                mc(index + 1, next_result)
            }
        }
        mc(0, make_temp_cell())
    },
        "match_cells"
    )     
    return propagator
   }
}

export const match_cells = (...args: Cell<boolean>[]) => {
    const output = make_temp_cell() as Cell<boolean>
    match_cells_prototype(...args, output)
    return output
}

export const p_is_string = function_to_primitive_propagator("is_string", is_string)

export const ce_is_string = make_ce_arithmetical(p_is_string) 


export const construct_simple_generic_propagator = (name: string, inputs_arity: number, outputs_arity: number, default_handler: (inputs: Cell<any>[], outputs: Cell<any>[]) => Propagator) => {
    const inputs = Array.from({length: inputs_arity}, () => make_temp_cell())
    const outputs = Array.from({length: outputs_arity}, () => make_temp_cell())

    const constructor = generic_propagator_prototype(name, inputs, outputs)
    // i think maybe we still need a dispatch store for multiple result
    default_handler(inputs, outputs)

    return constructor

}