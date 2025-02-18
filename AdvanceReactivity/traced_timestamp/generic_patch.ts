import { guard, throw_error } from "generic-handler/built_in_generics/other_generic_helper";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { fresher, get_traced_timestamp_layer, has_timestamp_layer, smallest_timestamped_value, type traced_timestamp } from "./tracedTimestampLayer";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { construct_better_set, is_better_set, set_add_item, set_every, set_reduce } from "generic-handler/built_in_generics/generic_better_set";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { get_base_value } from "sando-layer/Basic/Layer";
import { define_handler, generic_merge } from "@/cell/Merge";
import { all_match, match_args, register_predicate } from "generic-handler/Predicates";
import { strongest_value } from "@/cell/StrongestValue";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";




export function to_timestamp_value_set(a: BetterSet<LayeredObject> | LayeredObject): BetterSet<LayeredObject> {
    if (is_better_set(a)){
        // @ts-ignore
        return a;
    }
    else{
        // @ts-ignore
        return construct_better_set([a], (a: traced_timestamp) => to_string(get_base_value(a)))
    }
}

function _is_timestamp_value_set(a: BetterSet<LayeredObject> | LayeredObject): boolean {
    // @ts-ignore
    return is_better_set(a) && set_every(a, (a: LayeredObject) => has_timestamp_layer(a))
}


export const is_timestamp_value_set = register_predicate("is_timestamp_value_set", _is_timestamp_value_set)

export function freshest_value(a: BetterSet<LayeredObject>): LayeredObject{
   
    return set_reduce(a, (a: LayeredObject, b: LayeredObject) => {
        return fresher(a, b) ? a : b
    }, smallest_timestamped_value)
}


export function reactive_merge(content: LayeredObject, increment: LayeredObject){
    return set_add_item(to_timestamp_value_set(content), increment)
}

define_generic_procedure_handler(to_string, match_args(is_timestamp_value_set), (a: BetterSet<LayeredObject>) => {

    return to_string(set_reduce(a, (a: string, b: LayeredObject) => {
        return a + to_string(b)
    }, ""))
})

define_handler(generic_merge, match_args(is_timestamp_value_set, has_timestamp_layer), reactive_merge)

define_handler(generic_merge, match_args(has_timestamp_layer, has_timestamp_layer), reactive_merge)


define_handler(strongest_value, match_args(is_timestamp_value_set), freshest_value)


define_handler(strongest_value, match_args(has_timestamp_layer), 
(a: any) => {
    return a
})

