import { any_unusable_values } from "@/cell/CellValue";
import { Array as A, pipe } from "effect";
import { generic_wrapper } from "generic-handler/built_in_generics/generic_wrapper";

import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args, one_of_args_match, register_predicate } from "generic-handler/Predicates";
import { make_annotation_layer, type Layer } from "sando-layer/Basic/Layer";
import { define_consolidator_per_layer_dispatcher } from "sando-layer/Basic/LayeredCombinators";
import { is_layered_object, type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { find_related_elements, subsumes } from "../DataTypes/GenericValueSet";
import { filter } from "generic-handler/built_in_generics/generic_collection";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";



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
        const value1 = version_vector1.get(key) || 0;
        const value2 = version_vector2.get(key) || 0;
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

// TODO: BEHAVIORS
// TODO: Merge
// any unusable value? 
// strongest?
// merge can just merge with value set
// strongest we can see whether uses 
// contradiction handler with multiple inputs
