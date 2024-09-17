import { match_args, register_predicate } from "generic-handler/Predicates"
import { is_layered_object } from "../temp_predicates"
import { get_base_value } from "./GenericArith"


export const the_nothing = "&&the_nothing&&"

export const is_nothing = register_predicate("is_nothing", (value: any) => {
    if (is_layered_object(value)) {
        return get_base_value(value) === the_nothing
    }
    return value === the_nothing
})


export const the_contradiction = "&&the_contradiction&&" 

export const is_contradiction = register_predicate("is_contradiction", (value: any) => {
    if (is_layered_object(value)) {
        return get_base_value(value) === the_contradiction
    }
    return value === the_contradiction
})









