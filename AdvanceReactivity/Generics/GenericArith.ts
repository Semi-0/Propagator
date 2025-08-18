// import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
// import { ValueSet } from "./ValueSet";
// import { match_args } from "generic-handler/Predicates";
import { 
    add as _add, 
    subtract as _subtract, 
    multiply as _multiply, 
    divide as _divide, 
    less_than as _less_than,  
    greater_than as _greater_than, 
    is_equal as _is_equal 
} from "generic-handler/built_in_generics/generic_arithmetic";
import { base_equal as _equal } from "../../Shared/base_equal";
import { all_match, match_args, one_of_args_match, register_predicate } from "generic-handler/Predicates";
import { get_base_value, is_contradiction, is_nothing, the_contradiction, the_nothing } from "../../Cell/CellValue";
import {  make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { is_layered_object  as _is_layered_object} from "sando-layer/Basic/LayeredObject";
import { is_any } from "generic-handler/built_in_generics/generic_predicates";
import { no_compute } from "../../Helper/noCompute";



const _and = construct_simple_generic_procedure("and", 2, (a: any, b: any) => a && b)
const _or = construct_simple_generic_procedure("or", 2, (a: any, b: any) => a || b)
const _not = construct_simple_generic_procedure("not", 1, (x: any) => !x)

export const extend_nothing_arithmetic_handler = (op: any) => define_generic_procedure_handler(op, 
    one_of_args_match(is_nothing), 
    (a: any, b: any) => {
            return no_compute 
    })



export const extend_contradiction_arithmetic_handler = (op: any) => define_generic_procedure_handler(op, 
    one_of_args_match(is_contradiction),
    (a: any, b: any) => {
        return the_contradiction
    }
)

export const extend_propagator_arithmetic_pack = (name: string, arity: number, op: (a: any, b: any) => any) => {
   extend_nothing_arithmetic_handler(op)
   extend_contradiction_arithmetic_handler(op)
   return make_layered_procedure(name, arity, op)
}

export const install_propagator_arith_pack = (name: string, arity: number, op: any) => {
    const generic_op = construct_simple_generic_procedure(name, arity, op)
    return extend_propagator_arithmetic_pack(name, arity, generic_op)
}

export const add = extend_propagator_arithmetic_pack("add", 2, _add)
export const subtract = extend_propagator_arithmetic_pack("subtract", 2, _subtract)
export const multiply = extend_propagator_arithmetic_pack("multiply", 2, _multiply)
export const divide = extend_propagator_arithmetic_pack("divide", 2, _divide)
export const not = extend_propagator_arithmetic_pack("not", 1, _not)
export const less_than = extend_propagator_arithmetic_pack("less_than", 2, _less_than)
export const equal = extend_propagator_arithmetic_pack("equal", 2, _equal)
export const and = extend_propagator_arithmetic_pack("and", 2, _and)
export const or = extend_propagator_arithmetic_pack("or", 2, _or)
export const greater_than = extend_propagator_arithmetic_pack("greater_than", 2, _greater_than)
export const feedback = install_propagator_arith_pack("feedback", 1, (input: any) => {return input;})


export const force_load_arithmetic = () => {
    
}
