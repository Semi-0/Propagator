import { pipe } from "fp-ts/lib/function";
import type { ReadOnlyReactor } from "../Shared/Reactivity/Reactor";
import { combine_latest, map, filter } from "../Shared/Reactivity/Reactor";
import { is_no_compute } from "../Helper/noCompute";
import type { Reactor } from "../Shared/Reactivity/Reactor";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { install_advice } from "generic-handler/built_in_generics/generic_advice"
// perhaps it is better to extend behavior?
// but how?

export function default_behavior(reactor: ReadOnlyReactor<any>, f: (...values: any[]) => any): Reactor<any>{
    return pipe(reactor,
        map(values => f(...values)),
        filter(values => !is_no_compute(values))
    )
}

var primitive_propagator_behavior = default_behavior;

export function return_default_behavior(){
    primitive_propagator_behavior = default_behavior;
}

export function install_behavior_advice(advice: any[]){
    primitive_propagator_behavior = install_advice(advice, primitive_propagator_behavior);
}

export function get_primtive_propagator_behavior(): (reactor: ReadOnlyReactor<any>, f: (...values: any[]) => any) => Reactor<any>{
    return (reactor: ReadOnlyReactor<any>, f: (...values: any[]) => any) =>
         primitive_propagator_behavior(reactor, f);
}