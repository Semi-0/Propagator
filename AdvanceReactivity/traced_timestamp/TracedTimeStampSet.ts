import { all_match, match_args } from "generic-handler/Predicates";
import { construct_better_set, identify_by, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import {  type traced_timestamp } from "./type";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { same_source } from "./SameSource";

import { is_timestamp_set, is_traced_timestamp } from "./Predicates";
import { map, reduce, filter, every, some, length, has } from "generic-handler/built_in_generics/generic_collection";
import { get_id, get_timestamp, refresh_timestamp } from "./TracedTimeStamp";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { is_array } from "generic-handler/built_in_generics/generic_predicates";
import type { traced } from "fp-ts";

export type TracedTimeStampSet = BetterSet<traced_timestamp>

define_generic_procedure_handler(identify_by, match_args(is_traced_timestamp), compose(get_id, to_string))

export function construct_traced_timestamp_set(timestamps: traced_timestamp[] | traced_timestamp): TracedTimeStampSet {
    if (is_array(timestamps)){
        return construct_better_set(timestamps as traced_timestamp[])
    }
    else{
        return construct_better_set([timestamps as traced_timestamp])
    }
}

export function empty_traced_timestamp_set(): TracedTimeStampSet {
    return construct_traced_timestamp_set([])
}

export function to_traced_timestamp_set(timestamp: traced_timestamp): TracedTimeStampSet {
    return construct_traced_timestamp_set([timestamp])
}

export function refresh_all_timestamps(timestamp_set: TracedTimeStampSet): TracedTimeStampSet {
    return map(timestamp_set, refresh_timestamp)
}

define_generic_procedure_handler(to_string, match_args(is_timestamp_set), (a: TracedTimeStampSet) => {
    return "timestamp set: \n " + to_string(reduce(a, (a: string, b: traced_timestamp) => {
        return a + to_string(b) + "\n"
    }, ""))
})

export const has_same_source_timestamp = has

define_generic_procedure_handler(same_source, all_match(is_timestamp_set), 
(a: TracedTimeStampSet, b: TracedTimeStampSet) => {
    return every(a, (at: traced_timestamp) => has_same_source_timestamp(b, at)) && 
           every(b, (bt: traced_timestamp) => has_same_source_timestamp(a, bt))
})



define_generic_procedure_handler(is_equal, all_match(is_timestamp_set), (a: TracedTimeStampSet, b: TracedTimeStampSet) => {
    return every(a, (at: traced_timestamp) => some(b, (bt: traced_timestamp) => is_equal(at, bt))) && 
           every(b, (bt: traced_timestamp) => some(a, (at: traced_timestamp) => is_equal(at, bt)))
})


export function timestamp_set_intersect(a: TracedTimeStampSet, b: TracedTimeStampSet): TracedTimeStampSet {
    return filter(a, (at: traced_timestamp) => some(b, (bt: traced_timestamp) => is_equal(at, bt)))
}

export function timestamp_set_do_intersect(a: TracedTimeStampSet, b: TracedTimeStampSet): boolean {
    return  length(timestamp_set_intersect(a, b)) > 0
}