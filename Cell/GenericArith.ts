// import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
// import { ValueSet } from "./ValueSet";
// import { match_args } from "generic-handler/Predicates";
import { add as _add, subtract as _subtract, multiply as _multiply, divide as _divide } from "generic-handler/built_in_generics/generic_arithmetic";
import { all_match, one_of_args_match } from "generic-handler/Predicates";
import { is_contradiction, is_nothing, the_contradiction, the_nothing, force_load_CellValue } from "./CellValue";
import {  make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { is_layered_object } from "sando-layer/Basic/LayeredObject";
import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure"; 
import { merge } from "./Merge";

force_load_CellValue()

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

export const merge_layered = make_layered_procedure("merge_layered", 2, merge)




define_generic_procedure_handler(_add,
    one_of_args_match(is_nothing),
    (a: any, b: any) => {
        return the_nothing
    }
)

define_generic_procedure_handler(_subtract,
    one_of_args_match(is_nothing),
    (a: any, b: any) => {
        return the_nothing
    }
) 

define_generic_procedure_handler(_multiply,
    one_of_args_match(is_nothing),
    (a: any, b: any) => {

        return the_nothing
    }
)

define_generic_procedure_handler(_divide,
    one_of_args_match(is_nothing),
    (a: any, b: any) => {
        return the_nothing
    }
) 

define_generic_procedure_handler(_add,
    one_of_args_match(is_contradiction),

        (a: any, b: any) => {
            return the_contradiction
    }
)

define_generic_procedure_handler(_subtract,
    one_of_args_match(is_contradiction),
        (a: any, b: any) => {
            return the_contradiction
    }
) 

define_generic_procedure_handler(_multiply,
    one_of_args_match(is_contradiction),
        (a: any, b: any) => {
            return the_contradiction
    }
)

define_generic_procedure_handler(_divide,
    one_of_args_match(is_contradiction),
        (a: any, b: any) => {
            return the_contradiction
    }
)

export function force_load_arithmatic(){
}

export const layered_add = make_layered_procedure("layered_add", 2, (x: any, y: any) =>{  return _add(x, y)})
export const layered_subtract = make_layered_procedure("layered_subtract", 2, (x: any, y: any) => _subtract(x, y))
export const layered_multiply = make_layered_procedure("layered_multiply", 2, (x: any, y: any) =>{ return _multiply(x, y)})

export const layered_divide = make_layered_procedure("layered_divide", 2, (x: any, y: any) => _divide(x, y))

define_generic_procedure_handler(_add,
    all_match(is_layered_object),
    (a: any, b: any) => {
        return layered_add(a, b)
    }
)

define_generic_procedure_handler(_subtract,
    all_match(is_layered_object),
    (a: any, b: any) => {
        return layered_subtract(a, b)
    }
)


define_generic_procedure_handler(_multiply,
    all_match(is_layered_object),
    (a: any, b: any) => {
        return layered_multiply(a, b)
    }
)

define_generic_procedure_handler(_divide,
    all_match(is_layered_object),
    (a: any, b: any) => {
        return layered_divide(a, b)
    }
)

export const add = _add
export const subtract = _subtract
export const multiply = _multiply
export const divide = _divide

