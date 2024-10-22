// -*- TypeScript -*-

import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args, register_predicate } from "generic-handler/Predicates";
import { set_add_item, type BetterSet, construct_better_set, set_find, set_flat_map, set_for_each, set_has, is_better_set,  set_remove, set_every, set_some, to_array, set_map, set_smaller_than, set_equal, BetterSetImpl, set_filter } from "generic-handler/built_in_generics/generic_better_set";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { is_layered_object } from "../temp_predicates";
import { add, divide, is_equal, multiply, subtract } from "generic-handler/built_in_generics/generic_arithmetic"
import { is_atom, is_function, is_array, is_any } from "generic-handler/built_in_generics/generic_predicates";
import { less_than_or_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { is_premises_in } from "./Premises";
import { get_base_value, the_nothing, is_nothing, is_unusable_value, value_imples } from "../Cell/CellValue";
import { map, filter, reduce } from "generic-handler/built_in_generics/generic_array_operation"
import { strongest_value } from "../Cell/StrongestValue";
import { pipe } from 'fp-ts/function';
import { generic_merge, merge_layered } from "../Cell/Merge";
import { guard } from "generic-handler/built_in_generics/other_generic_helper";
import { inspect } from "bun";
// ValueSet class definition
export class ValueSet<A> {
    elements: BetterSet<A>;

    constructor(elements: BetterSet<A>) {
        this.elements = elements;
    }

    add_item(item: A): ValueSet<A> {
        return construct_value_set(set_add_item(this.elements, item));
    }

    to_array(): A[] {
        return to_array(this.elements);
    }

    toString(): string {
        return `ValueSet: ${to_string(this.elements)})`;
    }
}

export function value_set_find_existed<A>(set: ValueSet<A>, elt: A): A | undefined {
    return set_find((e: A) => get_base_value(e) === get_base_value(elt), set.elements);
}

export function value_set_has<A>(set: ValueSet<A>, elt: A): boolean {
    return value_set_find_existed(set, elt) !== undefined;
}

export function value_set_remove<A>(set: ValueSet<A>, elt: A): ValueSet<A> {
    return construct_value_set(set_remove(set.elements, elt));
} 

export function value_set_add<A>(set: ValueSet<A>, elt: A): ValueSet<A> {
    return construct_value_set(set_add_item(set.elements, elt));
} 

export function value_set_substitute<A>(set: ValueSet<A>, old_elt: A, new_elt: A): ValueSet<A> {
    return value_set_has(set, old_elt) ? value_set_add(value_set_remove(set, old_elt), new_elt) : set;
}


// Predicates and handlers
const is_value_set = register_predicate("is_value_set", (value: any) => value instanceof ValueSet);

define_generic_procedure_handler(to_string,
    match_args(is_layered_object),
    (value: LayeredObject) => value.describe_self()
);

define_generic_procedure_handler(to_string,
    match_args(is_better_set),
    (set: BetterSet<any>) => {
     
        const meta_data = set.meta_data;
        const keys = Array.from(meta_data.keys());
        const values = keys.map(key => to_string(meta_data.get(key))).join(", ");

        return `[${values}]`;
    }
);



define_generic_procedure_handler(to_string,
    match_args(is_value_set),
    (set: ValueSet<any>) => set.toString()
);

// ValueSet operations
define_generic_procedure_handler(map,
    match_args(is_value_set, is_function),
    (set: ValueSet<any>, procedure: (a: any) => any) => {
        return new ValueSet(map(set.elements, procedure));
    }
);

define_generic_procedure_handler(filter,
    match_args(is_value_set, is_function),
    (set: ValueSet<any>, predicate: (a: any) => boolean) => {
        return new ValueSet(filter(set.elements, predicate));
    }
);

define_generic_procedure_handler(reduce,
    match_args(is_value_set, is_function, is_function),
    (set: ValueSet<any>, procedure: (a: any) => any, initial: any) => {
        return reduce(set.elements, procedure, initial);
    }
);

// ValueSet construction
export const construct_value_set = construct_simple_generic_procedure("construct_value_set", 
    1,
    (elements: any) => {
        throw new Error("unimplemented: " + elements);
    }
);

define_generic_procedure_handler(construct_value_set,
    match_args(is_array),
    (elements: any[]) => {return construct_value_set(construct_better_set(elements.filter(e => e !== undefined && !is_nothing(e)), to_string));}
);

define_generic_procedure_handler(construct_value_set,
    match_args(is_atom),
    (element: any) => {
        if (is_nothing(element)){
            return construct_value_set([]);
        } else {
            return construct_value_set([element]);
        }
    }
);

define_generic_procedure_handler(construct_value_set,
    match_args(is_better_set),
    (set: BetterSet<any>) => {
        return new ValueSet(set_filter(set, (elt: any) => !is_nothing(elt)));
    }
);


export function value_set_length<A>(set: ValueSet<A>): number {
    guard(is_value_set(set), () => {
        throw new Error("Expected a ValueSet, got: " + set);
    });
    return set.elements.meta_data.size;
}
// ValueSet utilities
export function value_set_equals<A>(set1: ValueSet<A>, set2: ValueSet<A>): boolean {
    return set_every(set1.elements, (elt: A) => set_has(set2.elements, elt)) && set_every(set2.elements, (elt: A) => set_has(set1.elements, elt));
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
    (set: ValueSet<any>) => {
        // console.log("strongest_consequence", strongest_consequence(set))
        return strongest_consequence(set)}
);

// ValueSet operations

// define_generic_procedure_handler(generic_merge, match_args(is_value_set, is_any), merge_value_sets)

export function merge_value_sets<LayeredObject>(content: ValueSet<LayeredObject>, increment: LayeredObject): ValueSet<LayeredObject> {
    return is_nothing(increment) ? to_value_set(content) : value_set_adjoin(to_value_set(content), increment);
}



function value_set_adjoin<LayeredObject>(set: ValueSet<LayeredObject>, elt: LayeredObject): ValueSet<LayeredObject> {
    // TODO: SUBSTITUTE ELEMENT MIGHT NOT WORK HERE!!!
    // @ts-ignore
    const existed_elt = value_set_find_existed(set, elt);
    if (existed_elt){
        // @ts-ignore
        if (element_subsumes(elt, existed_elt)){
            return set;
        } else {
            return value_set_substitute(set, existed_elt, elt);
        }
    } else {
        const result = value_set_add(set, elt);
        return result;
    }


}

export function element_subsumes(elt1: LayeredObject, elt2: LayeredObject): boolean {
    return (
        value_imples(get_base_value(elt1), get_base_value(elt2)) &&
        (set_smaller_than(get_support_layer_value(elt1), get_support_layer_value(elt2)) || 
        set_equal(get_support_layer_value(elt1), get_support_layer_value(elt2)))
    );
}

function strongest_consequence<A>(set: ValueSet<A>): A {
    return pipe(
        set.elements,
        (elements) => filter(elements, (elt: LayeredObject) => {
            return is_premises_in(get_support_layer_value(elt))
        }),
        (filtered) => reduce(
            filtered,
            (acc: LayeredObject, item: LayeredObject) => {

                return merge_layered(acc, item)},
            the_nothing,
        )
    );
}

// ValueSet arithmetic
function cross_join_map<A>(procedure: (elt_a: A, b: ValueSet<A>) => ValueSet<A>) : (a: ValueSet<A>, b: ValueSet<A>) => ValueSet<A> {
    return (a: ValueSet<A>, b: ValueSet<A>) => 
        pipe(
            a.elements,
            (a: BetterSet<A>) => {
                return set_flat_map(a, (elt_a: A) => procedure(elt_a, b).elements);
            },
            construct_value_set
        );
}

function value_set_arithmetic<A>(procedure: (elt_a: A, elt_b: A) => A) : (a: ValueSet<A>, b: ValueSet<A>) => ValueSet<A> {
    return cross_join_map((elt_a: A, b: ValueSet<A>) => 
        pipe(
            b.elements,
            (b: BetterSet<A>) => set_map(b, (elt_b: A) => {
                return procedure(elt_a, elt_b);
            }),
            construct_value_set
        )
    );
}

define_generic_procedure_handler(add,
    match_args(is_value_set, is_value_set),
    value_set_arithmetic(add)
);
 
define_generic_procedure_handler(subtract,
    match_args(is_value_set, is_value_set),
    value_set_arithmetic(subtract)
); 

define_generic_procedure_handler(multiply,
    match_args(is_value_set, is_value_set),
    value_set_arithmetic(multiply)
);

define_generic_procedure_handler(divide,
    match_args(is_value_set, is_value_set),
    value_set_arithmetic(divide)
);