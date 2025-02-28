import { construct_advice } from "generic-handler/built_in_generics/generic_advice";
import type { ReadOnlyReactor } from "../../Shared/Reactivity/Reactor";
import { filter } from "../../Shared/Reactivity/Reactor";
import { is_fresh } from "./Predicates";

export const reactive_propagator_behavior = construct_advice(
    [
        (reactor: ReadOnlyReactor<any>) => {
 
            return filter(is_fresh)(reactor)
        },
        (a: any) => a
    ],
    (r: ReadOnlyReactor<any>) => r
)
