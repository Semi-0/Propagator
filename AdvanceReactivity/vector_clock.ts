import { any_unusable_values } from "@/cell/CellValue";
import { Array as A, pipe } from "effect";
import { generic_wrapper } from "generic-handler/built_in_generics/generic_wrapper";

import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args, one_of_args_match, register_predicate } from "generic-handler/Predicates";
import { get_base_value, layer_accessor, make_annotation_layer, type Layer } from "sando-layer/Basic/Layer";
import { define_consolidator_per_layer_dispatcher } from "sando-layer/Basic/LayeredCombinators";
import { is_layered_object, type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { find_related_elements, patch_join, patch_remove, scan_for_patches, subsumes } from "../DataTypes/GenericValueSet";
import { add_item, filter, to_array } from "generic-handler/built_in_generics/generic_collection";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { curryArgument } from "generic-handler/built_in_generics/generic_combinator";
import { curried_filter, curried_map } from "../Helper/Helper";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { Option } from "effect";
import { log_tracer } from "generic-handler/built_in_generics/generic_debugger";
import { is_array, is_number, is_string } from "generic-handler/built_in_generics/generic_predicates";
import { ArrayFormatter } from "effect/ParseResult";



// because vector clock already mark the source id
// maybe we can see vector clock as a more general form of supported value?
// then we don't need to worry about how to merge them together 


type SourceID = string;

type VectorClock = Map<SourceID, number>;

export const at_least_one_pair_is_proper_vector_clock = (a: Map<any, any>) => {
    for (const [key, value] of a) {
       return is_string(key) && is_number(value);
    }
    return false;
}

export const is_vector_clock = register_predicate("is_vector_clock", (a: any) => a instanceof Map && at_least_one_pair_is_proper_vector_clock(a))

export const vector_clock_equal = (a: VectorClock, b: VectorClock) => {
    return a.entries().every(([source, value]) => {
        return value === b.get(source);
    }) && b.entries().every(([source, value]) => {
        return value === a.get(source);
    });
}

define_generic_procedure_handler(is_equal, match_args(is_vector_clock, is_vector_clock),  vector_clock_equal)

export type vector_clock_constructor = {
    source: SourceID;
    value: number;
}

export const construct_vector_clock = (constructors: vector_clock_constructor[]) => {
    return new Map(constructors.map((constructor) => [constructor.source, constructor.value]));
}


export const vector_clock_get_source = (source: SourceID) => (vector_clock: VectorClock) => {
    const maybe_value = vector_clock.get(source);
    if (maybe_value === undefined) {
        return Option.none();
    }
    else {
        return Option.some(maybe_value);
    }
}


const version_vector_forward = (version_vector: VectorClock, source: SourceID) => {
    const new_version_vector = new Map(version_vector);
    new_version_vector.set(source, (new_version_vector.get(source) || 0) + 1);
    return new_version_vector;
}

const version_vector_merge = (version_vector1: VectorClock, version_vector2: VectorClock) => {
    const new_version_vector = new Map(version_vector1);
    version_vector2.forEach((value, source) => {
        new_version_vector.set(source, Math.max(new_version_vector.get(source) || 0, value));
    });
    return new_version_vector;
}


const guarantee_get_vector_clock = (key: string, default_value: number) => (...version_clocks: VectorClock[]): number => {
    for (const version_clock of version_clocks) {
        if (version_clock.has(key)) {
            return version_clock.get(key)!;
        }
    }
    return default_value;
    
}

const version_vector_compare = (version_vector1: VectorClock , version_vector2: VectorClock) => {
    const keys = new Set([...version_vector1.keys(), ...version_vector2.keys()]);

    for (const key of keys) {
        const value1 = guarantee_get_vector_clock(key, 0)(version_vector1, version_vector2);
        const value2 = guarantee_get_vector_clock(key, 0)(version_vector2, version_vector1);
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


export const clock_channels_subsume = (b: VectorClock, a: VectorClock): boolean => {
    // Return true if b "covers" all channels in a and their counters are >= a's
    if (b.size <= a.size) {
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



export const vector_clock_layer = make_annotation_layer<VectorClock, any>("victor_clock", 
    (get_name: () => string,
    has_value: (object: any) => boolean,
    get_value: (object: any) => any,
    summarize_self: () => string[]): Layer<VectorClock> => {

        function get_default_value(): VectorClock {
            return new Map();
        }

        function get_procedure(name: string, arity: number): any | undefined {
            return (base: VectorClock, ...values: VectorClock[]) => {
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

export const get_vector_clock_layer = layer_accessor(vector_clock_layer)


export const _has_vector_clock_layer = (a: any) => {
    return a && vector_clock_layer.has_value(a);
}

export const has_vector_clock_layer = register_predicate("has_victor_clock_layer", (a: any) => {
    const result = is_layered_object(a) && _has_vector_clock_layer(a);
    return result;
})

export const any_victor_clock_out_of_sync = (as: LayeredObject<any>[] | any[]) => {
    return pipe(
        as,
        A.filter(has_vector_clock_layer),
        A.map(vector_clock_layer.get_value),
        A.reduce(0, generic_version_vector_clock_compare)
    ) !== 0
}

export const is_reactive_values = register_predicate("is_reactive_values", (arr: any[]) => {
    if (is_array(arr)) {
        return arr.every(has_vector_clock_layer);
    }
    else{
        return false;
    }
});

define_generic_procedure_handler(any_unusable_values, match_args(is_reactive_values), (as: LayeredObject<any>[] | any[]) => {
    // 1. if all the values has victor clock and their clock are out of sync, then return true
    // 2. if some of the values doesn't have victor clock, skip that value 
    const result = any_victor_clock_out_of_sync(as) || as.some(compose(get_base_value, any_unusable_values))
    return result;
})


define_consolidator_per_layer_dispatcher(
    find_related_elements,
    vector_clock_layer,
    (base_args: any[], contentClock: VectorClock, elt_clock: VectorClock) => {
       const [set, elt] = base_args;
       // finding all the victor clock that is staled
       // victor clock guarantee only same source clock stale
       return filter(set, (a: LayeredObject<any>) => generic_version_clock_less_than(vector_clock_layer.get_value(a), elt_clock))
    }
)

define_consolidator_per_layer_dispatcher(
    // @ts-ignore
    subsumes,
    vector_clock_layer,
    // we have already guaranteed that the new element is more precise
    (...args: any[]) => false
)

export const prove_staled = (a: any, b: any) => {
    const va = to_victor_clock(a);
    const vb = to_victor_clock(b);

    const compared = generic_version_vector_clock_compare(va, vb);

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
        vector_clock_layer.get_value,
        (a: VectorClock) => a
    )
)


export const get_clock_channels = (vector_clock: VectorClock) => {
    return Array.from(vector_clock.keys());
}


const remove_patch = compose(get_base_value, patch_remove);
define_consolidator_per_layer_dispatcher(
    scan_for_patches,
    vector_clock_layer,
           (base_args: any[], set_victor_clock: VectorClock, elt_victor_clock: VectorClock) => {
            const [set, elt] = base_args;

            return add_item(
                pipe(
                    set,
                    curried_filter(proved_staled_with(elt_victor_clock)),
                    curried_map(remove_patch)
                ),
                patch_join(elt)
            );
        } 
)

