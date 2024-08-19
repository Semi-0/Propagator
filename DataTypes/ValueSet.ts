// -*- TypeScript -*-

import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";


import { get_cell_value, is_nothing, type CellValue } from "../Cell/CellValue";
import { all_match, match_args } from "generic-handler/Predicates";
import { is_unusable_value, merge_layered, value_imples } from "../PublicState";
import { map } from "fp-ts/Array";
import { BetterSet, construct_better_set, is_better_set } from "generic-handler/built_in_generics/generic_better_set";
import { merge } from "../Cell/Merge";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { get_base_value  } from "sando-layer/Specified/BaseLayer";
import { is_layered_object, LayeredObject } from "sando-layer/Basic/LayeredObject";
import { define_generic_procedure_handler as define_layer_operation_handler } from "sando-layer/node_modules/generic-handler/GenericProcedure";
import { add, subtract } from "generic-handler/built_in_generics/generic_arithmetic"
import { is_atom } from "generic-handler/built_in_generics/generic_predicates";
import { less_than_or_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { reduce, filter, is_array } from "generic-handler/built_in_generics/generic_array";
import { isArrowFunction } from "typescript";
import { all_premises_in, is_all_premises_in } from "./Premises";
import { inspect } from "bun";
import { guard } from "generic-handler/built_in_generics/other_generic_helper";


export class ValueSet {
    elements: BetterSet<CellValue>;

    constructor(elements: BetterSet<CellValue>) {
        console.log("CONSTRUCTING VALUE SET" + inspect(elements))
        this.elements = elements
    }
}


export const construct_value_set = construct_simple_generic_procedure("construct_value_set", 
    1,
    (elements: BetterSet<CellValue>) => {
        guard(is_better_set(elements), () => {throw new Error("elements must be a better set")})
        return new ValueSet(elements)}
)

define_generic_procedure_handler(construct_value_set,
    match_args(is_array),
    (elements: CellValue[]) => {return construct_value_set(construct_better_set(elements, to_string))}
)



define_generic_procedure_handler(is_atom,
    match_args(is_layered_object),
    (elt: LayeredObject) => {return is_atom(get_base_value(elt))}
)

define_generic_procedure_handler(is_atom,
    match_args(is_value_set),
    (elt: ValueSet) => {return false}
)

define_generic_procedure_handler(add,
    all_match(is_value_set),
    (a: ValueSet, b: ValueSet) => {
        return construct_value_set(add(a.elements, b.elements))}

)

define_generic_procedure_handler(add,
    match_args(is_value_set, is_atom),
    (set: ValueSet, elt: LayeredObject) => {
        return construct_value_set(add(set.elements, elt))
    }
)

define_generic_procedure_handler(subtract,
    all_match(is_value_set),
    (a: ValueSet, b: ValueSet) => construct_value_set(subtract(a.elements, b.elements))
)

define_generic_procedure_handler(reduce,
    match_args(is_value_set, isArrowFunction, is_value_set),
    (set: ValueSet, procedure: (a: any, b: any) => any, initial: ValueSet) => reduce(set.elements, procedure, initial)
)

function any(predicate: (a: any) => boolean, set: ValueSet): boolean {
    // THIS SHOULD BE MORE GENERIC
    return set.elements.find(predicate) !== undefined
}

function is_value_set(value: any): value is ValueSet {

  return value instanceof ValueSet;
}

function is_layered_value_set(value: any): value is ValueSet{
    return is_layered_object(value) && is_value_set(get_base_value(value))
}



function to_value_set(value: any): ValueSet {
  return is_value_set(value) ? value : construct_value_set(value);
}


define_layer_operation_handler(get_base_value,
    match_args(is_value_set),
    (set: ValueSet) => get_base_value(strongest_consequence(set)))


define_generic_procedure_handler(is_unusable_value,
    match_args(is_value_set),
    (set: ValueSet) => is_unusable_value(strongest_consequence(set)))


function map_value_set(procedure: (a: any) => any, ...sets: ValueSet[]): ValueSet {
    return sets.reduce((acc, set) => add(acc, set.elements.map(procedure)), construct_value_set([]));
}

function merge_value_sets(content: ValueSet, increment: LayeredObject): ValueSet {
    return is_nothing(increment) ? to_value_set(content) : value_set_adjoin(to_value_set(content), increment);
}


define_generic_procedure_handler(merge,
    match_args(is_value_set, is_layered_object),
    (set: ValueSet, elt: LayeredObject) => merge_value_sets(set, elt)
)

function value_set_adjoin(set: ValueSet, elt: LayeredObject): ValueSet {
    if(any(oldElt => element_subsumes(oldElt, elt), set)) {
        return set;
    }
    else{
        return add(set, elt);
    }
}

function element_subsumes(elt1: LayeredObject, elt2: LayeredObject): boolean {
    return (
        value_imples(get_base_value(elt1), get_base_value(elt2)) &&
        less_than_or_equal(get_support_layer_value(elt1), get_support_layer_value(elt2))
    );
}


function strongest_consequence(set: ValueSet): CellValue{
    return reduce(filter((elt: LayeredObject) => 
                        // @ts-ignore
                        is_all_premises_in(get_support_layer_value(elt)), 
                            set.elements), 
                         (acc: LayeredObject, item: LayeredObject) => merge_layered(acc, item), 
                         construct_value_set([]));
}

 



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