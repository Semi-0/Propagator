// -*- TypeScript -*-

import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";


import { all_match, force_load_predicate, match_args, register_predicate } from "generic-handler/Predicates";
import { is_unusable_value, merge_layered, value_imples } from "../PublicState";
import { add_item, type BetterSet, construct_better_set, find, flat_map, is_better_set, map_to_same_set, remove, to_array } from "generic-handler/built_in_generics/generic_better_set";
import { merge } from "../Cell/Merge";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { is_layered_object } from "../temp_predicates";
import { add, divide, multiply, subtract } from "generic-handler/built_in_generics/generic_arithmetic"
import { force_load_generic_predicates, is_atom, is_function } from "generic-handler/built_in_generics/generic_predicates";
import { less_than_or_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { is_array } from "generic-handler/built_in_generics/generic_predicates";
import { is_all_premises_in } from "./Premises";
import { guard } from "generic-handler/built_in_generics/other_generic_helper";
import { get_base_value } from "../Cell/CellValue";
import { is_nothing } from "../Cell/CellValue";
import { map, filter, reduce } from "generic-handler/built_in_generics/generic_array_operation"
import { number } from "fp-ts";



export class ValueSet<A> {
    elements: BetterSet<A>;

    constructor(elements: BetterSet<A>) {
        this.elements = elements
    }

    add_item(item: A): ValueSet<A> {
        return new ValueSet<A>(add_item(this.elements, item))
    }

    to_array(): A[] {
        return to_array(this.elements)
    }

}




const is_value_set = register_predicate("is_value_set", (value: any) => value instanceof ValueSet)

define_generic_procedure_handler(map,
    match_args(is_value_set, is_function),
    (set: ValueSet<any>, procedure: (a: any) => any) => {
        return new ValueSet(map(procedure, set.elements))
    }
)

define_generic_procedure_handler(filter,
    match_args(is_value_set, is_function),
    (set: ValueSet<any>, predicate: (a: any) => boolean) => {
        return new ValueSet(filter(predicate, set.elements))
    }
)

define_generic_procedure_handler(reduce,
    match_args(is_value_set, is_function, is_function),
    (set: ValueSet<any>, procedure: (a: any) => any, initial: any) => {
        return reduce(set.elements, procedure, initial)
    }
)

export const construct_value_set = construct_simple_generic_procedure("construct_value_set", 
    1,
    (elements: BetterSet<any>) => {
        guard(is_better_set(elements), () => {throw new Error("elements must be a better set")})
        return new ValueSet(elements)}
)

define_generic_procedure_handler(construct_value_set,
    match_args(is_array),
    (elements: any[]) => {return construct_value_set(construct_better_set(elements, to_string))}
)





function any<A>(predicate: (a: A) => boolean, set: ValueSet<A>): boolean {
    // THIS SHOULD BE MORE GENERIC
    return find(set.elements, predicate) !== undefined
}


function is_layered_value_set<A>(value: any): value is ValueSet<A>{
    return is_layered_object(value) && is_value_set(get_base_value(value))
}



function to_value_set<A>(value: any): ValueSet<A> {
  return is_value_set(value) ? value : construct_value_set(value);
}


define_generic_procedure_handler(get_base_value,
    match_args(is_value_set),
    (set: ValueSet<any>) => get_base_value(strongest_consequence(set)))


define_generic_procedure_handler(is_unusable_value,
    match_args(is_value_set),
    (set: ValueSet<any>) => is_unusable_value(strongest_consequence(set)))



function merge_value_sets<LayeredObject>(content: ValueSet<LayeredObject>, increment: LayeredObject): ValueSet<LayeredObject> {
    return is_nothing(increment) ? to_value_set(content) : value_set_adjoin(to_value_set(content), increment);
}


define_generic_procedure_handler(merge,
    match_args(is_value_set, is_layered_object),
    (set: ValueSet<any>, elt: LayeredObject) => merge_value_sets(set, elt)
)

function value_set_adjoin<LayeredObject>(set: ValueSet<LayeredObject>, elt: LayeredObject): ValueSet<LayeredObject> {
    return set.add_item(elt)
}

function element_subsumes(elt1: LayeredObject, elt2: LayeredObject): boolean {
    return (
        value_imples(get_base_value(elt1), get_base_value(elt2)) &&
        less_than_or_equal(get_support_layer_value(elt1), get_support_layer_value(elt2))
    );
}


function strongest_consequence<A>(set: ValueSet<A>): A{
    return reduce(filter((elt: LayeredObject) => 
                        // @ts-ignore
                        is_all_premises_in(get_support_layer_value(elt)), 
                            set.elements), 
                         (acc: LayeredObject, item: LayeredObject) => merge_layered(acc, item), 
                         construct_value_set([]));
}

import { pipe } from 'fp-ts/function';


function cross_join_map<A>(procedure: (elt_a: A, b: ValueSet<A>) => ValueSet<A>) : (a: ValueSet<A>, b: ValueSet<A>) => ValueSet<A> {
    return (a: ValueSet<A>, b: ValueSet<A>) => 
        pipe(
            a.elements,
            (a: BetterSet<A>) => {
                return flat_map(a, (elt_a: A) => procedure(elt_a, b).elements, a.identify_by)
            },
            construct_value_set
        );
}

function value_set_arithmetic<A>(procedure: (elt_a: A, elt_b: A) => A) : (a: ValueSet<A>, b: ValueSet<A>) => ValueSet<A> {
    return cross_join_map((elt_a: A, b: ValueSet<A>) => 
        pipe(
            b.elements,
            (b: BetterSet<A>) => map_to_same_set(b, (elt_b: A) => {
                return procedure(elt_a, elt_b)
            }),
            construct_value_set
        )
    );
}

// ValueSet Arithmetic
define_generic_procedure_handler(add,
    match_args(is_value_set, is_value_set),
    value_set_arithmetic(add)
)
 
define_generic_procedure_handler(subtract,
    match_args(is_value_set, is_value_set),
    value_set_arithmetic(subtract)
) 

define_generic_procedure_handler(multiply,
    match_args(is_value_set, is_value_set),
    value_set_arithmetic(multiply)
)

define_generic_procedure_handler(divide,
    match_args(is_value_set, is_value_set),
    value_set_arithmetic(divide)
)


// define_generic_procedure_handler(
//   'getBaseValue',
//   match_args(isValueSet),
//   (set: ValueSet) => getBaseValue(strongestConsequence(set))
// );

// define_generic_procedure_handler(
//   'unusableValue',
//   match_args(isValueSet),
//   (set: ValueSet) => unusableValue(strongestConsequence(set))
// );

// define_generic_procedure_handler(
//   'strongestValue',
//   match_args(isValueSet),
//   (set: ValueSet) => strongestConsequence(set)
// );

// function mapValueSet(procedure: Function, ...sets: ValueSet[]): ValueSet {
//   return makeValueSet(map(procedure, ...sets.map(set => set.elements)));
// }

// function mergeValueSets(content: any, increment: any): ValueSet {
//   return nothing(increment) ? toValueSet(content) : valueSetAdjoin(toValueSet(content), increment);
// }

// function valueSetAdjoin(set: ValueSet, elt: any): ValueSet {
//   if (any(oldElt => elementSubsumes(oldElt, elt), set.elements)) {
//     return set;
//   }
//   return makeValueSet(
//     lsetAdjoin(
//       equivalent,
//       remove(oldElt => elementSubsumes(elt, oldElt), set.elements),
//       elt
//     )
//   );
// }

// function elementSubsumes(elt1: any, elt2: any): boolean {
//   return (
//     valueImplies(baseLayerValue(elt1), baseLayerValue(elt2)) &&
//     supportSetLessThanOrEqual(supportLayerValue(elt1), supportLayerValue(elt2))
//   );
// }

// function strongestConsequence(set: ValueSet): any {
//   return reduce(
//     theNothing,
//     (content, increment) => mergeLayered(content, increment),
//     filter(elt => allPremisesIn(supportLayerValue(elt)), set.elements)
//   );
// }