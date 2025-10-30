import { construct_simple_generic_procedure, define_generic_procedure_handler, error_generic_procedure_handler } from "generic-handler/GenericProcedure"
import { is_array, is_function, is_number } from "generic-handler/built_in_generics/generic_predicates"
import { guard, throw_error, throw_type_mismatch } from "generic-handler/built_in_generics/other_generic_helper"
import { first as _first, find, for_each, length, to_array} from "generic-handler/built_in_generics/generic_collection"
import { is_better_set, type BetterSet } from "generic-handler/built_in_generics/generic_better_set"
import { match_args } from "generic-handler/Predicates"
import { to_string } from "generic-handler/built_in_generics/generic_conversation"
import { curryArgument } from "generic-handler/built_in_generics/generic_combinator"
import { filter, map } from "generic-handler/built_in_generics/generic_collection"
import { register_predicate } from "generic-handler/Predicates"

export const is_map = register_predicate("is_map", (c: any) => c instanceof Map) 

define_generic_procedure_handler(to_string, match_args(is_map), (map: Map<any, any>) => {
    return "Map(" + Array.from(map.entries()).map(([key, value]) => key + ": " + to_string(value)).join(", ") + ")"
})



define_generic_procedure_handler(to_string, match_args(is_number), (number: number) => {
    return number.toString()
})

export function reference_store(){
    var reference = 0;

    return () =>{
        let r = reference;
        reference += 1;
        return r;
    }
}

export let get_new_reference_count = reference_store()

define_generic_procedure_handler(to_array,
    match_args(is_map),
    (map: Map<any, any>) => {
        return Array.from(map.values())
    }
)

define_generic_procedure_handler(
    filter,
    match_args(is_map),
    (
        map: Map<any, any>,
        predicate: (value: any) => boolean
    ) => {
        const filteredEntries = Array.from(map.entries()).filter(
            ([key, value]) => predicate(value)
        );
        return new Map(filteredEntries);
    }
);

define_generic_procedure_handler(
    map,
    match_args(is_map),
    (
        map: Map<any, any>,
        mapper: (value: any) => any
    ) => {
        const mappedEntries = Array.from(map.entries()).map(
            ([key, value]) => [key, mapper(value)] as [any, any]
        );
        return new Map(mappedEntries as [any, any][]);
    }
);

export const curried_filter = curryArgument(1, filter)

export const curried_map = curryArgument(1, map)

export const curried_for_each = curryArgument(1, for_each)

// // better way is to use layered equal
// export function layered_is_true(value: any): boolean {
//     return (is_layered_object(value) && get_base_value(value) === true) || value === true
// }
export function construct_empty_generic_procedure(name: string, arity: number){
    return construct_simple_generic_procedure(name, arity, (...args: any[]) => {
        throw_error(name, "no handler found for this procedure", to_string(args))
    })
}


export const second = construct_simple_generic_procedure("second", 1, (array: any[]) => {
    guard(array.length > 1, throw_error("second", "array length mismatch, expect 2", typeof array))
    return array[1]
}) 


define_generic_procedure_handler(second,
    match_args(is_better_set),
    (set: BetterSet<any>) => {
        guard(length(set) > 1, throw_error("second", "set length mismatch, expect 2", typeof set))
        return second(to_array(set))
    }
)


define_generic_procedure_handler(to_string, match_args(is_map), (map: Map<any, any>) => {
    return `Map(${Array.from(map.entries()).map(([key, value]) => `${key}: ${to_string(value)}`).join(", ")})`
})

// // check if the object has circular dependency 

// export function hasCircularDependency(obj: any)
// {
//     try
//     {
//         JSON.stringify(obj);
//     }
//     catch(e)
//     {
//         // @ts-ignore
//         return e.includes("Converting circular structure to JSON"); 
//     }
//     return false;
// }


// export function construct_multi_dimensional_set(data: any[]): BetterSet<any>{
//     return construct_better_set(data.map(item => 
//         Array.isArray(item) ? construct_multi_dimensional_set(item) : item
//     ), to_string);
// }


// // TODO: UNIT TEST FOR HANDLING MULTI DIMENSIONAL STRING SET
// export function flat_map<A,B>(mapper: (value: A) => BetterSet<B>, set: BetterSet<A>): BetterSet<B> {
//     var result = construct_better_set([], JSON.stringify)
    
//     function flatten(innerSet: BetterSet<A | B>) {
//         for (const value of innerSet.meta_data.values()) {
//             if (is_better_set(value)) {
//                 // @ts-ignore
//                 flatten(value as BetterSet<B>);
//             } else {
              
//                 result = add_item(result, value)
//             }
//         }
//     }

//     const mappedSet = map(mapper, set);
//     flatten(mappedSet);

//     return result
// }

// export const map = (f: (item: any) => any, set: BetterSet<any>) => {
//     return map_to_new_set(set, f, JSON.stringify)
// }


// export const union = (set1: any, set2: any) => {
//     return merge_set(construct_better_set([set1], JSON.stringify), construct_better_set([set2], JSON.stringify))
// }


// export const reduce_right = <T, R>(f: (acc: R, value: T) => R, set: BetterSet<T>, initial: R): BetterSet<R> => {
//     const values = to_array(set);
//     let result = initial;
    
//     for (let i = get_length(set) - 1; i >= 0; i--) {
//         result = f(result, get_value(set, i));
//     }
    
//     return construct_better_set([result], JSON.stringify);
// };

