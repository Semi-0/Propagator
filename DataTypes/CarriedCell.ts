import { cell_id, cell_name, cell_strongest, construct_cell, is_cell, same_cell, update_cell } from "@/cell/Cell";
import { is_nothing } from "@/cell/CellValue";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { all_match, match_args, register_predicate } from "generic-handler/Predicates";
import { compound_propagator,   function_to_primitive_propagator,   primitive_propagator,  propagator_id } from "../Propagator/Propagator"
import { generic_merge } from "@/cell/Merge";
import { bi_sync, c_if_b, ce_add, ce_constant, p_constant, p_set_array } from "../Propagator/BuiltInProps";
import type { Cell } from "@/cell/Cell";
import { p_switch } from "../Propagator/BuiltInProps";
import type { Propagator } from "../Propagator/Propagator";
import { is_map } from "../Helper/Helper";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { make_ce_arithmetical } from "../Propagator/Sugar";
import { log_tracer } from "generic-handler/built_in_generics/generic_debugger";
import { ce_switch } from "ppropogator";
import { ce_equal } from "ppropogator";



// todo: this design is meant for carried cell to be retractable 
// but its not yet implemented
// there is a more elegant way to do this
// maybe imbedded a env inside primtive propagatot?






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

export const p_construct_dict_carrier = (dict: Map<string, Cell<any>>, output: Cell<Map<string, any>>)  =>   {
     return p_constant(new Map(dict))(construct_cell("Nothing"), output)
}


import { construct_advice, install_advice } from "generic-handler/built_in_generics/generic_advice"
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { cell_strongest_base_value } from "ppropogator";
import { p_sync } from "ppropogator";


// we need another constructor which can directly transform dict into struct
// i think maybe we dont need to do that?



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

export const ce_dict = (dict: Map<string, Cell<any>>) => {
    const output = construct_cell("dict") as Cell<Map<string, Cell<any>>>
    p_construct_dict_carrier(dict, output)
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



// warning this have a fundamental problem
//  if the key of dict are changed dynamically
// it would only extend the dict instead of replacing it
// is there a better way to do it?
// i think it could only be done if dict can accept patches 
// which changes existed key
// so instead of direct access
// it should pass messages about information of the changes
// actually this make sense 
// and seems could potentially be more generic 
// than existed one
// but the bigger problem is we need to also handles stop subscription
// a way to do it is instead of make bi-sync 
// we use bi-switcher to handle stop subscription
// however it have scalability issues because not needed relationship never got removed
// TODO: a better way to resolve this!!!
// a way for this is maybe better we generalize 
// vector clock for both supported value and reactive value
// and carried cell act as a special case for vector clock merge
export const p_dict_pair: (key: Cell<string>, value: Cell<any>) => Propagator = function_to_primitive_propagator("dict_element", (key: Cell<string>, value: Cell<any>) => {
    return new Map([[key, value]])
}) 


export type LinkedList = {
    head: Cell<any>,
    tail: Cell<LinkedList | any>
}


// maybe this should not be a compound propagator
// because it is more of a syntax sugar
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

export const ce_list = (list: Cell<any>[]) => {
    const output = construct_cell("list") as Cell<Map<string, any>>
    p_list(list, output)
    return output
}

export const is_atom = (x: any) => {return !is_map(x)}

export const p_is_atom = function_to_primitive_propagator("p_is_atom", log_tracer("is_atom", is_atom) ) as (...cells: Cell<any>[]) => Propagator

export const ce_is_atom = make_ce_arithmetical(p_is_atom) as (...cell: Cell<any>[]) =>  Cell<boolean>

// if we directly map that into struct what if cell change?

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

export const ce_list_map = make_ce_arithmetical(p_list_map, "list_map") 


export const p_list_filter = (predicate: (cell: Cell<any>) => Cell<boolean>, list: Cell<Map<string, any>>, output: Cell<Map<string, any>>) => compound_propagator(
    [list],
    [output],
    () => {
        const internal = (cell: Cell<any>) => ce_switch(predicate(cell), cell)
        p_list_map(internal, list, output) 
    },
    "p_list_filter"
)


export const p_pair_lookup = (key: Cell<string>, paired_list: Cell<Map<string, any>>, output: Cell<any>) => compound_propagator(
    [key, paired_list],
    [output],
    () => {
        const internal = (pair: Cell<Map<string, any>>) => ce_switch(
            ce_equal(
                ce_car(pair), key
            ), 
            ce_cdr(pair)
        )

        p_list_map(internal, paired_list, output) 
    },
    "p_lookup"
)

export const ce_pair_lookup = make_ce_arithmetical(p_pair_lookup, "pair_lookup") as (key: Cell<string>, paired_list: Cell<Map<string, any>>) => Cell<any>

export const p_assv = (key: Cell<string>, value: Cell<any>, paired_list: Cell<Map<string, any>>, output: Cell<any>) => compound_propagator(
    [key, value, paired_list],
    [output],
    () => {
       p_cons(ce_cons(key, value), paired_list, output)
    },
    "p_assv"
)


export const ce_assv = make_ce_arithmetical(p_assv, "assv") as (key: Cell<string>, value: Cell<any>, paired_list: Cell<Map<string, any>>) => Cell<Map<string, any>>

export const p_zip = (combine: (...cells: Cell<any>[]) => Propagator) => (list_A: Cell<Map<string, any>>, list_B: Cell<Map<string, any>>, output: Cell<Map<string, any>>) => compound_propagator(
    [list_A, list_B],
    [output],
    () => {
        const current = ce_cons(
            ce_car(list_A),
            ce_car(list_B)
        )

        const next = construct_cell("next") as Cell<Map<string, any>>

        combine(
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


export const p_list_zip = p_zip(p_cons)

export const p_dict_zip = p_zip(p_dict_pair)


export const ce_list_zip = make_ce_arithmetical(p_list_zip, "list_zip") as (list_A: Cell<Map<string, any>>, list_B: Cell<Map<string, any>>) => Cell<Map<string, any>>

export const ce_dict_zip = make_ce_arithmetical(p_dict_zip, "dict_zip") as (dict_A: Cell<Map<string, any>>, dict_B: Cell<Map<string, any>>) => Cell<Map<string, any>>

export const p_copy_list =
    (list: Cell<Map<string, any>>, output: Cell<Map<string, any>>) => compound_propagator(
        [list],
        [output],
        () => {
            p_cons(ce_car(list), output, output)
        },
        "p_copy_list"
    )

export const ce_copy_list = make_ce_arithmetical(p_copy_list, "copy_list") as (list: Cell<Map<string, any>>) => Cell<Map<string, any>>

// untested
export const p_combine_list = (
    list_A: Cell<Map<string, any>>,
    list_B: Cell<Map<string, any>>,
    output: Cell<Map<string, any>>
) => compound_propagator(
    [list_A, list_B],
    [output],
    () => {

        const copied = ce_copy_list(list_A)

        const internal = (A: Cell<Map<string, any>>, B: Cell<Map<string, any>>) => compound_propagator(
            [A, B],
            [output],
            () => {
                const is_end = ce_is_atom(ce_cdr(A))
              

                p_constant(B)(construct_cell("Nothing"), ce_switch(is_end, ce_cdr(A)))

                internal(ce_cdr(A), B)
            },
            "p_combine_list_internal"
        )
      

        internal(copied, list_B)
    },
    "p_combine_list"
)

export const ce_combine_list = make_ce_arithmetical(p_combine_list, "combine_list") as (list_A: Cell<Map<string, any>>, list_B: Cell<Map<string, any>>) => Cell<Map<string, any>>

// what to do if we want to give the cell value as key?

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

// helper which gathers array from linked list

// export const p_linked_list_to_array = (linked_list: Cell<Map<string, any>>, output: Cell<Cell<any>[]>) => compound_propagator(
//     [linked_list],
//     [output],
//     () => {
//         const internal = (index: Cell<number>, lst: Cell<Map<string, any>>) => compound_propagator(
//             [lst],
//             [output],
//             () => {
//                 p_set_array(output, index, ce_car(lst),)
//             },
//             "p_linked_list_to_array_internal"
//         )
//         internal(ce_constant(0), linked_list)
//     },
//     "p_linked_list_to_array"
// )


export const p_linked_list_to_array = (linked_list: Cell<Map<string, Cell<string>>>, array: Cell<any[]>) => 
    compound_propagator(
        [linked_list],
        [array],
        () => {
            const internal = (index: Cell<number>, lst: Cell<Map<string, Cell<string>>>) => compound_propagator(
                [lst],
                [array],
                () => {
                    const current = ce_car(lst)

                    // because if array becomes input then it becomes nothing
                    p_set_array(current)(index, array)

                    internal(ce_add(index, ce_constant(1) as Cell<number>), ce_cdr(lst))
                },
                "linked_list_to_array_internal"
            )

            internal(ce_constant(0) as Cell<number>, linked_list)
        },
        "linked_list_to_array"
    )


// export const p_linked_list_to_array = function_to_primitive_propagator(
//     "linked_list_to_array",
//     (linked_list: Cell<Map<string, any>>) => {
//         var arr: Cell<any>[] = []         

//         const internal = (linked_list: Map<string, Cell<any>> | any) => {
//             if ((is_cell(linked_list)) && (is_atom(cell_strongest_base_value(linked_list)))) {
//                 arr.push(linked_list)
//             }
//             else {
//                 if (is_cell(linked_list)) {
//                     const m = cell_strongest_base_value(linked_list)
//                     const curr = m.get("head")
//                     if (is_cell(curr)) {
//                         arr.push(curr)
//                     }
//                     else {
//                         console.log("linked_list_to_array: curr is not a cell", curr)
//                     }

//                     internal(m.get("tail"))
//                 }
//                 else if (is_map(linked_list)) {
//                     const curr = linked_list.get("head")
//                     if (is_cell(curr)) {
//                         arr.push(curr)
//                     }
//                     else {
//                         console.log("linked_list_to_array: curr is not a cell", curr)
//                     }
//                     internal(linked_list.get("tail"))
//                 }
//             }
//         }

//         internal(linked_list)

//         return arr
//     }
// )

export const ce_linked_list_to_array = make_ce_arithmetical(p_linked_list_to_array, "linked_list_to_array") as (linked_list: Cell<Map<string, any>>) => Cell<Cell<any>[]>


// a helper which gather arrays from linked list
// but it has a timing issue because we dont need to know when linked list is constructed
// export const gather_arrays_from_linked_list = (linked_list: Cell<Map<string, any>>) => 
 


// maybe it should be a lookup cell that supports dynamic key?


// how to hot reload propagators?
// maybe we can have a propagator that can be built and unbuilt dynamically

// we can also have early access hack

// if propagator can knows the name of the cell then we can directly apply propagator to cells in the map
// or maybe we stored that through an environment?
// its better if this goes lexical but lets stay simple for now
// export type PropagatorClosure = {
//     environment: Map<string, any>
//     propagator: Propagator
// }

// export const make_propagator_closure = (cells_info: string[], propagator_constructor: (...args: any[]) => Propagator) => {
//     const environment = new Map()
//     cells_info.forEach((cell_info) => {
//         environment.set(cell_info, construct_cell(cell_info))
//     })
//     return { environment, propagator: propagator_constructor(...cells_info.values()) }
// }

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
// export const carrier_map = (closure: Cell<(...args: any[]) => Propagator>, input: Cell<Map<string, any>>, output: Cell<Map<string, any>>) => {
//     const built = new Map() 

//     primitive_propagator((closure: (...args: any[]) => Propagator, input: Map<string, any>) => {
//         const diffed = diff_map(built, input)

//         const new_map = new Map()
//         for (const [key, value] of diffed) {
//             const input_cell = value
//             const output = construct_cell(key)
//             closure(input_cell, output)
//             new_map.set(key, output)
//         }
//         return new_map
//     }, "carrier_map")(closure, input, output)
   
// }

export const carrier_map = (closureCell: Cell<(...args: any[]) => Propagator>, input: Cell<Map<string, any>>, output: Cell<Map<string, any>>) => {
    const built = new Map<string, Cell<any>>()
  
    primitive_propagator((closureFn, inputMap) => {
      const diffed = diff_map(built, inputMap)
      for (const [key, inputCell] of diffed) {
        const outCell = construct_cell(key)
        closureFn(inputCell, outCell)
        built.set(key, outCell)
      }
      // 把 built 本身當成新的 carrier 輸出
      return built
    }, "carrier_map")(closureCell, input, output)
  }