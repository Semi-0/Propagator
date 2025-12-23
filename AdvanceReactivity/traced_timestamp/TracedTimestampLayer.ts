import { all_match, match_args, register_predicate } from "generic-handler/Predicates";
import { get_base_value, layer_accessor, make_annotation_layer } from "sando-layer/Basic/Layer";
import {  is_layered_object } from "sando-layer/Basic/LayeredObject";
import { type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { construct_better_set, identify_by, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import {  define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import type { traced_timestamp } from "./type";
import { construct_traced_timestamp_set, empty_traced_timestamp_set, type TracedTimeStampSet } from "./TracedTimeStampSet";

import { _is_fresh } from "./Predicates";
import { time_stamp_set_merge } from "./TimeStampSetMerge";
import { smallest_timestamped_value } from "./Annotater";
import { reduce } from "generic-handler/built_in_generics/generic_collection";



export const traced_timestamp_layer = make_annotation_layer<TracedTimeStampSet, any>("time_stamp", (get_name: () => string,
                                                                    has_value: (object: any) => boolean,
                                                                    get_value: (object: any) => any,
                                                                    summarize_self: () => string[]) => {
    function get_default_value(): BetterSet<traced_timestamp> {
        return construct_traced_timestamp_set([]) 
    }

    function get_procedure(name: string, arity: number): any | undefined {
        return (base: any, ...values: any[]) => {
            return reduce(values, time_stamp_set_merge, construct_traced_timestamp_set([]));
        }
    }

    return {
        get_name,
        has_value,
        get_value,
        get_default_value,
        get_procedure,
        summarize_self,
    }})

export function _has_timestamp_layer(a: any): boolean {
    return a && traced_timestamp_layer.has_value(a);
}

export const has_timestamp_layer = register_predicate("has_timestamp_layer", (a: any) => is_layered_object(a) && _has_timestamp_layer(a));

export const get_traced_timestamp_layer = layer_accessor(traced_timestamp_layer);



define_generic_procedure_handler(to_string, match_args(has_timestamp_layer), (a: LayeredObject<any>) => {
    return to_string(get_traced_timestamp_layer(a)) + " " 
    + "value: " + to_string(get_base_value(a)) + "\n"
})


define_generic_procedure_handler(_is_fresh, match_args(has_timestamp_layer),
    (a: LayeredObject<any>) => {
        return _is_fresh(get_traced_timestamp_layer(a));
    }
)

define_generic_procedure_handler(identify_by, match_args(has_timestamp_layer), (a: any) => {
    return to_string(get_traced_timestamp_layer(a))
  })
