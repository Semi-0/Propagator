    import { all_match, match_args, register_predicate } from "generic-handler/Predicates";
    import { reference_store, set_any } from "../../Helper/Helper";
    import { get_base_value, layer_accessor, make_annotation_layer } from "sando-layer/Basic/Layer";
    import {  is_layered_object} from "../../Helper/Predicate";
    import { construct_layer_ui, type LayeredObject } from "sando-layer/Basic/LayeredObject";
    import {  } from "sando-layer/Basic/Layer";
    import { define_handler, generic_merge, set_merge } from "../../Cell/Merge";
    import { define_layered_procedure_handler, make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
    import { no_compute } from "../../Helper/noCompute";
    import { construct_better_set, difference_set, get, is_better_set, map_to_same_set, merge_set, set_add_item, set_equal, set_every, set_flat_map, set_for_each, set_has, set_map, set_reduce, set_remove_item, to_array, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
    import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
    import { is_nothing } from "@/cell/CellValue";
    import { is_array } from "generic-handler/built_in_generics/generic_predicates";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import type { traced } from "fp-ts";
import { deep_equal } from "../../Shared/PublicState";
    const get_new_id = reference_store()
    const get_new_relative_time = reference_store()

    export interface traced_timestamp {
        id: string;
        timestamp: number;
        fresh: boolean;
    }

    

    export const is_traced_timestamp = register_predicate("is_traced_timestamp", (a: any): a is traced_timestamp => {
        return typeof a === "object" && a !== null && "id" in a && "timestamp" in a && "fresh" in a;
    })

    define_generic_procedure_handler(to_string, match_args(is_traced_timestamp), (a: traced_timestamp) => {
        return "traced_timestamp: " + a.id + " " + a.timestamp + " " + a.fresh
    })


    const _timestamp_equal = construct_simple_generic_procedure("timestamp_equal", 2, (a: traced_timestamp, b: traced_timestamp) => {
        if (is_traced_timestamp(a) && is_traced_timestamp(b)){
            return a.id === b.id && a.timestamp === b.timestamp && a.fresh === b.fresh;
        }
        else{
            return false;
        }
    })

    export const timestamp_equal = register_predicate("timestamp_equal", _timestamp_equal)

    

    export const same_source = construct_simple_generic_procedure("same_source", 2, () => {throw new Error("same_source is not defined for traced_timestamp")}) 
    
    define_generic_procedure_handler(same_source, all_match(is_traced_timestamp), (a: traced_timestamp, b: traced_timestamp) => {
        return a.id === b.id
    })

    export const is_timestamp_set = register_predicate("is_timestamp_set", (a: any) => is_better_set(a) && set_every(a, is_traced_timestamp))

    define_generic_procedure_handler(same_source, all_match(is_timestamp_set), (a: BetterSet<traced_timestamp>, b: BetterSet<traced_timestamp>) => {
        return set_every(a, (at: traced_timestamp) => set_has(b, at)) && set_every(b, (bt: traced_timestamp) => set_has(a, bt))
    })

    define_generic_procedure_handler(to_string, match_args(is_timestamp_set), (a: BetterSet<traced_timestamp>) => {
        return to_string(set_reduce(a, (a: string, b: traced_timestamp) => {
            return a + to_string(b)
        }, ""))
    })

    define_generic_procedure_handler(_timestamp_equal, all_match(is_timestamp_set),
        (a: BetterSet<traced_timestamp>, b: BetterSet<traced_timestamp>) => {
            return set_every(a, (at: traced_timestamp) => _timestamp_equal(get(b, at), at)) && 
                   set_every(b, (bt: traced_timestamp) => _timestamp_equal(get(a, bt), bt));
        }
    )

    define_generic_procedure_handler(_timestamp_equal, all_match(is_array),
        (as: BetterSet<traced_timestamp>[], bs: BetterSet<traced_timestamp>[]) => {
            for (let index = 0; index < as.length; index++) {
                const at = as[index];
                const bt = bs[index];
                if (!_timestamp_equal(at, bt)){
                    return false;
                }
            }
            return true;
        }

    )

    export function to_traced_timestamp_set(timestamp: traced_timestamp): BetterSet<traced_timestamp> {
        return construct_better_set([timestamp], (a: traced_timestamp) => a.id.toString())
    }


    export function create_traced_timestamp_set(timestamps: traced_timestamp[]): BetterSet<traced_timestamp> {
        return construct_better_set(timestamps, (a: traced_timestamp) => a.id.toString())
    }


    export function construct_traced_timestamp(timestamp: number, id: string):  traced_timestamp {
        return {  timestamp, fresh: true, id: id }
    }

    export function construct_new_traced_timestamp_set(id: string) : (id: string) => (base_value: any, timestamp: number | BetterSet<traced_timestamp>) => BetterSet<traced_timestamp> {
       // @ts-ignore
       return (base_value: any, timestamp: number | BetterSet<traced_timestamp>) => {
            if (is_timestamp_set(timestamp)){
                // @ts-ignore
                return timestamp;
            }
            else{
                // @ts-ignore
                return construct_better_set([construct_traced_timestamp(timestamp, id)], (a: traced_timestamp) => a.id.toString())
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

    export const timestamp_layer = make_annotation_layer("time_stamp", (get_name: () => string,
                                                                        has_value: (object: any) => boolean,
                                                                        get_value: (object: any) => any,
                                                                        is_equal: (a: any, b: any) => boolean) => {
        function get_default_value(): BetterSet<traced_timestamp> {
            return construct_better_set<traced_timestamp>([], (a: traced_timestamp) => a.id.toString())
        }

        function get_procedure(name: string, arity: number): any | undefined {
            return (base: any, ...values: any[]) => {
                return values.reduce((acc, value) => {
                    return timestamp_set_adjoin(acc, value);
                }, construct_better_set<traced_timestamp>([], (a: traced_timestamp) => a.id.toString()));
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
        

    define_generic_procedure_handler(deep_equal,
        all_match(has_timestamp_layer),
        (a: LayeredObject, b: LayeredObject) => {
            return timestamp_equal(get_traced_timestamp_layer(a), get_traced_timestamp_layer(b))
                && deep_equal(get_base_value(a), get_base_value(b))
        }
    )    

    export const annotate_identified_timestamp = (id: string) => construct_layer_ui(
        timestamp_layer,
        construct_new_traced_timestamp_set(id),
        (new_value: any, old_value: any) => {
            return new_value;
        }
    );

    export const patch_traced_timestamps = construct_layer_ui(
        timestamp_layer,
        patch_traced_timestamp_set,
        (new_value: any, old_value: any) => {
            return new_value;
        }
    );

    export const get_traced_timestamp_layer = layer_accessor(timestamp_layer);

    export const annotate_now = (id: string) => (a: any) => annotate_identified_timestamp(id)(a, Date.now());

    export const annotate_smallest = (id: string) => (a: any) => annotate_identified_timestamp(id)(a, -Infinity);
    export const annotate_with_reference = (id: string) => (a: any) => annotate_identified_timestamp(id)(a, get_new_relative_time());


    define_generic_procedure_handler(to_string, match_args(has_timestamp_layer), (a: LayeredObject) => {
        return to_string(get_traced_timestamp_layer(a)) + " " 
        + "value: " + to_string(get_base_value(a)) + "\n"
    })


    export const fresher = construct_simple_generic_procedure("fresher", 2, (a: LayeredObject, b: LayeredObject) => {
        throw new Error("Fresher is not defined for traced timestamp: " + to_string(a) + " and " + to_string(b));
    })


    // Helper function to reduce a BetterSet of traced_timestamps to its freshest timestamp.
    // Assumes that fresher(ts1, ts2) returns true when ts1 is fresher than ts2.
    function max_timestamp(set: BetterSet<traced_timestamp>): traced_timestamp | null {
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

    // 1. Compare two traced_timestamps (scalars).
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
        const maxA = max_timestamp(a);
        const maxB = max_timestamp(b);
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
        const maxA = max_timestamp(a);
        if (maxA === null) return false;
        return fresher(maxA, b);
    });

    // 4. Compare a traced timestamp and a timestamp set by reducing the set.
    define_generic_procedure_handler(fresher, match_args(is_traced_timestamp, is_timestamp_set), (a: traced_timestamp, b: BetterSet<traced_timestamp>) => {
        const maxB = max_timestamp(b);
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
    define_generic_procedure_handler(fresher, all_match(has_timestamp_layer), (a: LayeredObject, b: LayeredObject) => {
        return fresher(get_traced_timestamp_layer(a), get_traced_timestamp_layer(b));
    });

    export const same_freshness = (a: LayeredObject, b: LayeredObject) => {
        return !fresher(get_traced_timestamp_layer(a), get_traced_timestamp_layer(b))
            && !fresher(get_traced_timestamp_layer(b), get_traced_timestamp_layer(a))
    }
   
    

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


    export const is_fresh = register_predicate("is_fresh", (a: any) => _is_fresh(a))

    const _is_fresh = construct_simple_generic_procedure("is_fresh", 1, (a: any) => false)

    define_generic_procedure_handler(_is_fresh, match_args(is_nothing),
        (a: any) => {
            return false;
        }
    )

    define_generic_procedure_handler(_is_fresh, match_args(is_traced_timestamp),
        (timestamp: traced_timestamp) => {
            return timestamp.fresh;
        }
    )

    define_generic_procedure_handler(_is_fresh, match_args(is_timestamp_set),
        (timestamp_set: BetterSet<traced_timestamp>) => {
            return set_every(timestamp_set, (a: traced_timestamp) => _is_fresh(a));
        }
    )

    define_generic_procedure_handler(_is_fresh, match_args(has_timestamp_layer),
        (a: LayeredObject) => {
            return _is_fresh(get_traced_timestamp_layer(a));
        }
    )

    define_generic_procedure_handler(_is_fresh, match_args(is_array),
        (array: any[]) => {
            return array.every((a: any) => _is_fresh(a));
        }
    )
    
    
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