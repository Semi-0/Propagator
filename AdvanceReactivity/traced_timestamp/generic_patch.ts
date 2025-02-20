import { guard, throw_error } from "generic-handler/built_in_generics/other_generic_helper";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { fresher, get_traced_timestamp_layer, has_timestamp_layer, patch_traced_timestamps, same_freshness, same_source, smallest_timestamped_value, timestamp_equal, timestamp_set_merge, type traced_timestamp } from "./tracedTimestampLayer";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { construct_better_set, is_better_set, set_add_item, set_every, set_filter, set_for_each, set_get_length, set_reduce, to_array } from "generic-handler/built_in_generics/generic_better_set";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { get_base_value } from "sando-layer/Basic/Layer";
import { define_handler, generic_merge } from "@/cell/Merge";
import { all_match, match_args, register_predicate } from "generic-handler/Predicates";
import { strongest_value } from "@/cell/StrongestValue";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { is_contradiction, the_contradiction } from "@/cell/CellValue";
import { deep_equal } from "../../Shared/PublicState";
import { cell_content_value, cell_strongest_value, type Cell } from "@/cell/Cell";
import { update } from "../update";




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

// TODO: handle contradiction

export function freshest_value(a: BetterSet<LayeredObject>): LayeredObject{
   
    var freshest = smallest_timestamped_value
    set_for_each((a: LayeredObject) => {
     if (deep_equal(a, freshest)){
        return
       }
       else if (same_freshness(a, freshest) ){
        // @ts-ignore
        // if has two value has the same freshness then cause a contradiction
        const timestamp_set_a = get_traced_timestamp_layer(a)
        const timestamp_set_freshest = get_traced_timestamp_layer(freshest)

        if(same_source(timestamp_set_a, timestamp_set_freshest)){
            freshest = patch_traced_timestamps(the_contradiction, timestamp_set_a)
        }
        else{
            freshest = a
        }
       }
       else if (fresher(a, freshest)){
        freshest = a
       }
    }, a)


    return freshest
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




export function handle_reactive_contradiction(cell: Cell<any>){

    const contradiction = cell_strongest_value(cell)
    const contradiction_timestamp = get_traced_timestamp_layer(contradiction) 
    const contents = cell_content_value(cell)

    const causes = set_filter(contents, (a: LayeredObject) => {
        return timestamp_equal(get_traced_timestamp_layer(a), contradiction_timestamp)
    })

    // select the cause that was earliest emerged 
    if (set_get_length(causes) > 0){
        const earliest_emerged_value = to_array(causes)[0]
        update(cell, get_base_value(earliest_emerged_value))
    }
    else{
        throw new Error("No cause found for contradiction")
    }
}

