// generalize vector clock to support value


// -*- TypeScript -*-

import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args, register_predicate } from "generic-handler/Predicates";
import { type BetterSet, construct_better_set, is_better_set,  is_subset_of,  set_remove } from "generic-handler/built_in_generics/generic_better_set";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { type LayeredObject } from "sando-layer/Basic/LayeredObject";
import {  is_equal, less_than_or_equal } from "generic-handler/built_in_generics/generic_arithmetic"
import {  is_array, } from "generic-handler/built_in_generics/generic_predicates";

import { get_support_layer_value, support_layer } from "sando-layer/Specified/SupportLayer";
import { is_premises_in, is_premises_out } from "./Premises";
import { get_base_value, the_nothing, is_nothing, is_unusable_value, value_imples, is_contradiction } from "../Cell/CellValue";
import { map, filter, reduce, add_item, find, flat_map, for_each, has, remove_item, length, every, some } from "generic-handler/built_in_generics/generic_collection";
import { strongest_value } from "../Cell/StrongestValue";
import { pipe } from 'fp-ts/function';
import { merge_layered, partial_merge } from "../Cell/Merge";
import { get_base_value as layered_get_base_value } from "sando-layer/Basic/Layer";
import { less_than } from "generic-handler/built_in_generics/generic_arithmetic";
import { compose, curryArgument } from "generic-handler/built_in_generics/generic_combinator.ts";
import { generic_wrapper } from "generic-handler/built_in_generics/generic_wrapper.ts";
import { subsumes } from "./GenericValueSet";
import { clock_channels_subsume, get_clock_channels, get_vector_clock_layer, has_vector_clock_layer, prove_staled_by } from "../AdvanceReactivity/vector_clock";
import { log_tracer } from "generic-handler/built_in_generics/generic_debugger";
import { generic_merge } from "../Cell/Merge";

// ValueSet class definition
// we can register the source of vector clock as premises

type TemporaryValueSet<A> = BetterSet<A>;

export function substitute<A>(set: TemporaryValueSet<A>, old_elt: A, new_elt: A): TemporaryValueSet<A> {
    return has(set, old_elt) ? add_item(remove_item(set, old_elt), new_elt) : set;
}


// Predicates and handlers
const is_temporary_value_set = register_predicate("is_temporary_value_set", (value: any) =>  is_better_set(value));




// const update = (set: TemporaryValueSet<any>, element: LayeredObject<any>) => {
    // find in the old set if there is any value that prove the old one to be updated 
    // but what if existed value carries multiple sources?
    // one sources might be outdated but other mighe be not
    // so the update should only dispose the info that is totally not relevant anymore
    // so there are two different cases
    // 1.1 if the new element from totally cover the old one
    // means old one have the identital source with the new one 
    // and new one is more fresh
    // then old one is not needed anymore

    // 1.2. if the new element is partially covered the old one
    // then it would have two condition
    // 1.2.1 if there the content already contains all other info from the same identical source
    // 1.2.1.1 if all of them is more up to date than the old one
    // then the old one is not needed anymore
    // 1.2.2 if not
    // then both old one and new one are needed

    // 2.1 if the new value have the same value as the old one
    // but old one have fewer premises
    // 2.1.1 the new one is more update to date
    // then dispose the old one
    // 2.1. the new one is not more update to date
    // then keep the old one

// }





const update = (current_set: BetterSet<LayeredObject<any>>, new_element: LayeredObject<any>) => {
    // 1. Filter out any existing elements that are now "obsolete" (subsumed) by the new one
    //    (This handles your cases 1.1, 1.2.1, 2.1)
    const filtered_set = filter(current_set, (existing: LayeredObject<any>) => !vector_clock_prove_staled_by(existing, new_element));

    // 2. Check if the new element is already "known/obsolete" (subsumed) by anything remaining
    //    (This handles your case 2.1.2)
    const is_redundant = some(filtered_set, (existing: LayeredObject<any>) => element_subsumes(existing, new_element));

    // 3. If it adds new info, keep it
    return is_redundant ? filtered_set : add_item(filtered_set, new_element);
}


export const value_set_adjoin = update  




export const is_legit_value_set_element = (element: any) => !is_nothing(element) && element !== undefined

// ValueSet construction
export const construct_temporary_value_set  = (elements: any) => {
    if (is_array(elements)){
        return construct_better_set(elements)
    }
    else{
        return construct_better_set([elements])
    }
}


function to_temporary_value_set<A>(value: any): TemporaryValueSet<A> {
    return is_temporary_value_set(value) ? value : construct_temporary_value_set(value);
}
export const tvs_is_premises_in = compose(
    get_vector_clock_layer, 
    get_clock_channels, 
    is_premises_in
)

export const tvs_is_premises_out = compose(
    get_vector_clock_layer,
    get_clock_channels,
    is_premises_out
)

// when value is retracted they do not disappear
// but they went weaker
export const tvs_strongest_consequence = (content: TemporaryValueSet<any>) => reduce(
    content,
    (a: LayeredObject<any>, b: LayeredObject<any>) => {
        if (is_nothing(a)) {
            return b;
        }
        else if (is_nothing(b)) {
            return a;
        }
        else if (tvs_is_premises_in(a) && tvs_is_premises_out(b)) {
            return a;
        }
        else if (tvs_is_premises_in(b) && tvs_is_premises_out(a)) {
            return b;
        }
        else {
            // this gets very redundent
            // it can get better if we use pattern matching
            return partial_merge(a, b);
        }
    },
    the_nothing
)

// ValueSet handlers
define_generic_procedure_handler(get_base_value,
    match_args(is_temporary_value_set),
    (set: TemporaryValueSet<any>) => get_base_value(strongest_consequence(set))
);

define_generic_procedure_handler(is_unusable_value,
    match_args(is_temporary_value_set),
    (set: TemporaryValueSet<any>) => is_unusable_value(strongest_consequence(set))
);

define_generic_procedure_handler(strongest_value,
    match_args(is_temporary_value_set),
    tvs_strongest_consequence
)

// ValueSet operations

// define_generic_procedure_handler(generic_merge, match_args(is_value_set, is_any), merge_value_sets)

export function merge_temporary_value_set(content: TemporaryValueSet<any>, increment: LayeredObject<any>): TemporaryValueSet<any> {
    if (has_vector_clock_layer(increment)){
        return is_nothing(increment) ? to_temporary_value_set(content) : value_set_adjoin(to_temporary_value_set(content), increment);
    }
    else if (is_temporary_value_set(content)){
        return generic_merge(content, increment);
    }
    else{
        return merge_layered(content, increment);
    }
}





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


export const vector_clock_prove_staled_by = generic_wrapper(
    prove_staled_by,
    (x) => x,
    get_vector_clock_layer,
    get_vector_clock_layer
)

export const vector_clock_subsumes = generic_wrapper(
    (a, b) => prove_staled_by(b, a),
    (x) => x,
    get_vector_clock_layer,
    get_vector_clock_layer
)


export const source_less_than_or_equal = generic_wrapper(
    clock_channels_subsume,
    (x) => x,
    get_vector_clock_layer,
    get_vector_clock_layer
)

export function element_subsumes<A>(elt1: LayeredObject<A>, elt2: LayeredObject<A>): boolean {

    if (vector_clock_subsumes(elt1, elt2)) {
        return true
    }
    else if (base_value_implies(elt1, elt2) && source_less_than_or_equal(elt1, elt2)) {
        return true
    }
    else {
        return false
    }
}



export function strongest_consequence<A>(set: any): A {
    return pipe(
        set,
        (elements) => filter(elements, tvs_is_premises_in),
        (filtered) => reduce(
            filtered,
            merge_layered,
            the_nothing,
        )
    );
}
