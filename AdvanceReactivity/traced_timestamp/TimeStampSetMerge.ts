import { get, set_add_item, set_reduce, set_remove_item, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { same_source } from "./SameSource";
import { fresher } from "./Fresher/Fresher";
import type { traced_timestamp } from "./type";
import { is_timestamp_set, is_traced_timestamp } from "./Predicates";
import { construct_traced_timestamp_set, has_same_source_timestamp } from "./TracedTimeStampSet";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { throw_error } from "generic-handler/built_in_generics/other_generic_helper";
import { construct_empty_generic_procedure } from "../../Helper/Helper";
import { all_match, match_args } from "generic-handler/Predicates";

export function timestamp_set_union(setA: BetterSet<traced_timestamp>, setB: BetterSet<traced_timestamp>): BetterSet<traced_timestamp> {
    return set_reduce(setB, timestamp_set_adjoin, setA)
}

export function timestamp_set_adjoin(set: BetterSet<traced_timestamp>, timestamp: traced_timestamp): BetterSet<traced_timestamp> {
    if (has_same_source_timestamp(set, timestamp)){
        const item_in_set = get(set, timestamp);

        return set_add_item<traced_timestamp>(set_remove_item(set, item_in_set), merge_same_source_timestamp(item_in_set, timestamp));
    }
    else{
        return set_add_item(set, timestamp);
    }
}

export const time_stamp_set_merge = construct_empty_generic_procedure("time_stamp_set_merge", 2)


define_generic_procedure_handler(time_stamp_set_merge, all_match(is_timestamp_set), timestamp_set_union)

define_generic_procedure_handler(time_stamp_set_merge, match_args(is_timestamp_set, is_traced_timestamp), timestamp_set_adjoin)

define_generic_procedure_handler(time_stamp_set_merge, match_args(is_traced_timestamp, is_timestamp_set), (a: traced_timestamp, b: BetterSet<traced_timestamp>) => {
    return timestamp_set_adjoin(b, a) 
})

define_generic_procedure_handler(time_stamp_set_merge, match_args(is_traced_timestamp, is_traced_timestamp), (a: traced_timestamp, b: traced_timestamp) => {
    return timestamp_set_adjoin(construct_traced_timestamp_set([a]), b)
})

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