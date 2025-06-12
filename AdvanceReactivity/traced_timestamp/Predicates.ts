import { match_args, register_predicate } from "generic-handler/Predicates";
import { is_better_set, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { is_nothing } from "@/cell/CellValue";
import { is_array } from "generic-handler/built_in_generics/generic_predicates";
import { type traced_timestamp } from "./type";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { every } from "generic-handler/built_in_generics/generic_collection";

export const is_timestamp_set = register_predicate("is_timestamp_set", (a: any) => is_better_set(a) && every(a, is_traced_timestamp))

export const is_traced_timestamp = register_predicate("is_traced_timestamp", (a: any): a is traced_timestamp => {
    return typeof a === "object" && a !== null && "id" in a && "timestamp" in a && "fresh" in a;
})

export const is_fresh = register_predicate("is_fresh", (a: any) => _is_fresh(a))

export const _is_fresh = construct_simple_generic_procedure("is_fresh", 1, (a: any) => false)

define_generic_procedure_handler(_is_fresh, match_args(is_nothing),
    (a: any) => {
        return false;
    }
)

define_generic_procedure_handler(_is_fresh, match_args(is_traced_timestamp),
    (timestamp: traced_timestamp) => {
        return timestamp.fresh;
    }
)

define_generic_procedure_handler(_is_fresh, match_args(is_timestamp_set),
    (timestamp_set: BetterSet<traced_timestamp>) => {
        return every(timestamp_set, _is_fresh);
    }
)



define_generic_procedure_handler(_is_fresh, match_args(is_array),
    (array: any[]) => {
        return array.every((a: any) => _is_fresh(a));
    }
)

