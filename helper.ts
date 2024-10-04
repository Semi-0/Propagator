import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure"
import { match_args } from "generic-handler/Predicates"
import { is_array, is_function } from "generic-handler/built_in_generics/generic_predicates"
import { guard, throw_error, throw_type_mismatch } from "generic-handler/built_in_generics/other_generic_helper"
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set"
import { is_better_set, reduce } from "generic-handler/built_in_generics/generic_better_set"
import { for_each as for_each_set } from "generic-handler/built_in_generics/generic_better_set"
export const for_each = construct_simple_generic_procedure("for_each", 2,
    (array: any[], procedure: (a: any) => any) => {
        guard(is_array(array), throw_type_mismatch("for_each", "array", typeof array))
        for (const element of array) {
            procedure(element)
        }
    }
)

define_generic_procedure_handler(for_each,
match_args(is_better_set, is_function),
(set: BetterSet<any>, procedure: (a: any) => any) => {
    for_each_set(set, procedure)
})


export const second = construct_simple_generic_procedure("second", 1, (array: any[]) => {
    guard(array.length > 2, throw_error("second", "array length mismatch, expect 2", typeof array))
    return array[1]
})

export const identify_strint_set = (set: BetterSet<string>) =>  reduce(set, (acc, value) => acc + value, "")