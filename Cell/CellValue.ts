import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure"
import { is_equal } from "../PublicState"
import { match_args, register_predicate } from "generic-handler/Predicates"
import { to_string } from "generic-handler/built_in_generics/generic_conversation"
import { is_string } from "generic-handler/built_in_generics/generic_predicates"
import { guard } from "generic-handler/built_in_generics/other_generic_helper"
import { inspect } from "bun"
import { is_array } from "generic-handler/built_in_generics/generic_predicates"





// i think this type is unnecessary

// TODO: remove it
// export var CellValue = ["cell_value", []]

// export type CellValue = any[]

// define_generic_procedure_handler(to_string,
//     match_args(is_cell_value),
//     (value: CellValue) => {
//         const result = get_cell_value(value)
//         return is_string(result) ? result : to_string(result)
//     }
// )

// export function is_cell_value(value: any): boolean {
//     return typeof value === "object" && value[0] === "cell_value"
// } 

// export function construct_cell_value(value: any): any[] {
//     return ["cell_value", [value]]
// }

// export function get_cell_value(value: any): any {
//     return value[1][0]
// }

export const the_nothing = "&&the_nothing&&"

export const is_nothing = register_predicate("is_nothing", (value: any) => {
    return value === the_nothing
})


export const the_contradiction = "&&the_contradiction&&" 

export const is_contradiction = register_predicate("is_contradiction", (value: any) => {
    return value === the_contradiction
})









