import { construct_advice } from "generic-handler/built_in_generics/generic_advice";
import { Reactive } from "../../Shared/Reactivity/ReactiveEngine";
import type { ReadOnly } from "../../Shared/Reactivity/ReactiveEngine";
import { is_fresh } from "./Predicates";

export const reactive_propagator_behavior = construct_advice(
    [
        (node: ReadOnly<any>) => Reactive.filter(is_fresh)(node),
        (node: ReadOnly<any>) => node
    ],
    (node: ReadOnly<any>) => node
)
