import { define_generic_procedure_handler } from "generic-handler/GenericProcedure"
import { is_equal } from "../PublicState"
import { match_args } from "generic-handler/Predicates"
import { to_string } from "generic-handler/built_in_generics/generic_conversation"
import { is_string } from "generic-handler/built_in_generics/generic_predicates"
export var CellValue = ["cell_value", []]

export type CellValue = any[]

define_generic_procedure_handler(to_string,
    match_args(is_cell_value),
    (value: CellValue) => {
        const result = get_cell_value(value)
        return is_string(result) ? result : to_string(result)
    }
)

export function is_cell_value(value: any): boolean {
    return typeof value === "object" && value[0] === "cell_value"
} 

export function construct_cell_value(value: any): any[] {
    return ["cell_value", [value]]
}

export function get_cell_value(value: any): any {
    return value[1][0]
}

export const the_nothing = construct_cell_value("&&the_nothing&&")

export function is_nothing(value: any): boolean {
    return is_cell_value(value) && get_cell_value(value) === "&&the_nothing&&"
} 

export const the_contradiction = construct_cell_value("&&the_contradiction&&") 

export function is_contradiction(value: any): boolean {
    return is_cell_value(value) && get_cell_value(value) === "&&the_contradiction&&"
}








