import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import {  has_timestamp_layer, traced_timestamp_layer } from "./TracedTimestampLayer.ts";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { construct_better_set, is_better_set, set_merge as _set_merge, identify_by  } from "generic-handler/built_in_generics/generic_better_set";
import { every } from "generic-handler/built_in_generics/generic_collection";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { get_base_value } from "sando-layer/Basic/Layer";
import { define_handler, generic_merge, set_merge } from "@/cell/Merge";
import { match_args, register_predicate } from "generic-handler/Predicates";
import { strongest_value } from "@/cell/StrongestValue";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { is_contradiction, is_not_contradiction, the_contradiction } from "@/cell/CellValue";
import {  cell_content, type Cell } from "@/cell/Cell";
import { update } from "../interface";
import { fresher } from "./Fresher/Fresher";
import { same_source } from "./SameSource";
import { is_fresh } from "./Predicates";
import { get_traced_timestamp_layer } from "./TracedTimestampLayer.ts";
import { smallest_timestamped_value, traced_timestamped } from "./Annotater";
import { same_freshness } from "./Fresher/Extensions";

import { refresh_all_timestamps, timestamp_set_do_intersect, timestamp_set_intersect, type TracedTimeStampSet } from "./TracedTimeStampSet";
import { define_layered_procedure_handler } from "sando-layer/Basic/LayeredProcedure";
import { feedback } from "../Generics/GenericArith";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { time_stamp_set_merge } from "./TimeStampSetMerge";
import { construct_error_value, error_layer } from "sando-layer/Specified/ErrorLayer";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { compose } from "generic-handler/built_in_generics/generic_combinator.ts";
import { add_item, filter, for_each, length, reduce, to_array } from "generic-handler/built_in_generics/generic_collection.ts";
// TODO: now is not realistic because cell would keep all the data
// perhaps we need some strategy to clean up the data


define_generic_procedure_handler(identify_by, match_args(has_timestamp_layer), compose(get_base_value, identify_by))

export function construct_timestamp_value_set(a: LayeredObject<any>): BetterSet<LayeredObject<any>> {
    // this is an ideal value set which keeps all the value
    return construct_better_set([a])
}

export function to_timestamp_value_set(a: BetterSet<LayeredObject<any>> | LayeredObject<any>): BetterSet<LayeredObject<any>> {
    if (is_better_set(a)){
        // @ts-ignore
        return a;
    }
    else{
        // @ts-ignore
        return construct_timestamp_value_set(a)
    }
}

function _is_timestamp_value_set(a: BetterSet<LayeredObject<any>> | LayeredObject<any>): boolean {
    // @ts-ignore
    return is_better_set(a) && every(a, (a: LayeredObject<any>) => has_timestamp_layer(a))
}

export const is_timestamp_value_set = register_predicate("is_timestamp_value_set", _is_timestamp_value_set)

export function freshest_value(a: BetterSet<LayeredObject<any>>): LayeredObject<any>{
    var freshest = smallest_timestamped_value()
    for_each(a, (a: LayeredObject<any>) => {
        if (is_equal(a, freshest)){
            return
        }
        else if (same_freshness(a, freshest) ){
            // @ts-ignore
            // if has two value has the same freshness then cause a contradiction
            const timestamp_set_a = get_traced_timestamp_layer(a)
            const timestamp_set_freshest = get_traced_timestamp_layer(freshest)

            if(same_source(timestamp_set_a, timestamp_set_freshest)){
                freshest = construct_layered_datum(
                    the_contradiction, 
                traced_timestamp_layer, 
                time_stamp_set_merge(timestamp_set_a, timestamp_set_freshest),
                error_layer,
                    construct_error_value(get_base_value(a), "same freshness error")
                )
            }
            else{
                freshest = a
            }
        }
        else if (fresher(a, freshest)){
            freshest = a
        
        }
        else{
            // stay the same
        }

      
    }, a)

    return freshest
}

export function _reactive_merge(content: LayeredObject<any>, increment: LayeredObject<any>): BetterSet<LayeredObject<any>>{
    return add_item(to_timestamp_value_set(content), increment)
}

export const reactive_merge = construct_simple_generic_procedure("reactive_merge", 2, generic_merge) 

define_generic_procedure_handler(to_string, match_args(is_timestamp_value_set), (a: BetterSet<LayeredObject<any>>) => {

    return to_string(reduce(a, (a: string, b: LayeredObject<any>) => {
        return a + to_string(b)
    }, ""))
})

define_handler(reactive_merge, match_args(is_timestamp_value_set, has_timestamp_layer), _reactive_merge)

define_handler(reactive_merge, match_args(has_timestamp_layer, has_timestamp_layer), _reactive_merge)

export function _drop_staled_merge(content: LayeredObject<any>, increment: LayeredObject<any>){
    const r = reactive_merge(content, increment)
    if (is_timestamp_value_set(r)){
        return filter(r, is_fresh)
    }
    else{
        return r
    }
}

export const reactive_fresh_merge = _drop_staled_merge
// drop staled merge is a 

define_handler(strongest_value, match_args(is_timestamp_value_set), freshest_value)

define_handler(strongest_value, match_args(has_timestamp_layer), 
(a: any) => {

    return a
})

export function trace_value(selector: (a: LayeredObject<any>[]) => LayeredObject<any>){
    return (cell: Cell<any>) => {
        const contradiction = strongest_value(cell)
        const contradiction_timestamp = get_traced_timestamp_layer(contradiction) 
        // @ts-ignore
        const contents = cell_content(cell) as BetterSet<LayeredObject<any>>
        
        const causes = filter(contents, (a: LayeredObject<any>) => {
            return timestamp_set_do_intersect(get_traced_timestamp_layer(a), contradiction_timestamp)
        })


        const is_fresher_than_contradiction = (a: LayeredObject<any>) => {
            return fresher(get_traced_timestamp_layer(a), contradiction_timestamp)
        }

        const options = _set_merge(
            filter(causes, is_not_contradiction), 
            filter(contents, is_fresher_than_contradiction)
        )

        if (length(options) > 0){
            const value = selector(to_array(options))
            new Promise(resolve => setTimeout(resolve, 1)).then(() => {
                update(cell, get_base_value(value))
                
            })
        }
        else{
            throw new Error("No cause found for contradiction")
        }
    }
}

export const trace_earliest_emerged_value = trace_value((a: LayeredObject<any>[]) => {
    return a[0]
})

export const trace_latest_emerged_value = trace_value((a: LayeredObject<any>[]) => {
    return a[a.length - 1]
})






define_layered_procedure_handler(feedback,
    traced_timestamp_layer,
    (base: any, timestamp_value: TracedTimeStampSet) => {
        
        return refresh_all_timestamps(timestamp_value)
    }
)