import { cell_id, cell_name, cell_strongest, construct_cell, is_cell, update_cell } from "@/cell/Cell";
import { is_nothing } from "@/cell/CellValue";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { all_match, match_args, register_predicate } from "generic-handler/Predicates";
import { compound_propagator,   primitive_propagator,  propagator_id } from "../Propagator/Propagator"
import { generic_merge } from "@/cell/Merge";
import { bi_sync, p_constant } from "../Propagator/BuiltInProps";
import type { Cell } from "@/cell/Cell";
import { p_switch } from "../Propagator/BuiltInProps";
import type { Propagator } from "../Propagator/Propagator";
import { is_map } from "../Helper/Helper";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { make_ce_arithmetical } from "../Propagator/Sugar";


export const merge_carried_map = (content: Map<any, any>, increment: Map<any, any>) => {
    console.log("merge_carried_map")
    for (const [key, value] of increment) {
        if (content.has(key)) {
            const elem = content.get(key)
            if(is_cell(elem) && is_cell(value)) {
                bi_sync(elem, value)
                // const elemStrongest = cell_strongest(elem)
                // const valueStrongest = cell_strongest(value)

                // if (!is_nothing(elemStrongest) && is_nothing(valueStrongest)) {
                //     update_cell(value, elemStrongest)
                // }
                // else if (is_nothing(elemStrongest) && !is_nothing(valueStrongest)) {
                //     update_cell(elem, valueStrongest)
                // }
            }
            // else if(is_cell(value) && !is_cell(elem)) {
            //     update_cell(elem, value)
            // }
            // else if(!is_cell(elem) && is_cell(value)) {
            //     update_cell(value, elem)
            //     content.set(key, value)
            // }
            // else{
            //     content.set(key, value)
            // }
        }
        else{
            console.log("setted")
            content.set(key, value)
        }
    }
    return content
}

define_generic_procedure_handler(generic_merge, all_match(is_map), merge_carried_map)

// of course its better with bi_switcher but i havn't an idea how
export const bi_switcher = (condition: Cell<boolean>, a: Cell<any>, b: Cell<any>) => compound_propagator(
    [condition, a, b],
    [a, b],
    () => {
       p_switch(condition, a, b)
       p_switch(condition, b, a)
    },
    "bi_switcher"
)


export const function_to_cell_carrier_constructor = (f: (...args: Cell<any>[]) => any) => (...cells: Cell<any>[]) => {
    const inputs = cells.slice(0, -1)
    const output = cells[cells.length - 1]

    // does p constant needs to seed?
    // how could accessor recognized the input instantly?
    return p_constant(f(...inputs))(construct_cell("Nothing"), output)
}


export const make_map_carrier = (identificator: (cell: Cell<any>) => string) => (...cells: Cell<any>[]) => {
    // if this is cell id it would be difficult to access
    // maybe keys should be delayed 
    const cell_map = new Map()
    cells.forEach((c: Cell<any>) => {
       cell_map.set(
        identificator(c),
        c
       )
    })
    return cell_map
}

export const p_construct_cell_carrier: (identificator: (cell: Cell<any>) => string) => (...cells: Cell<any>[]) => Propagator = compose(make_map_carrier, function_to_cell_carrier_constructor)

export const ce_construct_cell_carrier = (identificator: (cell: Cell<any>) => string) => make_ce_arithmetical(p_construct_cell_carrier(identificator), "cell_carrier")

export const p_construct_map_carrier_with_name: (...cells: Cell<any>[]) => Propagator = p_construct_cell_carrier(cell_name)

export const ce_construct_map_carrier_with_name = ce_construct_cell_carrier(cell_name)

export const make_map_with_key = (entities: [[string, Cell<any>]]) => {
    const cell_map = new Map()
    entities.forEach((entity) => {
        cell_map.set(entity[0], entity[1])
    })
    return cell_map
}


// static accessor i havn't figure out how to make dynamic one
// if this becomes a lexcical environment 
// and accessor was sent to multiple environment to look up simutaneously
// we would have no way to know that where the value comes from
// maybe its better that the accessor should have a contextual information of the environment?
// we can use ce_constant
// i want to know whether this works with constant
export const c_map_accessor = (key: string) => (container: Cell<Map<string, any>>, accessor: Cell<any>) => 
    compound_propagator([container], [accessor], () => {
        p_constant(make_map_with_key([[key, accessor]]))(construct_cell("Nothing"), container)
    }, "c_map_accessor")


export const ce_map_accessor = (key: string) => (container: Cell<Map<string, any>>) =>{
    const accessor = construct_cell("map_accessor_" + key)

    c_map_accessor(key)(container, accessor) 
    return accessor 

}


// maybe it should be a lookup cell that supports dynamic key?


// how to hot reload propagators?
// maybe we can have a propagator that can be built and unbuilt dynamically

// we can also have early access hack

// if propagator can knows the name of the cell then we can directly apply propagator to cells in the map
// or maybe we stored that through an environment?
// its better if this goes lexical but lets stay simple for now
export type PropagatorClosure = {
    environment: Map<string, any>
    propagator: Propagator
}

export const make_propagator_closure = (cells_info: string[], propagator_constructor: (...args: any[]) => Propagator) => {
    const environment = new Map()
    cells_info.forEach((cell_info) => {
        environment.set(cell_info, construct_cell(cell_info))
    })
    return { environment, propagator: propagator_constructor(...cells_info.values()) }
}

// to be complete this might needs virtual propagator

// export const is_propagator_closure = register_predicate("is_propagator_closure", (c: any) => c !== null && c !== undefined 
//                                                                     && c.environment !== undefined && c.propagator !== undefined)
// map itself could be generalize to virtual propagator

// define_generic_procedure_handler(generic_merge, all_match(is_propagator_closure),
// (content: PropagatorClosure, increment: PropagatorClosure) => {
//     if (is_equal(propagator_id(content.propagator), propagator_id(increment.propagator))) {
//         return {
//             environment: merge_carried_map(content.environment, increment.environment),
//             propagator: content.propagator
//         }
//     }
//     else{
//         return the_contradiction
//     }
// })

// export const apply_propagator = function_to_primitive_propagator("apply_propagator", (f: PropagatorClosure, environment: Map<string, any>) => {
//     return {
//         environment: merge_carried_map(f.environment, environment),
//         propagator: f.propagator
//     }
// })

export const diff_map = (a: Map<string, any>, b: Map<string, any>) => {
    const diff = new Map()
    for (const [key, value] of b) {
        if (!a.has(key)) {
            diff.set(key, value)
        }
    }
    return diff
}

// is everything has the same collection?
// maybe lets do with the specific then the generic?




// i know this is not generic but lets stay simple for now
// maybe its better with virtual propagator
// also this might not be the most efficient way 
// assume primitive propagator
export const carrier_map = (closure: Cell<(...args: any[]) => Propagator>, input: Cell<Map<string, any>>, output: Cell<Map<string, any>>) => {
    const built = new Map() 

    primitive_propagator((closure: (...args: any[]) => Propagator, input: Map<string, any>) => {
        const diffed = diff_map(built, input)

        const new_map = new Map()
        for (const [key, value] of diffed) {
            const input_cell = value
            const output = construct_cell(key)
            closure(input_cell, output)
            new_map.set(key, output)
        }
        return new_map
    }, "carrier_map")(closure, input, output)
   
}
