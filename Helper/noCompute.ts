import { throw_error } from "generic-handler/built_in_generics/other_generic_helper";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args, register_predicate } from "generic-handler/Predicates";
import { get_base_value } from "sando-layer/Basic/Layer";
import { type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { is_layered_object } from "./Predicate";

export const no_compute = "no_compute"

export type NoCompute = typeof no_compute;

export const _is_no_compute = register_predicate("_is_no_compute", (a: any) => a === no_compute);

export const is_no_compute = construct_simple_generic_procedure("is_no_compute", 1, (a: any) => false);

define_generic_procedure_handler(is_no_compute, match_args(is_layered_object), (a: LayeredObject) => is_no_compute(get_base_value(a)));

define_generic_procedure_handler(is_no_compute, match_args(_is_no_compute), (a: NoCompute) => true);