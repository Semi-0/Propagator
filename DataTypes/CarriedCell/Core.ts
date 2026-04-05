import { cell_id, construct_cell, is_cell, update_cell } from "@/cell/Cell";
import { is_nothing } from "@/cell/CellValue";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { all_match, match_args, register_predicate } from "generic-handler/Predicates";
import { compound_propagator } from "../../Propagator/Propagator";
import { generic_merge, merge_layered } from "@/cell/Merge";
import { bi_sync, p_switch } from "../../Propagator/BuiltInProps";
import type { Cell } from "@/cell/Cell";
import { is_map } from "../../Helper/Helper";
import { is_layered_object, type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { get_base_value } from "@/cell/CellValue";
import { log_tracer } from "generic-handler/built_in_generics/generic_debugger";

// todo: this design is meant for carried cell to be retractable 
// but its not yet implemented
// there is a more elegant way to do this
// maybe imbedded a env inside primtive propagatot?

export const merge_carried_map = (content: Map<any, any>, increment: Map<any, any>) => {
    for (const [key, value] of increment) {
        const elem = content.get(key)
        if(is_cell(elem) && is_cell(value)) {
            if (cell_id(elem) === cell_id(value)) {
                // if its equal then there is no need to build
                continue
            }
            else{
                bi_sync(elem, value)
            }
        }
        else{
            if (is_cell(value)){
                content.set(key, value)
            }
            else {
                throw new Error("value is not a cell")
                // const listener = construct_cell(key)
                // content.set(key, listener)
                // update_cell(listener, value)
            }
        }
    }
    return content
}

export const is_compound_cell = register_predicate(
    "is_compound_cell",
    (data: any) => {
        const maybe_map = data as Map<string, any>
        return is_map(maybe_map) && Array.from(maybe_map.values()).every(is_cell)
    }
)

define_generic_procedure_handler(generic_merge, all_match(is_compound_cell), merge_carried_map)


export const is_layered_map = register_predicate("is_layered_map", (value: any) => is_layered_object(value) && is_compound_cell(get_base_value(value)) )

define_generic_procedure_handler(merge_layered, match_args(is_nothing, is_layered_map), (content: LayeredObject<any>, increment: Map<any, any>) => {
    return increment
})

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

export const diff_map = (a: Map<string, any>, b: Map<string, any>) => {
    const diff = new Map()
    for (const [key, value] of b) {
        if (!a.has(key)) {
            diff.set(key, value)
        }
    }
    return diff
}


