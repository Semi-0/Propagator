import {construct_traced_timestamp, high_precision_timestamp, monotonic_timestamp} from "./TracedTimeStamp";
import { construct_traced_timestamp_set } from "./TracedTimeStampSet";
import { is_timestamp_set } from "./Predicates";
import { set_flat_map, set_for_each } from "generic-handler/built_in_generics/generic_better_set";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { construct_better_set } from "generic-handler/built_in_generics/generic_better_set";
import {  type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { reference_store } from "../../Helper/Helper";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { define_layered_procedure_handler } from "sando-layer/Basic/LayeredProcedure";
import type { traced_timestamp } from "./type";
import { is_traced_timestamp } from "./Predicates";
import { traced_timestamp_layer } from "./TracedTimestampLayer.ts"
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { compose } from "generic-handler/built_in_generics/generic_combinator";

const get_new_relative_time = reference_store()


export const tt_set_annotated : (a: number, id: string) => BetterSet<traced_timestamp> = compose(construct_traced_timestamp,  construct_traced_timestamp_set)


export const traced_timestamped = (
    v: any, 
    stamps: traced_timestamp | BetterSet<traced_timestamp>
): LayeredObject<any> => construct_layered_datum(v, traced_timestamp_layer, stamps);

export const annotate_now_with_id = (id: string) => (a: any) => 
    traced_timestamped(a, tt_set_annotated(monotonic_timestamp(), id));

export const annotate_smallest_time_with_id = (id: string) => (a: any) => 
    traced_timestamped(a, tt_set_annotated(-Infinity, id));

export const annotate_with_referenced_time_and_id = (id: string) => (a: any) => 
    traced_timestamped(a, tt_set_annotated(get_new_relative_time(), id));

export const smallest_timestamped_value = () => traced_timestamped(
    "null", 
    {timestamp: -Infinity, id: "0", fresh: false} 
);

function _stale(a: any) {
    return a
}

export const stale = make_layered_procedure("stale", 1, _stale)

define_layered_procedure_handler(stale, traced_timestamp_layer, 
    (base: any, timestamp: BetterSet<traced_timestamp>) => {
        return set_for_each((a: traced_timestamp) => {
            a.fresh = false;
        }, timestamp);
    }
)