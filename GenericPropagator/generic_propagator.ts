import { compound_propagator, function_to_primitive_propagator, is_propagator, propagator_id, type Propagator } from "../Propagator/Propagator";
import {construct_cell, make_temp_cell, type Cell } from "../Cell/Cell";
import { ce_equal, ce_subtract, ce_switch, p_and, p_switch, p_sync } from "../Propagator/BuiltInProps";
import { reduce } from "fp-ts/lib/Foldable";
import { last } from "fp-ts/lib/Array";
import { get_id } from "../AdvanceReactivity/traced_timestamp/TracedTimeStamp";
import { v4 as uuidv4 } from 'uuid';
import { make_ce_arithmetical } from "../Propagator/Sugar";
import { is_boolean, is_number, is_string } from "generic-handler/built_in_generics/generic_predicates";
import { inspect_strongest } from "../Helper/Debug";
import { r_constant } from "../AdvanceReactivity/interface";

interface GenericPropagatorMetadata {
    dispatchers: Cell<any>[],
    dispatched_results: Cell<any>[],
    handlers?: Array<{
        critics: (...args: Cell<any>[]) => Cell<boolean>,
        handler_network: (inputs: Cell<any>[], outputs: Cell<any>[]) => Propagator,
        succeeded: Cell<any>[],
        propagator: Propagator
    }>
}

const metadata_store = new Map<string, GenericPropagatorMetadata>()

type Ce_Propagator = (...args: Cell<any>[]) => Cell<any>
// helper function 

// Helper function to create the interface propagator
export const create_interface_propagator = (name: string, id: string, dispatchers: Cell<any>[], dispatched_results: Cell<any>[]) => {
    return (inputs: Cell<any>[], outputs: Cell<any>[]) => compound_propagator(
        [...inputs],
        [...outputs],
        () => {
          

            inputs.forEach((inputs, index) => {
                p_sync(inputs, dispatchers[index])
            })
            outputs.forEach((output, index) => {
                p_sync(dispatched_results[index], output)
            })
        },
        name,
        id
    )
}

// Helper function to store metadata for interface propagator
export const store_interface_metadata = (id: string,  dispatchers: Cell<any>[], dispatched_results: Cell<any>[]): void => {
    metadata_store.set(id, {
        dispatchers: dispatchers,
        dispatched_results: dispatched_results,
    })
}



// Helper function to validate dispatchers and results
export const validate_dispatchers_and_results = (dispatchers: Cell<any>[], dispatched_results: Cell<any>[]): void => {
    if (!Array.isArray(dispatchers)) {
        throw new Error("Dispatchers must be an array")
    }
    if (!Array.isArray(dispatched_results)) {
        throw new Error("Dispatched results must be an array")
    }
    if (dispatchers.length !== dispatched_results.length) {
        throw new Error("Dispatchers and dispatched results must have the same length")
    }
}

export const generic_propagator_prototype = ( id: string, name: string, dispatchers: Cell<any>[], dispatched_results: Cell<any>[]) => {
    // Create the interface propagator
    const interface_propagator = create_interface_propagator(name, id, dispatchers, dispatched_results)
    
    // Store metadata
    store_interface_metadata(id, dispatchers, dispatched_results)

    return interface_propagator
}


// what if handler is bisync?

// for most of the primitive propagator and compound propagator we will define it this way 
export const define_generic_propagator_handler = (propagator: Propagator , critics: (...args: Cell<any>[]) => Cell<boolean>, propagator_constructor: (...args: Cell<any>[]) => Propagator) => {
   return define_generic_propagator_handler_network(propagator, critics, propagator_to_handler_network(propagator_constructor))
}

// Helper function to get metadata from propagator or interface
export const get_propagator_metadata = (propagator: Propagator): GenericPropagatorMetadata => {
    if (is_propagator(propagator)) {
        // if its propagator then it is not identity one
        const metadata = metadata_store.get(propagator_id(propagator))
        if (!metadata) {
            throw new Error("Propagator metadata not found in store")
        }
        return metadata
    }
    else {
        throw new Error("Invalid propagator or interface")
    }
}

// Helper function to evaluate critics and create succeeded cells
export const create_succeeded_cells = (dispatchers: Cell<any>[], critics: (...args: Cell<any>[]) => Cell<boolean>): Cell<any>[] => {
    const is_matched = critics(...dispatchers)
    return dispatchers.map((dispatcher) => {
        const succeeded_cell = make_temp_cell()
        p_switch(is_matched, dispatcher, succeeded_cell)
        return succeeded_cell
    })
}

// Helper function to validate critics function
export const validate_critics = (critics: (...args: Cell<any>[]) => Cell<boolean>): void => {
    if (typeof critics !== "function") {
        throw new Error("Critics must be a function")
    }
}

// Helper function to validate handler network
export const validate_handler_network = (handler_network: (inputs: Cell<any>[], outputs: Cell<any>[]) => Propagator): void => {
    if (typeof handler_network !== "function") {
        throw new Error("Handler network must be a function")
    }
}

// for precise handler which takes in multiple inputs and outputs
export const define_generic_propagator_handler_network = (propagator: Propagator , critics: (...args: Cell<any>[]) => Cell<boolean>, handler_network: (inputs: Cell<any>[], outputs: Cell<any>[]) => Propagator) => {
    
    // Validate inputs
    validate_critics(critics)
    validate_handler_network(handler_network)
    
    // Get metadata
    const metadata = get_propagator_metadata(propagator)
    
    // Create succeeded cells
    const succeeded = create_succeeded_cells(metadata.dispatchers, critics)

    // Execute handler network and store the result
    const handler_propagator = handler_network(succeeded, metadata.dispatched_results)
    
    // Store the handler connection in metadata
    if (!metadata.handlers) {
        metadata.handlers = []
    }
    metadata.handlers.push({
        critics,
        handler_network,
        succeeded,
        propagator: handler_propagator
    })
    
    return handler_propagator
}

export const propagator_to_handler_network = (propagator_constructor: (...args: Cell<any>[]) => Propagator) => {
    return (inputs: Cell<any>[], outputs: Cell<any>[]) => {
 
        return propagator_constructor(...[...inputs, ...outputs])
    }
}

// Helper function to validate predicates array
export const validate_predicates = (predicates: ((arg: Cell<any>) => Cell<boolean>)[]): void => {
    if (predicates.length === 0) {
        throw new Error("At least one predicate is required")
    }
    if (!predicates.every(pred => typeof pred === "function")) {
        throw new Error("All predicates must be functions")
    }
}

// Helper function to validate inputs match predicates length
export const validate_inputs_match_predicates = (predicates: ((arg: Cell<any>) => Cell<boolean>)[], inputs: Cell<any>[]): void => {
    if (predicates.length !== inputs.length) {
        throw new Error(`Predicates and inputs must have the same length, predicates: ${predicates.length}, inputs: ${inputs.length}`)
    }
}

// Helper function to check if index is the last one
export const is_last_index = (index: number, inputs_length: number): boolean => {
    return index === inputs_length - 1
}

// Helper function for recursive predicate matching
export const match_predicates_recursive = (
    predicates: ((arg: Cell<any>) => Cell<boolean>)[],
    inputs: Cell<any>[],
    output: Cell<boolean>,
    index: number,
    last_result: Cell<any>
): void => {
    const current_predicate = predicates[index]
    const current_input = inputs[index]
    
    if (is_last_index(index, inputs.length)) {
        p_and(last_result, current_predicate(current_input), output as Cell<any>)
    } else {
        const next_result = make_temp_cell()
        p_and(last_result, current_predicate(current_input), next_result)
        match_predicates_recursive(predicates, inputs, output, index + 1, next_result)
    }
}

// Helper function to create match cells propagator
export const create_match_cells_propagator = (
    predicates: ((arg: Cell<any>) => Cell<boolean>)[],
    inputs: Cell<any>[],
    output: Cell<boolean>
): Propagator => {
    return compound_propagator(
        [...inputs],
        [output],
        () => {
            validate_inputs_match_predicates(predicates, inputs)
            
            const TRUE = r_constant(true, "TRUE")
            match_predicates_recursive(predicates, inputs, output, 0, TRUE)
        },
        "match_cells"
    )
}

export const match_cells = (...args: ((arg: Cell<any>) => Cell<boolean>)[]) => {
    // Validate predicates
    validate_predicates(args)
    
    const predicates = args as ((arg: Cell<any>) => Cell<boolean>)[]
    const output = make_temp_cell() as Cell<boolean>

    return (...inputs: Cell<any>[]) => {
        const propagator = create_match_cells_propagator(predicates, inputs, output)
        return output
    }
}


// -- GENERIC PREDICTATE -- 



export const p_is_number = function_to_primitive_propagator("is_number", is_number)
export const ce_is_number = (cell: Cell<any>) => make_ce_arithmetical(p_is_number)(cell)  as Cell<boolean>

export const p_is_boolean = function_to_primitive_propagator("is_boolean", is_boolean)
export const ce_is_boolean = (cell: Cell<any>) => make_ce_arithmetical(p_is_boolean)(cell)  as Cell<boolean>

export const p_is_string = function_to_primitive_propagator("is_string", is_string)

export const ce_is_string = (cell: Cell<any>) => make_ce_arithmetical(p_is_string)(cell)  as Cell<boolean>

export const construct_simple_generic_propagator_network = (name: string, inputs_arity: number, outputs_arity: number) => {
    const inputs = Array.from({length: inputs_arity}, () => make_temp_cell())
    const outputs = Array.from({length: outputs_arity}, () => make_temp_cell())

    const constructor = generic_propagator_prototype(uuidv4(), name,  inputs, outputs)
    // i think maybe we still need a dispatch store for multiple result
 

    return constructor

}

export const construct_simple_generic_propagator = (name: string, inputs_arity: number, outputs_arity: number) => {
   return (...args: any[]) => {
        const inputs = args.slice(0, inputs_arity)
        const outputs = args.slice(inputs_arity, inputs_arity + outputs_arity)
        return construct_simple_generic_propagator_network(name, inputs_arity, outputs_arity)(inputs, outputs)
}
}