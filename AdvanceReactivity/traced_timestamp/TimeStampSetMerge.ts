import { construct_better_set, get,  set_add_item,  set_for_each, set_has, set_remove_item, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { same_source } from "./SameSource";
import { fresher } from "./Fresher/Fresher";
import type { traced_timestamp } from "./type";
import { is_timestamp_set } from "./Predicates";

export function timestamp_set_merge(setA: BetterSet<traced_timestamp>, setB: BetterSet<traced_timestamp>): BetterSet<traced_timestamp> {
    var result = construct_better_set([], (a: traced_timestamp) => a.id.toString());

    set_for_each((a: traced_timestamp) => {
        if (set_has(result, a)){
            result = set_add_item(result, merge_same_source_timestamp(a, get(setB, a) as traced_timestamp));
        }
        else{
            result = set_add_item(result, a);
        }
    }, setA);

    set_for_each((a: traced_timestamp) => {
        if (set_has(result, a)){
            result = set_add_item(result, merge_same_source_timestamp(a, get(setA, a) as traced_timestamp));
        }
        else{
            result = set_add_item(result, a);
        }
    }, setB);

    return result
}


export function timestamp_set_adjoin(set: BetterSet<traced_timestamp>, timestamp: traced_timestamp): BetterSet<traced_timestamp> {
    if (set_has(set, timestamp)){
        const item_in_set = get(set, timestamp);
        return set_add_item<traced_timestamp>(set_remove_item(set, item_in_set), merge_same_source_timestamp(item_in_set, timestamp));
    }
    else{
        return set_add_item(set, timestamp);
    }
}



export function generic_timestamp_set_merge(setA: BetterSet<traced_timestamp> | traced_timestamp , setB: BetterSet<traced_timestamp> | traced_timestamp ): BetterSet<traced_timestamp> {
    if (is_timestamp_set(setA) && is_timestamp_set(setB)){
        return timestamp_set_merge(setA as BetterSet<traced_timestamp>, setB as BetterSet<traced_timestamp>);
    }
    else if (is_timestamp_set(setA)){
        return timestamp_set_adjoin(setA as BetterSet<traced_timestamp>, setB as traced_timestamp);
    }
    else if (is_timestamp_set(setB)){
        return timestamp_set_adjoin(setB as BetterSet<traced_timestamp>, setA as traced_timestamp);
    }
    else{
        return timestamp_set_adjoin(setA as BetterSet<traced_timestamp>, setB as traced_timestamp);
    }
}

export function merge_same_source_timestamp(a: traced_timestamp, b: traced_timestamp ):  traced_timestamp {
    if (same_source(a, b)){
        if (a.fresh && !b.fresh){
            return a
        }
        else if (!a.fresh && b.fresh){
            return b
        }
        else if (fresher(a, b)){
            return a
        }
        else if (fresher(b, a)){
            return b
        }
        else{
            return a
        }
    }
    else{
        throw new Error("Different source");
    }
}