// import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
// import { ValueSet } from "./ValueSet";
// import { match_args } from "generic-handler/Predicates";
import { add as _add, subtract as _subtract, multiply as _multiply, divide as _divide } from "generic-handler/built_in_generics/generic_arithmetic";
import {  construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import {  one_of_args_match } from "generic-handler/Predicates";
import { is_contradiction, is_nothing, the_contradiction, the_nothing, force_load_CellValue } from "./CellValue";
import {  make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { is_layered_object, type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { get_base_value  as get_base_value_layer} from "sando-layer/Basic/Layer";
import { guard, throw_error } from "generic-handler/built_in_generics/other_generic_helper";
import { inspect } from "bun";


force_load_CellValue()




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

export const add = make_layered_procedure("add", 2, (x: any, y: any) =>{  return _add(x, y)})
export const subtract = make_layered_procedure("subtract", 2, (x: any, y: any) => _subtract(x, y))
export const multiply = make_layered_procedure("multiply", 2, (x: any, y: any) =>{ return _multiply(x, y)})

export const divide = make_layered_procedure("divide", 2, (x: any, y: any) => _divide(x, y))

