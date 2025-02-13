    import { all_match, match_args, register_predicate } from "generic-handler/Predicates";
    import { reference_store, set_any } from "../Helper/Helper";
    import { get_base_value, layer_accessor, make_annotation_layer } from "sando-layer/Basic/Layer";
    import {  is_layered_object} from "../Helper/Predicate";
    import { construct_layer_ui, type LayeredObject } from "sando-layer/Basic/LayeredObject";
    import {  } from "sando-layer/Basic/Layer";
    import { define_handler, generic_merge, set_merge } from "../Cell/Merge";
    import { define_layered_procedure_handler, make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
    import { no_compute } from "../Helper/noCompute";
    import { construct_better_set, difference_set, get, is_better_set, map_to_same_set, merge_set, set_add_item, set_equal, set_every, set_for_each, set_has, set_map, set_remove_item, to_array, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
    import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
    import { is_nothing } from "@/cell/CellValue";
    import { is_array } from "generic-handler/built_in_generics/generic_predicates";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
    const get_new_id = reference_store()
    const get_new_relative_time = reference_store()

    export interface traced_timestamp {
        id: number;
        timestamp: number;
        fresh: boolean;
    }

    

    export const is_traced_timestamp = register_predicate("is_traced_timestamp", (a: any): a is traced_timestamp => {
        return typeof a === "object" && a !== null && "id" in a && "timestamp" in a && "fresh" in a;
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

    

    export function same_source(a: traced_timestamp, b: traced_timestamp): boolean {
        return a.id === b.id
    }

    export const is_timestamp_set = register_predicate("is_timestamp_set", (a: any) => is_better_set(a) && set_every(a, is_traced_timestamp))


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

    export function to_timestamp_set(timestamp: traced_timestamp): BetterSet<traced_timestamp> {
        return construct_better_set([timestamp], (a: traced_timestamp) => a.id.toString())
    }


    export function create_timestamp_set(timestamps: traced_timestamp[]): BetterSet<traced_timestamp> {
        return construct_better_set(timestamps, (a: traced_timestamp) => a.id.toString())
    }


    export function construct_traced_timestamp(timestamp: number): traced_timestamp {
        return {  timestamp, fresh: true, id: get_new_id() }
    }

    export function construct_traced_timestamp_set(base_value: any, timestamp: traced_timestamp | BetterSet<traced_timestamp>): BetterSet<traced_timestamp> {
        if (is_timestamp_set(timestamp)){
            // @ts-ignore
            return timestamp;
        }
        else{
            // @ts-ignore
            return construct_better_set([construct_traced_timestamp(timestamp)], (a: traced_timestamp) => a.id.toString())
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


    export function construct_time_stamp_set(base_value: any, timestamp: number): any {
        return construct_traced_timestamp(timestamp);
    }

    export function _has_timestamp_layer(a: any): boolean {
        return a && timestamp_layer.has_value(a);
    }



    export const annotate_timestamp = construct_layer_ui(
        timestamp_layer,
        construct_traced_timestamp_set,
        (new_value: any, old_value: any) => {
            return new_value;
        }
    );

    export const get_traced_timestamp_layer = layer_accessor(timestamp_layer);

    export const annotate_now = (a: any) => annotate_timestamp(a, Date.now());
    export const annotate_with_reference = (a: any) => annotate_timestamp(a, get_new_relative_time());

    export const has_timestamp_layer = register_predicate("has_timestamp_layer", (a: any) => is_layered_object(a) && _has_timestamp_layer(a));


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

    define_handler(generic_merge, all_match(has_timestamp_layer), (a: LayeredObject, b: LayeredObject) => {
        // todo merge other layers
        // this needs to redesign layered procedure i think...
        if (fresher(a, b)) {
            return a;
        } 
        else if (fresher(b, a)) {
            return b;
        }
        else{
            return b;
        }
    })

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
                throw new Error("Same source, but fresher is same timestamp");
            }
        }
        else{
            throw new Error("Different source");
        }
    
    }


    export function timestamp_set_merge(setA: BetterSet<traced_timestamp>, setB: BetterSet<traced_timestamp>): BetterSet<traced_timestamp> {
        const difference = difference_set(setA, setB); 
        const same_source =  map_to_same_set(difference_set(setA, difference),
            (a: traced_timestamp) => {
                const item_in_set = get(setB, a);
                if (item_in_set){
                    return merge_same_source_timestamp(a, item_in_set) as traced_timestamp;
                }
                else{
                    return a;
                }
            })
        return merge_set(same_source, difference);
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