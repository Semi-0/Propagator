import {  register_predicate } from "generic-handler/Predicates"
import { is_layered_object } from "../Helper/Predicate"
import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure"
import { type LayeredObject } from "sando-layer/Basic/LayeredObject"
import { get_base_value  as get_base_value_layer} from "sando-layer/Basic/Layer";

export const is_unusable_value = construct_simple_generic_procedure("is_unusable_value", 1,
    (value: any) => {
        return false;
    }
)

export const value_imples = construct_simple_generic_procedure("value_imples", 2,
    (a: any, b: any) => {
        return a === b;
    }
)

export const get_base_value = construct_simple_generic_procedure("get_base_value", 1, (a: LayeredObject<any>) => {
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

export const is_layered_contradiction = register_predicate("is_layered_contradiction", (value: any) => {
    if (is_layered_object(value)) {
        return get_base_value(value) === the_contradiction
    }
    return is_contradiction(value)
})

export const the_disposed = "&&the_disposed&&"

export const is_disposed = register_predicate("is_disposed", (value: any) => {
    if (is_layered_object(value)) {
        return get_base_value(value) === the_disposed
    }
    return value === the_disposed
})

export const is_not_contradiction = (a: LayeredObject<any>) => {
    return !is_contradiction(a)
}

export function force_load_CellValue(){
//   console.log
}

export type CellValue<A> = A | typeof the_nothing | typeof the_contradiction | typeof the_disposed


