import {  register_predicate } from "generic-handler/Predicates"
import { is_layered_object } from "../temp_predicates"
import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure"
import { guard, throw_error } from "generic-handler/built_in_generics/other_generic_helper"
import { inspect } from "bun"
import { type LayeredObject } from "sando-layer/Basic/LayeredObject"
import { get_base_value  as get_base_value_layer} from "sando-layer/Basic/Layer";

export const get_base_value = construct_simple_generic_procedure("get_base_value", 1, (a: LayeredObject) => {
    if (is_layered_object(a)){
        return get_base_value_layer(a)
    }
    else{
        return a
    }
})

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


export function force_load_CellValue(){
  
}






