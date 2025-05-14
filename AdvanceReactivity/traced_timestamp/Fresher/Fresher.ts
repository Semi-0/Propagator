import { to_array } from "generic-handler/built_in_generics/generic_better_set";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import type { traced_timestamp } from "../type";


export const fresher = construct_simple_generic_procedure("fresher", 2, (a: LayeredObject<any>, b: LayeredObject<any>) => {
    throw new Error("Fresher is not defined for traced timestamp: " + to_string(a) + " and " + to_string(b));
})


// Helper function to reduce a BetterSet of traced_timestamps to its freshest timestamp.
// Assumes that fresher(ts1, ts2) returns true when ts1 is fresher than ts2.
export function get_max_timestamp(set: BetterSet<traced_timestamp>): traced_timestamp | null {

    const arr = to_array(set);
    if (arr.length === 0) return null;
    return arr.reduce((max, ts) => {
        // If there is no max so far, or ts is fresher than the current max, then use ts.
        if (max === null || fresher(ts, max)) {
            return ts;
        }
        return max;
    }, null as traced_timestamp | null);
}

// 1. 


