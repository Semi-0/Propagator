// import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
// import { ValueSet } from "./ValueSet";
// import { match_args } from "generic-handler/Predicates";
import { add as _add, subtract as _subtract, multiply as _multiply, divide as _divide, less_than as _less_than,  greater_than as _greater_than, is_equal as _is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { base_equal as _equal } from "../../Shared/base_equal";
import { all_match, match_args, one_of_args_match, register_predicate } from "generic-handler/Predicates";
import { get_base_value, is_contradiction, is_nothing, the_contradiction, the_nothing } from "../../Cell/CellValue";
import {  make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { is_layered_object  as _is_layered_object} from "sando-layer/Basic/LayeredObject";
import { is_any } from "generic-handler/built_in_generics/generic_predicates";


const is_layered_object = register_predicate("is_layered_object", _is_layered_object)

const _and = construct_simple_generic_procedure("and", 2, (a: any, b: any) => a && b)
const _or = construct_simple_generic_procedure("or", 2, (a: any, b: any) => a || b)
const _not = construct_simple_generic_procedure("not", 1, (x: any) => !x)


export const define_nothing_arithmetic_handler = (op: any) => define_generic_procedure_handler(op, 
    one_of_args_match(is_nothing), 
    (a: any, b: any) => {
            return the_nothing
    })

define_nothing_arithmetic_handler(_add)
define_nothing_arithmetic_handler(_subtract)
define_nothing_arithmetic_handler(_multiply)
define_nothing_arithmetic_handler(_divide)
define_nothing_arithmetic_handler(_less_than)
define_nothing_arithmetic_handler(_equal)
define_nothing_arithmetic_handler(_and)
define_nothing_arithmetic_handler(_or)

export const define_contradiction_arithmetic_handler = (op: any) => define_generic_procedure_handler(op, 
    one_of_args_match(is_contradiction),
    (a: any, b: any) => {
        return the_contradiction
    }
)
define_contradiction_arithmetic_handler(_add)
define_contradiction_arithmetic_handler(_subtract)
define_contradiction_arithmetic_handler(_multiply)
define_contradiction_arithmetic_handler(_divide)
define_contradiction_arithmetic_handler(_less_than)
define_contradiction_arithmetic_handler(_equal)
define_contradiction_arithmetic_handler(_and)
define_contradiction_arithmetic_handler(_or)


export const layered_add = make_layered_procedure("layered_add", 2, (x: any, y: any) =>{  return _add(x, y)})
export const layered_subtract = make_layered_procedure("layered_subtract", 2, (x: any, y: any) => _subtract(x, y))
export const layered_multiply = make_layered_procedure("layered_multiply", 2, (x: any, y: any) =>{ return _multiply(x, y)})
export const layered_divide = make_layered_procedure("layered_divide", 2, (x: any, y: any) => _divide(x, y))
export const layered_not = make_layered_procedure("layered_not", 1, (x: any) => !x)
export const layered_less_than = make_layered_procedure("layered_less_than", 2, (x: any, y: any) => x < y)
export const layered_equal = make_layered_procedure("layered_equal", 2, (x: any, y: any) => x === y)

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

define_generic_procedure_handler(_not,
    all_match(is_layered_object),
    (a: any) => {
        return layered_not(a)
    }
)

define_generic_procedure_handler(_less_than,
    all_match(is_layered_object),
    (a: any, b: any) => {
        return layered_less_than(a, b)
    }
)

define_generic_procedure_handler(_equal,
    all_match(is_layered_object),
    (a: any, b: any) => {
        return layered_equal(a, b)
    }
)

export const add = _add
export const subtract = _subtract
export const multiply = _multiply
export const divide = _divide
export const not = _not
export const less_than = _less_than
export const equal = _equal

export const force_load_arithmetic = () => {
    
}
