import { construct_traced_timestamp } from "./TracedTimeStamp";
import { construct_traced_timestamp_set } from "./TracedTimeStampSet";
import { is_timestamp_set } from "./Predicates";
import { set_flat_map, set_for_each } from "generic-handler/built_in_generics/generic_better_set";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { construct_better_set } from "generic-handler/built_in_generics/generic_better_set";
import { construct_layer_ui } from "sando-layer/Basic/LayeredObject";
import { reference_store } from "../../Helper/Helper";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { define_layered_procedure_handler } from "sando-layer/Basic/LayeredProcedure";
import type { traced_timestamp } from "./type";
import { is_traced_timestamp } from "./Predicates";
import { timestamp_layer } from "./TracedTimestampLayer"

const get_new_relative_time = reference_store()

export function traced_timestamp_ui_constructor(id: string) : (id: string) => (base_value: any, timestamp: number | BetterSet<traced_timestamp>) => BetterSet<traced_timestamp> {
       // @ts-ignore
    return (base_value: any, timestamp: number | BetterSet<traced_timestamp>) => {
        if (is_timestamp_set(timestamp)){
            // @ts-ignore
            return timestamp;
        }
        else{
            // @ts-ignore
            return construct_traced_timestamp_set([construct_traced_timestamp(timestamp, id)])
        }
    }
}

export function patch_traced_timestamp_set(base_value: any, ...traced_timestamps: (traced_timestamp | BetterSet<traced_timestamp>)[]): BetterSet<traced_timestamp> {
    // explicitly checking it is a timestamp set
    // this is not the most performant way to do this, but lets have this for now 
    // TODO: make this more performant
    
    if (traced_timestamps.length === 1 && is_timestamp_set(traced_timestamps[0])){
        return traced_timestamps[0] as BetterSet<traced_timestamp>;
    }
    else if (traced_timestamps.every((a: any) => is_traced_timestamp(a))) {
        // TODO: this branch might cause weird behavior
        
        const timestamps = traced_timestamps as traced_timestamp[];
        const result = set_flat_map(construct_better_set(timestamps, (a: traced_timestamp) => a.id.toString()), 
            (a: traced_timestamp) => {
                return a;
            });  

        return result;
    }
    else{
        throw new Error("Invalid timestamp set: " + to_string(traced_timestamps));
    }
}


export const patch_traced_timestamps = construct_layer_ui(
    timestamp_layer,
    patch_traced_timestamp_set,
    (new_value: any, old_value: any) => {
        return new_value;
    }
);


export const annotate_identified_timestamp = (id: string) => construct_layer_ui(
    timestamp_layer,
    traced_timestamp_ui_constructor(id),
    (new_value: any, old_value: any) => {
        return new_value;
    }
);

export const annotate_now_with_id = (id: string) => (a: any) => annotate_identified_timestamp(id)(a, Date.now());

export const annotate_smallest_time_with_id = (id: string) => (a: any) => annotate_identified_timestamp(id)(a, -Infinity);

export const annotate_with_referenced_time_and_id = (id: string) => (a: any) => annotate_identified_timestamp(id)(a, get_new_relative_time());

export const smallest_timestamped_value = annotate_identified_timestamp("null")(0, -Infinity)

function _stale(a: any) {
    return a
}

export const stale = make_layered_procedure("stale", 1, _stale)

define_layered_procedure_handler(stale, timestamp_layer, 
    (base: any, timestamp: BetterSet<traced_timestamp>) => {
        return set_for_each((a: traced_timestamp) => {
            a.fresh = false;
        }, timestamp);
    }
)