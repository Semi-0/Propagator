import { construct_cell } from "@/cell/Cell";
import { compound_propagator, function_to_primitive_propagator, type Propagator } from "../../Propagator/Propagator";
import { ce_add, ce_constant, p_constant, p_set_array } from "../../Propagator/BuiltInProps";
import type { Cell } from "@/cell/Cell";
import { is_map } from "../../Helper/Helper";
import { make_ce_arithmetical } from "../../Propagator/Sugar";
import { log_tracer } from "generic-handler/built_in_generics/generic_debugger";
import { ce_switch } from "../../Propagator/BuiltInProps";
import { p_struct } from "./Carrier";
import { c_dict_accessor } from "./Dict";

export type LinkedList = {
    head: Cell<any>,
    tail: Cell<LinkedList | any>
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

export const ce_linked_list_to_array = make_ce_arithmetical(p_linked_list_to_array, "linked_list_to_array") as (linked_list: Cell<Map<string, any>>) => Cell<Cell<any>[]>

