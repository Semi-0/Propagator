import { cell_id, cell_name, cell_strongest, construct_cell, is_cell, same_cell, update_cell } from "@/cell/Cell";
import { is_nothing } from "@/cell/CellValue";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { all_match, match_args, register_predicate } from "generic-handler/Predicates";
import { compound_propagator,   function_to_primitive_propagator,   primitive_propagator,  propagator_id } from "../Propagator/Propagator"
import { generic_merge } from "@/cell/Merge";
import { bi_sync, c_if_b, p_constant } from "../Propagator/BuiltInProps";
import type { Cell } from "@/cell/Cell";
import { p_switch } from "../Propagator/BuiltInProps";
import type { Propagator } from "../Propagator/Propagator";
import { is_map } from "../Helper/Helper";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { make_ce_arithmetical } from "../Propagator/Sugar";
import { p_map_a } from "ppropogator";
import { no_compute } from "../Helper/noCompute";
import { ce_constant } from "ppropogator";
import { log_tracer } from "generic-handler/built_in_generics/generic_debugger";
import { ce_switch } from "ppropogator";
import { p_and } from "ppropogator";
import { ce_and } from "ppropogator";


export const merge_carried_map = (content: Map<any, any>, increment: Map<any, any>) => {
    for (const [key, value] of increment) {
        const elem = content.get(key)
        if(is_cell(elem) && is_cell(value)) {
            bi_sync(elem, value)
        }
        else{
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


// easy constructor create map carrier from struct 

export const p_construct_cell_carrier: (identificator: (cell: Cell<any>) => string) => (...cells: Cell<any>[]) => Propagator = compose(make_map_carrier, function_to_cell_carrier_constructor)


// can we generialize to easily create nested map carrier?
/**
 * Creates a propagator that constructs a cell carrier from a struct.
 * The struct maps string keys to cells, and this creates a carrier that
 * maintains those key-cell relationships.
 */
export const p_construct_struct_carrier = (struct: Record<string, Cell<any>>) => (output: Cell<Map<string, Cell<any>>>) => {
    // Get all key-cell pairs from the struct
    const structEntries = Object.entries(struct)

    // Extract just the cells (values) from the entries
    const cells = structEntries.map(([key, cell]) => cell)

    // Create an identificator function that finds the key for each cell
    const findKeyForCell = (cell: Cell<any>): string => {
        const entry = structEntries.find(([key, structCell]) =>
            same_cell(cell, structCell)
        )
        return entry?.[0] || '' // Return the key, or empty string if not found
    }

    // Create and return the cell carrier propagator
    return p_construct_cell_carrier(findKeyForCell)(...cells, output)
}

export const p_struct = p_construct_struct_carrier

export const ce_construct_cell_carrier = (identificator: (cell: Cell<any>) => string) => make_ce_arithmetical(p_construct_cell_carrier(identificator), "cell_carrier")

export const ce_struct = (struct: Record<string, Cell<any>>) => {
    const output = construct_cell("struct") as Cell<Map<string, Cell<any>>>
    p_construct_struct_carrier(struct)(output)
    return output
}

//should p cons delay build until head tail have value?
export const p_cons = (head: Cell<any>, tail: Cell<any>, output: Cell<Map<string, any>>) => compound_propagator(
    [],
    [output],
    () => {
        p_struct(
            {
                "head": head,
                "tail": tail
            }
        )(output)
    },
    "p_cons"
)


export const p_car = (pair: Cell<Map<string, any>>, accessor: Cell<any>) => compound_propagator(
    [pair],
    [accessor],
    () => {
       c_dict_accessor("head")(pair, accessor) 
    },
    "p_car"
)

export const p_cdr = (pair: Cell<Map<string, any>>, accessor: Cell<any>) => compound_propagator(
    [pair],
    [accessor],
    () => {
        c_dict_accessor("tail")(pair, accessor)
    },
    "p_cdr"
)


export const ce_cons = make_ce_arithmetical(p_cons, "cons") as  (head: Cell<any>, tail:Cell<any>) => Cell<Map<string, any>> 
export const ce_car = make_ce_arithmetical(p_car, "car") as (list: Cell<Map<string, any>>) => Cell<any>
export const ce_cdr = make_ce_arithmetical(p_cdr, "cdr") as (list: Cell<Map<string, any>>) => Cell<Map<string, any>>


export const p_list = (list: Cell<any>[], output: Cell<Map<string, any>>) => compound_propagator(
    [],
    [output],
    () => {
       if (list.length === 1) {
          p_cons(list[0], construct_cell("end"), output)
        }
        else{
            const next = construct_cell("next") as Cell<Map<string, any>>
            
            p_list(list.slice(1), next)
            p_cons(list[0], next, output)
        }
    },
    "p_list"
)

export const is_atom = (x: any) => {return !is_map(x)}

export const p_is_atom = function_to_primitive_propagator("p_is_atom", log_tracer("is_atom", is_atom) ) as (...cells: Cell<any>[]) => Propagator

export const ce_is_atom = make_ce_arithmetical(p_is_atom) as (...cell: Cell<any>[]) =>  Cell<boolean>

export const p_list_map = (mapper: (cell: Cell<any>) => Cell<any>, list: Cell<Map<string, any>>, output: Cell<Map<string, any>>) => compound_propagator(
    [list],
    [output],
    () => {
        const next = construct_cell("next") as Cell<Map<string, any>>

        p_list_map(mapper, ce_cdr(list), next)
        p_cons(mapper(ce_car(list)), next, output)
         
    },
    "p_list_map"
)

export const p_list_filter = (predicate: (cell: Cell<any>) => Cell<boolean>, list: Cell<Map<string, any>>, output: Cell<Map<string, any>>) => compound_propagator(
    [list],
    [output],
    () => {
        const internal = (cell: Cell<any>) => ce_switch(predicate(cell), cell)
        p_list_map(internal, list, output) 
        
    },
    "p_list_filter"
)


export const p_list_zip = (list_A: Cell<Map<string, any>>, list_B: Cell<Map<string, any>>, output: Cell<Map<string, any>>) => compound_propagator(
    [list_A, list_B],
    [output],
    () => {
        const current = ce_cons(
            ce_car(list_A),
            ce_car(list_B)
        )

        const next = construct_cell("next") as Cell<Map<string, any>>

        p_list_zip(
            ce_cdr(list_A) as Cell<Map<string, any>>, 
            ce_cdr(list_B) as Cell<Map<string, any>>, 
            next
        )

        p_cons(current, next, output)

        // if last 
        // we dont need to consider that because if last is none it already be handled by compound propagator
    },
    "p_list_zip"
)


export const p_construct_dict_carrier_with_name: (...cells: Cell<any>[]) => Propagator = p_construct_cell_carrier(cell_name)

export const ce_construct_dict_carrier_with_name = ce_construct_cell_carrier(cell_name)

export const make_dict_with_key = (entities: [[string, Cell<any>]]) => {
    const cell_map = new Map()
    entities.forEach((entity) => {
        cell_map.set(entity[0], entity[1])
    })
    return cell_map
}


// can we generialize this to access nested map?
// static accessor i havn't figure out how to make dynamic one
// if this becomes a lexcical environment 
// and accessor was sent to multiple environment to look up simutaneously
// we would have no way to know that where the value comes from
// maybe its better that the accessor should have a contextual information of the environment?
// we can use ce_constant
// i want to know whether this works with constant
export const c_dict_accessor = (key: string) => (container: Cell<Map<string, any>>, accessor: Cell<any>) => 
    compound_propagator([container], [accessor], () => {
        p_constant(make_dict_with_key([[key, accessor]]))(construct_cell("Nothing"), container)
    }, "c_map_accessor")


    // because map_accessor is static so we don't need to build it in compound propagator level
// a gotcha for this would be if we make the constructor via compound propagagator
// and it treats inner cell as input
// then the whole network would not be built untill all inner cells have value
export const recursive_accessor = (keys: string[]) => (container: Cell<Map<string, any>>, accessor: Cell<any>) => 
    compound_propagator([container], [accessor], () => {
        if (keys.length === 0) {

        }
        else if (keys.length === 1) {
            c_dict_accessor(keys[0])(container, accessor)
        }
        else {
            const middle = construct_cell("middle") as Cell<Map<string, any>>
            c_dict_accessor(keys[0])(container, middle)
            recursive_accessor(keys.slice(1))(middle, accessor)
        }
    }, "recursive_accessor")
    


export const ce_dict_accessor: (key: string) => (container: Cell<Map<string, any>>) => Cell<any> = (key: string) => (container: Cell<Map<string, any>>) =>{
    const accessor = construct_cell("map_accessor_" + key)

    c_dict_accessor(key)(container, accessor) 
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
