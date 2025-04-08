import { all_match, match_args } from "generic-handler/Predicates";
import { construct_better_set,get,set_add_item,set_equal,set_every, set_filter, set_for_each, set_get_length, set_has, set_map, set_reduce, set_some, to_array, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import {  type traced_timestamp } from "./type";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { same_source } from "./SameSource";

import { is_timestamp_set } from "./Predicates";
import { _timestamp_layer_equal, refresh_timestamp, timestamp_equal } from "./TracedTimeStamp";
import { set_copy } from "../../Helper/BetterSet";

export type TracedTimeStampSet = BetterSet<traced_timestamp>

export function construct_traced_timestamp_set(timestamps: traced_timestamp[]): TracedTimeStampSet {
    return construct_better_set(timestamps, (a: traced_timestamp) => a.id.toString())
}

export function to_traced_timestamp_set(timestamp: traced_timestamp): TracedTimeStampSet {
    return construct_traced_timestamp_set([timestamp])
}

export function refresh_all_timestamps(timestamp_set: TracedTimeStampSet): TracedTimeStampSet {
    return set_map(timestamp_set, refresh_timestamp)
}

define_generic_procedure_handler(to_string, match_args(is_timestamp_set), (a: TracedTimeStampSet) => {
    return "timestamp set: \n " + to_string(set_reduce(a, (a: string, b: traced_timestamp) => {
        return a + to_string(b) + "\n"
    }, ""))
})

define_generic_procedure_handler(same_source, all_match(is_timestamp_set), 
(a: TracedTimeStampSet, b: TracedTimeStampSet) => {
    return set_every(a, (at: traced_timestamp) => set_has(b, at)) && 
           set_every(b, (bt: traced_timestamp) => set_has(a, bt))
})


define_generic_procedure_handler(_timestamp_layer_equal, all_match(is_timestamp_set), (a: TracedTimeStampSet, b: TracedTimeStampSet) => {
    var eq = true 
 
    for (const [key, value] of a.meta_data.entries()){ 

        // get would automatically convert the value to id
        const bt = get(b, value)
        if (bt === undefined){
            return false
        }
        if (!timestamp_equal(value, bt)){
            return false
        }
    }

    for (const [key, value] of b.meta_data.entries()){ 
        const at = get(a, value)
        if (at === undefined){
            return false
        }
        if (!timestamp_equal(at, value)){
            return false
        }
    }

    return eq
})


export function timestamp_set_intersect(a: TracedTimeStampSet, b: TracedTimeStampSet): TracedTimeStampSet {
    return set_filter(a, (at: traced_timestamp) => set_some(b, (bt: traced_timestamp) => timestamp_equal(at, bt)))
}

export function timestamp_set_do_intersect(a: TracedTimeStampSet, b: TracedTimeStampSet): boolean {
    return  set_get_length(timestamp_set_intersect(a, b)) > 0
}