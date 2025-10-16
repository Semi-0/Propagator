import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import {  is_nothing, is_contradiction, the_contradiction, is_disposed, the_disposed } from "./CellValue";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import type { Applicability } from "generic-handler/Applicatability";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { layer_pair_layer, layer_pair_value, layers_reduce, type LayerPair } from "sando-layer/Basic/helper";
import { generic_wrapper } from "generic-handler/built_in_generics/generic_wrapper";
var trace_merge = false; 

export function set_trace_merge(trace: boolean){
    trace_merge = trace;
}

export const generic_merge = construct_simple_generic_procedure("merge", 2,
    (content: any, increment: any) => {
        if (trace_merge) {
            console.log("merging", content, increment)
        }
        if (is_disposed(content) || is_disposed(increment)) {
            return the_disposed
        }
        else if (is_nothing(content)) {
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


// merge that parrelly merge the values based on their layers, only merge new value 
export interface ParallelMergeAdvice {
    type: "accept" | "reject" | "unknown"
    substitute_with: any | undefined 
    // if accept with value then it means value is accepted and should subsume with some sort of value
}

export const is_parallel_merge_result = (value: any): value is ParallelMergeAdvice => {
    return value && typeof value === "object" && "type" in value && "substitute_with" in value
}

export const p_accept = (value: any[] | undefined) => {
   return {
    type: "accept",
    substitute_with: value
   }
}

export const p_reject = () => {
   return {
    type: "reject",
    substitute_with: undefined
   }
}

export const p_unknown = () => {
   return {
    type: "unknown",
    substitute_with: undefined
   }
}

export const is_accept = (a: ParallelMergeAdvice) => a.type === "accept"
export const is_reject = (a: ParallelMergeAdvice) => a.type === "reject"

export const is_unknown = (a: ParallelMergeAdvice) => a.type === "unknown"

export const try_merge = make_layered_procedure("try_merge", 2, (content: any, increment: any) => {
    return ""
})


export const parallel_merge_constructor = (merge_func: (content: any, increment: LayeredObject<any>) => any) => (content: any, increment: LayeredObject<any>) => {
    return merge_func(content, try_merge(content, increment))
}

export const merge_advice = (a: ParallelMergeAdvice, b: ParallelMergeAdvice) => {
    if (is_accept(a) && is_accept(b)) {
        if (is_equal(a.substitute_with, b.substitute_with)) {
            return a
        }
        else if ((a.substitute_with) && (b.substitute_with)) {
            return p_accept([...a.substitute_with, ...b.substitute_with])
            
        }
        else if (a.substitute_with) {
            return p_accept([...a.substitute_with])
        }
        else if (b.substitute_with) {
            return p_accept([...b.substitute_with])
        }
        else {
            return p_unknown()
        }
    }
    else if (is_reject(a) || is_reject(b)) {
        return p_reject()
    }
    else {
        return p_unknown()
    }
}

export const merge_advice_from_layers_pair: (a: LayerPair, b: LayerPair) => ParallelMergeAdvice = generic_wrapper(merge_advice,
    (a: any) => a,
    layer_pair_value,
    layer_pair_value
)


export const strict_parallel_merge = (advice: LayeredObject<any>) => (content: Set<LayeredObject<any>>, increment: LayeredObject<any>) => {
   const advice_value = layers_reduce(advice, merge_advice_from_layers_pair, p_accept(undefined))

   if (is_accept(advice_value)) {
     if (advice_value.substitute_with) {
        advice_value.substitute_with.forEach((elt: LayeredObject<any>) => {
            content.delete(elt)
        })
        
        return merge_layered(content, increment)
     }
     else {
        return merge_layered(content, increment)
     }
   }
   else {
    return content
   }
}