// -*- TypeScript -*-

import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args, register_predicate } from "generic-handler/Predicates";
import { type BetterSet, construct_better_set, is_better_set,  set_remove } from "generic-handler/built_in_generics/generic_better_set";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { type LayeredObject } from "sando-layer/Basic/LayeredObject";
import {  is_equal } from "generic-handler/built_in_generics/generic_arithmetic"
import {  is_array, } from "generic-handler/built_in_generics/generic_predicates";

import { get_support_layer_value, support_layer } from "sando-layer/Specified/SupportLayer";
import { is_premises_in } from "./Premises";
import { get_base_value, the_nothing, is_nothing, is_unusable_value, value_imples } from "../Cell/CellValue";
import { map, filter, reduce, add_item, find, flat_map, for_each, has, remove_item, length } from "generic-handler/built_in_generics/generic_collection";
import { strongest_value } from "../Cell/StrongestValue";
import { pipe } from 'fp-ts/function';
import { merge_layered } from "../Cell/Merge";

import { less_than } from "generic-handler/built_in_generics/generic_arithmetic";
import { compose, curryArgument } from "generic-handler/built_in_generics/generic_combinator.ts";
import { generic_wrapper } from "generic-handler/built_in_generics/generic_wrapper.ts";
// ValueSet class definition

type ValueSet<A> = BetterSet<A>;

export function substitute<A>(set: ValueSet<A>, old_elt: A, new_elt: A): ValueSet<A> {
    return has(set, old_elt) ? add_item(remove_item(set, old_elt), new_elt) : set;
}


// Predicates and handlers
const is_value_set = register_predicate("is_value_set", (value: any) => is_better_set(value));

define_generic_procedure_handler(to_string,
    match_args(is_value_set),
    (set: ValueSet<any>) => set.toString()
);

export const value_set_adjoin = (set: ValueSet<any>, element: any) => {
   const existed = find(set, (e: any) => get_base_value(e) === get_base_value(element))
   if (existed){
     if (element_subsumes(existed, element)){
        return set
     }
     else{
        return add_item(remove_item(set, existed), element)
     }
   }
   else{
    return add_item(set, element)
   }
}




export const is_legit_value_set_element = (element: any) => !is_nothing(element) && element !== undefined

// ValueSet construction
export const construct_value_set  = (elements: any) => {
    if (is_array(elements)){
        return construct_better_set(filter(elements, is_legit_value_set_element))
    }
    else{
        return construct_better_set([elements])
    }
}


function to_value_set<A>(value: any): ValueSet<A> {
    return is_value_set(value) ? value : construct_value_set(value);
}

// ValueSet handlers
define_generic_procedure_handler(get_base_value,
    match_args(is_value_set),
    (set: ValueSet<any>) => get_base_value(strongest_consequence(set))
);

define_generic_procedure_handler(is_unusable_value,
    match_args(is_value_set),
    (set: ValueSet<any>) => is_unusable_value(strongest_consequence(set))
);

define_generic_procedure_handler(strongest_value,
    match_args(is_value_set),
    strongest_consequence)

// ValueSet operations

// define_generic_procedure_handler(generic_merge, match_args(is_value_set, is_any), merge_value_sets)

export function merge_value_sets<LayeredObject>(content: ValueSet<LayeredObject>, increment: LayeredObject): ValueSet<LayeredObject> {
    return is_nothing(increment) ? to_value_set(content) : value_set_adjoin(to_value_set(content), increment);
}


export const get_support_layer_set_length : (value: LayeredObject<any>) => number = compose(get_support_layer_value, length)



export const supported_value_less_than = generic_wrapper(
    less_than,
    (a: any) => a,
    get_support_layer_set_length,
    get_support_layer_set_length
)

export const supported_value_equal = generic_wrapper(
    is_equal,
    (a: any) => a,
    get_support_layer_set_length,
    get_support_layer_set_length
)

export const base_value_implies = generic_wrapper(
    value_imples,
    (a: any) => a,
    get_base_value,
    get_base_value
)

// this could be more generic
// still we need a more generic layer to handle this situation
// a parrelle computing procedure and deciding how to merge the results at end
// ironically this might be best solve by propagators

export function element_subsumes<A>(elt1: LayeredObject<A>, elt2: LayeredObject<A>): boolean {
    return (
        base_value_implies(elt1, elt2) &&
        (supported_value_less_than(elt1, elt2) || 
        supported_value_equal(elt1, elt2))
    );
}



export function strongest_consequence<A>(set: any): A {
    return pipe(
        set,
        (elements) => filter(elements, compose(get_support_layer_value, is_premises_in)),
        (filtered) => reduce(
            filtered,
            merge_layered,
            the_nothing,
        )
    );
}
