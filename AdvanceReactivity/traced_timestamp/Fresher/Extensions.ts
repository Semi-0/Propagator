
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { is_timestamp_set, is_traced_timestamp } from "../Predicates";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import type { traced_timestamp } from "../type";
import { fresher } from "./Fresher";
import { all_match, match_args } from "generic-handler/Predicates";
import { is_nothing } from "@/cell/CellValue";
import { has_timestamp_layer, get_traced_timestamp_layer } from "../TracedTimestampLayer.ts";
import { get_max_timestamp } from "./Fresher";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";

//Compare two traced_timestamps (scalars).
define_generic_procedure_handler(fresher, all_match(is_traced_timestamp), (a: traced_timestamp, b: traced_timestamp) => {
    if (a.fresh && !b.fresh) {
        return true;
    } else if (!a.fresh && b.fresh) {
        return false;
    } else {
        return a.timestamp > b.timestamp;
    }
});

// 2. Compare two timestamp sets by reducing each to a single representative timestamp.
define_generic_procedure_handler(fresher, all_match(is_timestamp_set), (a: BetterSet<traced_timestamp>, b: BetterSet<traced_timestamp>) => {
    const maxA = get_max_timestamp(a);
    const maxB = get_max_timestamp(b);
    if (maxA === null && maxB === null) {
        // If both sets are empty, neither is fresher.
        return false;
    } else if (maxA === null) {
        // An empty set is considered stale.
        return false;
    } else if (maxB === null) {
        return true;
    } else {
        return fresher(maxA, maxB);
    }
});

// 3. Compare a timestamp set with a traced timestamp by reducing the set.
define_generic_procedure_handler(fresher, match_args(is_timestamp_set, is_traced_timestamp), (a: BetterSet<traced_timestamp>, b: traced_timestamp) => {
    const maxA = get_max_timestamp(a);
    if (maxA === null) return false;
    return fresher(maxA, b);
});

// 4. Compare a traced timestamp and a timestamp set by reducing the set.
define_generic_procedure_handler(fresher, match_args(is_traced_timestamp, is_timestamp_set), (a: traced_timestamp, b: BetterSet<traced_timestamp>) => {
    const maxB = get_max_timestamp(b);
    if (maxB === null) return true;
    return fresher(a, maxB);
});

// 5. Handle the "nothing" cases explicitly.
// When the left-hand side is "nothing", treat it as stale.
define_generic_procedure_handler(fresher, match_args(is_nothing, is_timestamp_set), (_: any, b: BetterSet<traced_timestamp>) => {
    return false;
});

// When the right-hand side is "nothing", treat the left-hand side as fresher.
define_generic_procedure_handler(fresher, match_args(is_timestamp_set, is_nothing), (a: BetterSet<traced_timestamp>, _: any) => {
    return true;
});

// 6. Compare layered objects by extracting their traced timestamp layers.
define_generic_procedure_handler(fresher, all_match(has_timestamp_layer), (a: LayeredObject<any>, b: LayeredObject<any>) => {
    return fresher(get_traced_timestamp_layer(a), get_traced_timestamp_layer(b));
});

export const same_freshness = (a: LayeredObject<any>, b: LayeredObject<any>) => {
    return !fresher(get_traced_timestamp_layer(a), get_traced_timestamp_layer(b))
        && !fresher(get_traced_timestamp_layer(b), get_traced_timestamp_layer(a))
}