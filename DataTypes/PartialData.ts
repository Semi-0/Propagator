// Partial Data for continiously using the network

import { generic_merge } from "@/cell/Merge"
import { add, divide, multiply, subtract } from "generic-handler/built_in_generics/generic_arithmetic"
import { to_string } from "generic-handler/built_in_generics/generic_conversation"
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure"
import { all_match, match_args, register_predicate } from "generic-handler/Predicates"
import { get_base_value } from "sando-layer/Basic/Layer"
import { is_layered_object } from "sando-layer/Basic/LayeredObject"
import { base_equal } from "../Shared/PublicState"
import { is_any } from "generic-handler/built_in_generics/generic_predicates"


interface Partial<E>{
    identifier: string,
    data: any
}


export const is_partial_data = register_predicate("is_partial_data",
    (v: any) => {
        return v.identifier !== undefined && v.identifier === "partial data" 
    }
)

export const is_layered_partial_data = register_predicate("is_layered_partial_data",
    (v: any) => {
        return is_layered_object(v) && is_partial_data(get_base_value(v))
    }
)


export function make_partial_data<E>(data: E): Partial<E>{
    return {
        identifier: "partial data",
        data: data
    }
}

define_generic_procedure_handler(base_equal, match_args(is_partial_data, is_any),
    (a: Partial<any>, b: any) => {
        return base_equal(a.data, b)
    }
)

define_generic_procedure_handler(base_equal, match_args(is_any, is_partial_data),
    (a: any, b: Partial<any>) => {
        return base_equal(a, b.data)
    }
)

define_generic_procedure_handler(base_equal, all_match(is_partial_data),
    (a: Partial<any>, b: Partial<any>) => {
        return make_partial_data(base_equal(a.data, b.data))
    }
)

define_generic_procedure_handler(generic_merge,
    match_args(is_any, is_partial_data),
    (a: any, b: Partial<any>) => {
        return b
    })


define_generic_procedure_handler(generic_merge,
    all_match(is_partial_data),
    (a: Partial<any>, b: Partial<any>) => {
        return b
    }
)


function make_partial_data_arith(op: (a: number, b: number) => number){ 
    return (a: Partial<number>, b: Partial<number>): Partial<number> => {
        return make_partial_data(op(a.data, b.data))
    }
}

define_generic_procedure_handler(add,
    all_match(is_partial_data),
    make_partial_data_arith((a, b) => a + b)
)

define_generic_procedure_handler(subtract,
    all_match(is_partial_data),
    make_partial_data_arith((a, b) => a - b)
)

define_generic_procedure_handler(multiply,
    all_match(is_partial_data),
    make_partial_data_arith((a, b) => a * b)
)

define_generic_procedure_handler(divide,
    all_match(is_partial_data),
    make_partial_data_arith((a, b) => a / b)
)

define_generic_procedure_handler(to_string,
    all_match(is_partial_data),
    (a: Partial<any>) => {
        return `partial(${a.data})`
    }
)

define_generic_procedure_handler(to_string,
    match_args(is_layered_partial_data),
    (a: any) => {
        return `layered_partial(${to_string(get_base_value(a))})`
    }
)

