// import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
// import { ValueSet } from "./ValueSet";
// import { match_args } from "generic-handler/Predicates";
import { add, subtract, multiply, divide } from "generic-handler/built_in_generics/generic_arithmetic";
import { construct_generic_procedure, construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args, one_of_args_match } from "generic-handler/Predicates";
import { is_contradiction, is_nothing, the_contradiction, the_nothing } from "./CellValue";
import { define_layered_procedure_handler } from "sando-layer/Basic/LayeredProcedure";
import { summary_all_rules } from "generic-handler/GenericDebugger";
import { is_layered_object, type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { get_base_value  as get_base_value_layer} from "sando-layer/Basic/Layer";
import { guard, throw_error } from "generic-handler/built_in_generics/other_generic_helper";
import { inspect } from "bun";

export const get_base_value = construct_simple_generic_procedure("get_base_value", 1, (a: LayeredObject) => {
    guard(is_layered_object(a), throw_error("get_base_value", "argument is not a layered object", inspect(a)))
    return get_base_value_layer(a)
})


define_generic_procedure_handler(add,
    one_of_args_match(is_nothing),
    (a: any, b: any) => {
        return the_nothing
    }
)

define_generic_procedure_handler(subtract,
    one_of_args_match(is_nothing),
    (a: any, b: any) => {
        return the_nothing
    }
) 

define_generic_procedure_handler(multiply,
    one_of_args_match(is_nothing),
    (a: any, b: any) => {

        return the_nothing
    }
)

define_generic_procedure_handler(divide,
    one_of_args_match(is_nothing),
    (a: any, b: any) => {
        return the_nothing
    }
) 

define_generic_procedure_handler(add,
    match_args(is_contradiction, () => true),
        (a: any, b: any) => {
            return the_contradiction
    }
)

define_generic_procedure_handler(subtract,
    match_args(is_contradiction, () => true),
        (a: any, b: any) => {
            return the_contradiction
    }
) 

define_generic_procedure_handler(multiply,
    match_args(is_contradiction, () => true),
        (a: any, b: any) => {
            return the_contradiction
    }
)

define_generic_procedure_handler(divide,
    match_args(is_contradiction, () => true),
        (a: any, b: any) => {
            return the_contradiction
    }
)

export function force(){
    summary_all_rules(add)
    console.log("ëxecuted")

}