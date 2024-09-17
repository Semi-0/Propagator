import { match_args, register_predicate } from "generic-handler/Predicates"





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









