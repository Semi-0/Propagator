import { any_unusable_values } from "@/cell/CellValue";
import { Array as A, pipe } from "effect";
import { generic_wrapper } from "generic-handler/built_in_generics/generic_wrapper";

import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args, one_of_args_match, register_predicate } from "generic-handler/Predicates";
import { get_base_value, make_annotation_layer, type Layer } from "sando-layer/Basic/Layer";
import { define_consolidator_per_layer_dispatcher } from "sando-layer/Basic/LayeredCombinators";
import { is_layered_object, type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { find_related_elements, patch_join, patch_remove, scan_for_patches, subsumes } from "../DataTypes/GenericValueSet";
import { add_item, filter, to_array } from "generic-handler/built_in_generics/generic_collection";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { curryArgument } from "generic-handler/built_in_generics/generic_combinator";
import { curried_filter, curried_map } from "../Helper/Helper";
import { compose } from "generic-handler/built_in_generics/generic_combinator";


type SourceID = string;

type VersionVector = Map<SourceID, number>;

export const is_vector_clock = register_predicate("is_vector_clock", (a: any) => a instanceof Map )

define_generic_procedure_handler(is_equal, match_args(is_vector_clock, is_vector_clock), (a: VersionVector, b: VersionVector) => {
    return a.entries().every(([source, value]) => {
        if (!b.has(source)) {
            return false;
        }
        return value === b.get(source);
    });
})



const version_vector_forward = (version_vector: VersionVector, source: SourceID) => {
    const new_version_vector = new Map(version_vector);
    new_version_vector.set(source, (new_version_vector.get(source) || 0) + 1);
    return new_version_vector;
}

const version_vector_merge = (version_vector1: VersionVector, version_vector2: VersionVector) => {
    const new_version_vector = new Map(version_vector1);
    version_vector2.forEach((value, source) => {
        new_version_vector.set(source, Math.max(new_version_vector.get(source) || 0, value));
    });
    return new_version_vector;
}

const version_vector_compare = (version_vector1: VersionVector , version_vector2: VersionVector) => {
    const keys = new Set([...version_vector1.keys(), ...version_vector2.keys()]);
    for (const key of keys) {
        const value1 = version_vector1.get(key) || version_vector2.get(key) || 0;
        const value2 = version_vector2.get(key) || version_vector1.get(key) || 0;
        if (value1 < value2) {
            return -1;
        }
        else if (value1 > value2) {
            return 1;
        }
    }
    return 0;
}

const to_victor_clock  = (a: any) => {
    if (is_vector_clock(a)) {
        return a
    }
    else {
        return new Map();
    }
}

export const generic_version_vector_clock_compare = generic_wrapper(
    version_vector_compare,
    (a: any) => a,
    to_victor_clock,
    to_victor_clock
)


export const generic_version_clock_less_than = generic_wrapper(
    version_vector_compare,
    (a: number) => a === -1,
    to_victor_clock,
    to_victor_clock
)

export const generic_version_clock_equal = generic_wrapper(
    version_vector_compare,
    (a: number) => a === 0,
    to_victor_clock,
    to_victor_clock
)

export const generic_version_clock_greater_than = generic_wrapper(
    version_vector_compare,
    (a: number) => a === 1,
    to_victor_clock,
    to_victor_clock
)

export const result_is_less_than = (a: number) => a === -1;
export const result_is_greater_than = (a: number) => a === 1;
export const result_is_equal = (a: number) => a === 0;


// also we might need to consider an edge case of if new value subsume the existing 
// vector clock it also proves old vector clock is staled 


export const clock_channels_subsume = (b: VersionVector, a: VersionVector): boolean => {
    // Return true if b "covers" all channels in a and their counters are >= a's
    if (b.size < a.size) {
        return false;
    }

    for (const key of a.keys()){
        const aVal = a.get(key) ?? 0;
        const bVal = b.get(key) ?? 0;
        if (!b.has(key) || bVal < aVal) {
            return false;
        }
    }
    return true;
};



export const victor_clock_layer = make_annotation_layer<VersionVector, any>("victor_clock", 
    (get_name: () => string,
    has_value: (object: any) => boolean,
    get_value: (object: any) => any,
    summarize_self: () => string[]): Layer<VersionVector> => {

        function get_default_value(): VersionVector {
            return new Map();
        }

        function get_procedure(name: string, arity: number): any | undefined {
            return (base: VersionVector, ...values: VersionVector[]) => {
                return values.reduce((acc, value) => version_vector_merge(acc, value), new Map());
            }
        }
        return {
            get_name,
            has_value,
            get_value,
            get_default_value,
            get_procedure,
            summarize_self,
        }
    }
)

export const _has_victor_clock_layer = (a: any) => {
    return a && victor_clock_layer.has_value(a);
}

export const has_victor_clock_layer = register_predicate("has_victor_clock_layer", (a: any) => is_layered_object(a) && _has_victor_clock_layer(a));


define_generic_procedure_handler(any_unusable_values, match_args(has_victor_clock_layer, has_victor_clock_layer), (as: LayeredObject<any>[] | any[]) => {
    // 1. if all the values has victor clock and their clock are out of sync, then return true
    // 2. if some of the values doesn't have victor clock, skip that value 


    const result = pipe(
        as,
        A.filter(has_victor_clock_layer),
        A.map(victor_clock_layer.get_value),
        A.reduce(0, generic_version_vector_clock_compare)
    )

    return result !== 0
})


define_consolidator_per_layer_dispatcher(
    find_related_elements,
    victor_clock_layer,
    (base_args: any[], contentClock: VersionVector, elt_clock: VersionVector) => {
       const [set, elt] = base_args;
       // finding all the victor clock that is staled
       // victor clock guarantee only same source clock stale
       return filter(set, (a: LayeredObject<any>) => generic_version_clock_less_than(victor_clock_layer.get_value(a), elt_clock))
    }
)

define_consolidator_per_layer_dispatcher(
    // @ts-ignore
    subsumes,
    victor_clock_layer,
    // we have already guaranteed that the new element is more precise
    (...args: any[]) => false
)

export const prove_staled = (a: any, b: any) => {
    const va = to_victor_clock(a);
    const vb = to_victor_clock(b);

    const compared = generic_version_vector_clock_compare(va, vb);
    console.log("compared", compared);

    if (result_is_less_than(compared)) {
        return true;
    }
    else if (result_is_equal(compared) && clock_channels_subsume(vb, va)) {
        return true 
    }
    else {
        return false
    }
}

export const proved_staled_with = curryArgument(
    1, 
    generic_wrapper(
        prove_staled, 
        (a: boolean) => a,
        victor_clock_layer.get_value,
        (a: VersionVector) => a
    )
)

define_consolidator_per_layer_dispatcher(
    scan_for_patches,
    victor_clock_layer,
    (base_args: any[], set_victor_clock: VersionVector, elt_victor_clock: VersionVector) => {
        const [set, elt] = base_args;

        
        // missed join the new element
        console.log("set_victor_clock", set_victor_clock);
        console.log("elt_victor_clock", elt_victor_clock);
        return add_item(
            pipe(set, 
                curried_filter(proved_staled_with(elt_victor_clock)), 
                // @ts-ignore
                curried_map(compose(get_base_value, patch_remove))),
            patch_join(elt)
        )
    }
)
// TODO: BEHAVIORS
// TODO: Merge
// any unusable value? 
// strongest?
// merge can just merge with value set
// strongest we can see whether uses 
// contradiction handler with multiple inputs
