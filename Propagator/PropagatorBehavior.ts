import { Reactive } from "../Shared/Reactivity/ReactiveEngine";
import { install_advice } from "generic-handler/built_in_generics/generic_advice";
import type { ReadOnly } from "../Shared/Reactivity/ReactiveEngine";
import { is_no_compute } from "../Helper/noCompute";

// perhaps it is better to extend behavior?
// but how?

export function default_behavior<T>(src: ReadOnly<T>, f: (...values: any[]) => any): ReadOnly<any> {
    return Reactive.pipe(
        src,
        Reactive.map((values: any) => f(...values)),
        Reactive.filter((values: any) => !is_no_compute(values))
    );
}

var primitive_propagator_behavior = default_behavior;

export function return_default_behavior() {
    primitive_propagator_behavior = default_behavior;
}

export function install_behavior_advice(advice: any[]) {
    primitive_propagator_behavior = install_advice(advice, primitive_propagator_behavior);
}

export function get_primtive_propagator_behavior() {
    return primitive_propagator_behavior;
}