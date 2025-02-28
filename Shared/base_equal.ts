import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import {  is_any } from "generic-handler/built_in_generics/generic_predicates";
import { get_base_value } from "sando-layer/Basic/Layer";
import { match_args, all_match } from "generic-handler/Predicates";
import { is_layered_object } from "../Helper/Predicate";
export const base_equal = construct_simple_generic_procedure("shallow_equal", 2,
    (a: any, b: any) => {
        return a === b;
    }
)


define_generic_procedure_handler(base_equal,
    match_args(is_layered_object, is_any),
    (a: any, b: any) => {
        return base_equal(get_base_value(a), b);
    })

define_generic_procedure_handler(base_equal,
    all_match(is_layered_object),
    (a: any, b: any) => {
        return base_equal(get_base_value(a), get_base_value(b));
    }
)