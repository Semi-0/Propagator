import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure"
import { is_array, is_function } from "generic-handler/built_in_generics/generic_predicates"
import { guard, throw_error, throw_type_mismatch } from "generic-handler/built_in_generics/other_generic_helper"
import { first as _first } from "generic-handler/built_in_generics/generic_array_operation"
import { is_better_set, set_find, set_for_each, set_get_length, to_array, type BetterSet } from "generic-handler/built_in_generics/generic_better_set"
import { match_args } from "generic-handler/Predicates"



export function reference_store(){
    var reference = 0;

    return () =>{
        let r = reference;
        reference += 1;
        return r;
    }
}

export let get_new_reference_count = reference_store()

export const for_each = construct_simple_generic_procedure("for_each", 2,
    (array: any[], procedure: (a: any) => any) => {
        guard(is_array(array), throw_type_mismatch("for_each", "array", typeof array))
        for (const element of array) {
            procedure(element)
        }
    }
)



// // better way is to use layered equal
// export function layered_is_true(value: any): boolean {
//     return (is_layered_object(value) && get_base_value(value) === true) || value === true
// }

export function set_any(predicate: (a: any) => boolean, set: BetterSet<any>): any{
    return set_find(predicate, set)
}



define_generic_procedure_handler(for_each,
match_args(is_better_set, is_function),
(set: BetterSet<any>, procedure: (a: any) => any) => {
    set_for_each(procedure, set)
})

export const first = _first

export const second = construct_simple_generic_procedure("second", 1, (array: any[]) => {
    guard(array.length > 2, throw_error("second", "array length mismatch, expect 2", typeof array))
    return array[1]
})



define_generic_procedure_handler(first, match_args(is_better_set), (set: BetterSet<any>) => {
    guard(set_get_length(set) > 0, throw_error("first", "set is empty", typeof set))
    return to_array(set)[0]
})

define_generic_procedure_handler(second, match_args(is_better_set), (set: BetterSet<any>) => {
    guard(set_get_length(set) > 1, throw_error("second", "set length mismatch, expect 2", typeof set))
    return to_array(set)[1]
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

