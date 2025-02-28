import { all_match, match_args, register_predicate } from "generic-handler/Predicates";
import { get_base_value, layer_accessor, make_annotation_layer } from "sando-layer/Basic/Layer";
import {  is_layered_object} from "../../Helper/Predicate";
import { type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { construct_better_set, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import {  define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import type { traced_timestamp } from "./type";
import { deep_equal } from "../../Shared/PublicState";
import { construct_traced_timestamp_set } from "./TracedTimeStampSet";
import { timestamp_equal } from "./TracedTimeStamp";
import { generic_timestamp_set_merge } from "./TimeStampSetMerge";
import { _is_fresh } from "./Predicates";

export const timestamp_layer = make_annotation_layer("time_stamp", (get_name: () => string,
                                                                    has_value: (object: any) => boolean,
                                                                    get_value: (object: any) => any,
                                                                    is_equal: (a: any, b: any) => boolean) => {
    function get_default_value(): BetterSet<traced_timestamp> {
        return construct_better_set<traced_timestamp>([], (a: traced_timestamp) => a.id.toString())
    }

    function get_procedure(name: string, arity: number): any | undefined {
        return (base: any, ...values: any[]) => {
            return values.reduce(generic_timestamp_set_merge, construct_traced_timestamp_set([]));
        }
    }

    function summarize_self(): string[] {
        return ["time_stamp"];
    }

    function summarize_value(object: any): string[] {
        return [object.timestamp]
    }

    return {
        identifier: "layer",
        get_name,
        has_value,
        get_value,
        get_default_value,
        get_procedure,
        summarize_self,
        summarize_value,
        is_equal
    }})

export function _has_timestamp_layer(a: any): boolean {
    return a && timestamp_layer.has_value(a);
}

export const has_timestamp_layer = register_predicate("has_timestamp_layer", (a: any) => is_layered_object(a) && _has_timestamp_layer(a));

export const get_traced_timestamp_layer = layer_accessor(timestamp_layer);

define_generic_procedure_handler(deep_equal,
    all_match(has_timestamp_layer),
    (a: LayeredObject, b: LayeredObject) => {
        const result = timestamp_equal(get_traced_timestamp_layer(a), get_traced_timestamp_layer(b))
            && deep_equal(get_base_value(a), get_base_value(b))
        return result
    }
)    

define_generic_procedure_handler(to_string, match_args(has_timestamp_layer), (a: LayeredObject) => {
    return to_string(get_traced_timestamp_layer(a)) + " " 
    + "value: " + to_string(get_base_value(a)) + "\n"
})


define_generic_procedure_handler(_is_fresh, match_args(has_timestamp_layer),
    (a: LayeredObject) => {
        return _is_fresh(get_traced_timestamp_layer(a));
    }
)


