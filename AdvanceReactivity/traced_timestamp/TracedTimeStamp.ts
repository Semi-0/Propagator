import { register_predicate } from "generic-handler/Predicates";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { all_match, match_args } from "generic-handler/Predicates";
import { same_source } from "./SameSource";
import type { traced_timestamp } from "./type";
import { is_traced_timestamp } from "./Predicates";

export function construct_traced_timestamp(timestamp: number, id: string):  traced_timestamp {
    return {  timestamp, fresh: true, id: id }
}

define_generic_procedure_handler(to_string, match_args(is_traced_timestamp), (a: traced_timestamp) => {
    return "traced_timestamp: " + a.id + " " + a.timestamp + " " + a.fresh
})

export const _timestamp_layer_equal = construct_simple_generic_procedure("timestamp_equal", 2, (a: traced_timestamp, b: traced_timestamp) => {
    if (is_traced_timestamp(a) && is_traced_timestamp(b)){
        return a.id === b.id && a.timestamp === b.timestamp && a.fresh === b.fresh;
    }
    else{
        return false;
    }
})

export const timestamp_equal = register_predicate("timestamp_equal", _timestamp_layer_equal)



define_generic_procedure_handler(same_source, all_match(is_traced_timestamp), 
(a: traced_timestamp, b: traced_timestamp) => {
    return a.id === b.id
})



    