import { any_unusable_values, is_unusable_value } from "@/cell/CellValue";
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
import { is_array, is_number, is_string } from "generic-handler/built_in_generics/generic_predicates";

import { define_layered_procedure_handler, make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { v4 as uuidv4 } from 'uuid';


// because vector clock already mark the source id
// maybe we can see vector clock as a more general form of supported value?
// then we don't need to worry about how to merge them together 


type SourceID = string;

type Clock = number | string;

type VectorClock = Map<SourceID, number>;

export const constant_clock = "constant"

export const is_constant_clock = (clock: Clock) => {
    return clock === constant_clock;
}


export const at_least_one_pair_is_proper_vector_clock = (a: Map<any, any>) => {
    for (const [key, value] of a) {
       return is_string(key) && is_number(value);
    }
    return false;
}

export const is_vector_clock = register_predicate("is_vector_clock", (a: any) => 
    a instanceof Map && at_least_one_pair_is_proper_vector_clock(a) ||
    is_constant_clock(a)
)

// export const vector_clock_equal = (a: VectorClock, b: VectorClock) => {
//     return a.entries().every(([source, value]) => {
//         return value === b.get(source);
//     }) && b.entries().every(([source, value]) => {
//         return value === a.get(source);
//     });
// }


export type vector_clock_constructor = {
    source: SourceID;
    value: Clock;
}

export const construct_vector_clock = (constructors: vector_clock_constructor[]) => {
    return new Map(constructors.map((constructor) => [constructor.source, constructor.value]));
}


export const vector_clock_get_source: (source: SourceID, vector_clock: VectorClock) => Clock = (source: SourceID, vector_clock: VectorClock) => {
    
    const maybe_value = vector_clock.get(source);

    if (maybe_value === undefined) {
        return 0 
    }
    else {
        return maybe_value;
    }
}

export const vector_clock_set_source = (source: SourceID, value: number, vector_clock: VectorClock) => {
    vector_clock.set(source, value);
    return vector_clock;
}

export const clock_increment = (clock: Clock) => {
    if (is_constant_clock(clock)) {
        return clock;
    }
    else {
        // @ts-ignore
        return clock + 1;
    }
}

// Direct version that returns Clock (for constant clock support)
export const vector_clock_get_source_direct: (source: SourceID, vector_clock: VectorClock | any) => Clock = (source: SourceID, vector_clock: VectorClock | any) => {
    // @ts-ignore
    if (is_constant_clock(vector_clock)) {
        return constant_clock;
    }
    if (!vector_clock || typeof vector_clock.get !== 'function') {
        return 0;
    }
    const maybe_value = vector_clock.get(source);
    if (maybe_value === undefined) {
        return 0 
    }
    else {
        return maybe_value;
    }
}

// Duplicate - commented out (already declared at line 89)
// export const clock_increment = (clock: Clock) => {
//     if (is_constant_clock(clock)) {
//         return clock;
//     }
//     else {
//         // @ts-ignore
//         return clock + 1;
//     }
// }

export const clock_greater_than = (a: Clock, b: Clock) => {
    return compare_two_clock(a, b) > 0;
}

export const clock_less_than = (a: Clock, b: Clock) => {
    return compare_two_clock(a, b) < 0;
}

export const clock_equal = (a: Clock, b: Clock) => {
    return compare_two_clock(a, b) === 0;
}

// Duplicate - commented out (already declared at line 84)
// export const vector_clock_set_source = (source: SourceID, value: number, vector_clock: VectorClock) => {
//     vector_clock.set(source, value);
//     return vector_clock;
// }

export const version_vector_forward = (version_vector: VectorClock, source: SourceID) => {
    const new_version_vector = new Map(version_vector);
    vector_clock_set_source(
        source,
        clock_increment(vector_clock_get_source(source, version_vector)), 
        new_version_vector
    )
  
    return new_version_vector;
}

// export const compare_two_clock = (a: number | string, b: number | string) => {
//     if  (is_constant_clock(a) && is_constant_clock(b)) {
//         return 0;
//     }
//     else if (is_constant_clock(a)) {
//         return -1;
//     }
//     else if (is_constant_clock(b)) {
//         return 1;
//     }
//     else {
//         if (a > b) {
//             return 1;
//         }
//         else if (a < b) {
//             return -1;
//         }
//         else {
//             return 0;
//         }
//     }
// }

// Duplicate - commented out (already declared at line 127)
// export const clock_greater_than = (a: Clock, b: Clock) => {
//     return compare_two_clock(a, b) > 0;
// }

// Duplicate - commented out (already declared at line 131)
// export const clock_less_than = (a: Clock, b: Clock) => {
//     return compare_two_clock(a, b) < 0;
// }

// Duplicate - commented out (already declared at line 135)
// export const clock_equal = (a: Clock, b: Clock) => {
//     return compare_two_clock(a, b) === 0;
// }

export const max_clock = (a: Clock, b: Clock) => {
    return compare_two_clock(a, b) > 0 ? a : b;
}

export const clock_for_each = (vector_clock: VectorClock, f: (source: SourceID, clock: Clock) => void) => {
    vector_clock.forEach((value, source) => {
        f(source, value as Clock);
    });
}


export const compare_two_clock = (a: number | string, b: number | string) => {
    if  (is_constant_clock(a) && is_constant_clock(b)) {
        return 0;
    }
    else if (is_constant_clock(a)) {
        return -1;
    }
    else if (is_constant_clock(b)) {
        return 1;
    }
    else {
        // @ts-ignore
        if (a > b) return 1;
        // @ts-ignore
        if (a < b) return -1;
        return 0;
    }
}

// export const max_clock = (a: Clock, b: Clock) => {
//     return compare_two_clock(a, b) > 0 ? a : b;
// }

const version_vector_merge = (version_vector1: any, version_vector2: any) => {
    // @ts-ignore
    if (is_constant_clock(version_vector1)) {
        return version_vector2;
    }
    // @ts-ignore
    else if (is_constant_clock(version_vector2)) {
        return version_vector1;
    }
    
    const new_version_vector = new Map(version_vector1);

    // @ts-ignore
    if (is_constant_clock(version_vector1)) {
        return version_vector2;
    }
    // @ts-ignore
    else if (is_constant_clock(version_vector2)) {
        return version_vector1;
    }
   

    version_vector2.forEach((value, source) => {

    vector_clock_set_source(
        source,
        // @ts-ignore
        max_clock(
            vector_clock_get_source(source, new_version_vector) as Clock, value as Clock
        ),
        new_version_vector
    )

    });
    return new_version_vector;
}




const version_clock_fresher = -1 

const version_clock_staled = 1;

const version_clock_equal = 0;

const is_version_clock_fresher = (result: number) => {
    return result === -1;
} 

const is_version_clock_staled = (result: number) => {
    return result === 1;
}

const is_version_clock_concurrent = (result: number) => {
    return result === 0;
}

const version_clock_result_contrary = (a: number, b: number) => {
    return (a == -1 && b == 1) || (a == 1 && b == -1);

}


const version_vector_strict_compare = (version_vector1: any, version_vector2: any) => {
   // @ts-ignore
    if (is_constant_clock(version_vector1) || is_constant_clock(version_vector2)) {
        return 0;
    }
    // @ts-ignore


    else {
        // Collect all unique keys from both vectors
        const all_keys = new Set([...version_vector1.keys(), ...version_vector2.keys()]);
        
        let v1_has_greater = false;
        let v2_has_greater = false;

        for (const key of all_keys) {
            // Get values, defaulting to 0 if missing
            const val1 = vector_clock_get_source(key, version_vector1) as Clock;
            const val2 = vector_clock_get_source(key, version_vector2) as Clock;

            if (clock_greater_than(val1, val2)) {
                v1_has_greater = true;
            } else if (clock_greater_than(val2, val1)) {
                v2_has_greater = true;
            }

            // If we find evidence that v1 > v2 AND v2 > v1 in different channels,
            // they are concurrent. Return equal (as per your comment).
            if (v1_has_greater && v2_has_greater) {
                return version_clock_equal;
            }
        }

        // If v1 strictly dominates v2
        if (v1_has_greater) return version_clock_staled;
        
        // If v2 strictly dominates v1
        if (v2_has_greater) return version_clock_fresher;
        
        // They are identical
        return version_clock_equal;
    }
}


export const vector_clock_less_than = (version_vector1: any, version_vector2: any) => {
    return version_vector_strict_compare(version_vector1, version_vector2) < 0;
}

export const vector_clock_greater_than = (version_vector1: any, version_vector2: any) => {
    return version_vector_strict_compare(version_vector1, version_vector2) > 0;
}

export const vector_clock_equal = (version_vector1: any, version_vector2: any) => {
    return version_vector_strict_compare(version_vector1, version_vector2) === 0;
}

// const version_vector_compare = (version_vector1: VectorClock , version_vector2: VectorClock) => {
//     const keys = new Set([...version_vector1.keys(), ...version_vector2.keys()]);

//     for (const key of keys) {
//         const value1 = guarantee_missed_channel_synchronized(key, 0)(version_vector1, version_vector2);
//         const value2 = guarantee_missed_channel_synchronized(key, 0)(version_vector2, version_vector1);
//         if (value1 < value2) {
//             return version_clock_fresher;
//         }
//         else if (value1 > value2) {
//             return version_clock_staled;
//         }
//     }
//     return version_clock_equal;
// }

const to_victor_clock  = (a: any) => {
    if (is_vector_clock(a)) {
        return a
    }
    else {
        return new Map();
    }
}

export const generic_version_vector_clock_compare = generic_wrapper(
    version_vector_strict_compare,
    (a: any) => a,
    to_victor_clock,
    to_victor_clock
)


export const generic_version_clock_less_than = generic_wrapper(
    version_vector_strict_compare,
    is_version_clock_fresher,
    to_victor_clock,
    to_victor_clock
)

export const generic_version_clock_concurrent = generic_wrapper(
    version_vector_strict_compare,
    is_version_clock_concurrent,
    to_victor_clock,
    to_victor_clock
)

export const generic_version_clock_greater_than = generic_wrapper(
    version_vector_strict_compare,
    is_version_clock_staled,
    to_victor_clock,
    to_victor_clock
)

export const result_is_less_than = is_version_clock_fresher
export const result_is_greater_than = is_version_clock_staled;
export const result_is_equal = is_version_clock_concurrent;


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



export const vector_clock_layer = make_annotation_layer<VectorClock, any>("vector_clock", 
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


export const layered_vector_clock_forward = (channel: string, obj: LayeredObject<any>) => {
    const proc = make_layered_procedure("layered_vector_clock_forward", 1, (base: any) => {
        return base
    })

    define_layered_procedure_handler(proc, vector_clock_layer, (o: any, ...values: VectorClock[]) => {
        return version_vector_forward(
            values.reduce((acc, value) => version_vector_merge(acc, value), new Map()), 
            channel
        );
    })

    return proc(obj);
}

export const inject_value = (value: any) => make_layered_procedure("inject_value", 1, (base: any) => {
    return value;
})


export const vector_clocked_value_update = (obj: LayeredObject<any>, value: any, channel: string) => {
   return pipe(obj,
        inject_value(value),
        (obj: LayeredObject<any>) => {
            return layered_vector_clock_forward(channel, obj);
        }
    )
}


export const _has_vector_clock_layer = (a: any) => {
    return a && vector_clock_layer.has_value(a);
}

export const has_vector_clock_layer = register_predicate("has_victor_clock_layer", (a: any) => {
    const result = is_layered_object(a) && _has_vector_clock_layer(a);
    return result;
})


export const is_reactive_value = has_vector_clock_layer

export const any_victor_clock_out_of_sync = (as: LayeredObject<any>[] | any[]) => {
  
     const vector_clocks =  pipe(
        as,
        A.map(vector_clock_layer.get_value), 
     )

     var last_vector_clock = vector_clocks[0];

     for (const vector_clock of vector_clocks.slice(1)) {
        if (version_vector_strict_compare(last_vector_clock, vector_clock) !== 0) {
            return true;
        }
        last_vector_clock = vector_clock;
     }
     return false
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
    const result = any_victor_clock_out_of_sync(as) || as.some(compose(get_base_value, is_unusable_value))
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

export const prove_staled_by = (a: Map<any, any>, b: Map<any, any>) => {
    const va = to_victor_clock(a);
    const vb = to_victor_clock(b);

    const compared = version_vector_strict_compare(va, vb);

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


export const generic_prove_staled_by = (a: LayeredObject<any>, b: LayeredObject<any>) => {
    return prove_staled_by(vector_clock_layer.get_value(a), vector_clock_layer.get_value(b))
}


export const proved_staled_with = curryArgument(
    1, 
    generic_wrapper(
        prove_staled_by, 
        (a: boolean) => a,
        vector_clock_layer.get_value,
        (a: VectorClock) => a
    )
)

// export const is_reactive_value = register_predicate("is_reactive_value", (value: any) => {
//     return is_layered_object(value) && has_vector_clock_layer(value);
// });

// export const generic_prove_staled_by = proved_staled_with;


export const get_clock_channels = (vector_clock: VectorClock) => {
    if (is_constant_clock(vector_clock)) {
        return [];
    }
    else {
        return Array.from(vector_clock.keys());
    }
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


define_generic_procedure_handler(is_equal, match_args(is_vector_clock, is_vector_clock),  vector_clock_equal)