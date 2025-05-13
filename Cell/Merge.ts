import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import {  is_nothing, is_contradiction, the_contradiction } from "./CellValue";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import type { Applicability } from "generic-handler/Applicatability";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";

var trace_merge = false; 

export function set_trace_merge(trace: boolean){
    trace_merge = trace;
}

export const generic_merge = construct_simple_generic_procedure("merge", 2,
    (content: any, increment: any) => {
        if (trace_merge) {
            console.log("merging", content, increment)
        }
        if (is_nothing(content)) {
            return increment
        }
        else if (is_nothing(increment)) {
            return content
        }
        else if (is_contradiction(content)) {
            return content
        }
        else if (is_contradiction(increment)) {
            return increment
        }
        else if (is_equal(content, increment)) {
            return content
        }
        else {
            return the_contradiction
        }
    }
)
 
export const merge_layered = make_layered_procedure("merge_layered", 2, generic_merge)

export var cell_merge = generic_merge;

export function set_merge(merge_func: (a: any, b: any) => any){
   cell_merge = merge_func;
}

export const define_handler = define_generic_procedure_handler;