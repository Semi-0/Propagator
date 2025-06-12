// -*- TypeScript -*-

import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args, register_predicate } from "generic-handler/Predicates";
import { type BetterSet, construct_better_set, is_better_set,  set_remove } from "generic-handler/built_in_generics/generic_better_set";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { is_layered_object } from "../Helper/Predicate";
import { add, divide, is_equal, multiply, subtract } from "generic-handler/built_in_generics/generic_arithmetic"
import { is_atom, is_function, is_array, is_any } from "generic-handler/built_in_generics/generic_predicates";
import { less_than_or_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { is_premises_in } from "./Premises";
import { get_base_value, the_nothing, is_nothing, is_unusable_value, value_imples } from "../Cell/CellValue";
import { map, filter, reduce, add_item, find, flat_map, for_each, has, remove_item } from "generic-handler/built_in_generics/generic_collection";
import { strongest_value } from "../Cell/StrongestValue";
import { pipe } from 'fp-ts/function';
import { generic_merge, merge_layered } from "../Cell/Merge";
import { guard } from "generic-handler/built_in_generics/other_generic_helper";
import {trace_func} from "../helper.ts";
import { less_than } from "generic-handler/built_in_generics/generic_arithmetic";
import { compose } from "generic-handler/built_in_generics/generic_combinator.ts";
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



function value_set_adjoin<LayeredObject>(set: ValueSet<LayeredObject>, elt: LayeredObject): ValueSet<LayeredObject> {
    // TODO: SUBSTITUTE ELEMENT MIGHT NOT WORK HERE!!!
    // @ts-ignore
    const existed = has(set, elt);
    if (existed){
        const existed_elt = find(set, (a: LayeredObject) => get_base_value(a) === get_base_value(elt));
        // @ts-ignore
        if (element_subsumes(elt, existed_elt)){
            return set;
        } else {
            return substitute(set, existed_elt, elt);
        }
    } else {
        const result = add_item(set, elt);
        return result;
    }


}

export function element_subsumes<A>(elt1: LayeredObject<A>, elt2: LayeredObject<A>): boolean {
    return (
        value_imples(get_base_value(elt1), get_base_value(elt2)) &&
        (less_than(get_support_layer_value(elt1), get_support_layer_value(elt2)) || 
        is_equal(get_support_layer_value(elt1), get_support_layer_value(elt2)))
    );
}

function strongest_consequence<A>(set: ValueSet<A>): A {
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
