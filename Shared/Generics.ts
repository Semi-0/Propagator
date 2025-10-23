import { for_each } from "generic-handler/built_in_generics/generic_collection";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { throw_error } from "generic-handler/built_in_generics/other_generic_helper";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args } from "generic-handler/Predicates";
import { mark_for_disposal as mark_id_for_disposal} from "./Scheduler/Scheduler";
import { is_relation, type Relation } from "../DataTypes/Relation";


export const get_id = construct_simple_generic_procedure(
    "get_id",
    1,
   (x: any) => {
    throw new Error("get_id is not implemented with:" + x)
   } 
)



export const get_children = construct_simple_generic_procedure(
    "get_children",
    1,
    
    (x: any) => {
        throw new Error("get_children is not implemented with:" + x)
    }
)

define_generic_procedure_handler(get_children, match_args(is_relation), (relation: Relation) => {
    return relation.get_children();
});

define_generic_procedure_handler(get_id, match_args(is_relation), (relation: Relation) => {
    return relation.get_id();
});

export const is_child = (a: any, b: any) => {
    // a is a child of b 
    return get_children(b).some((child: any) => get_id(child) === get_id(a))
}

export const get_parent = construct_simple_generic_procedure(
    "get_parent",
    1,
    (relation: any) => {
        if (relation.parent) {
            const parent = relation.parent.deref();
            return parent || null;
        }
        return null;
    }
)

// disposing


export const get_the_id_and_mark_for_disposal = compose(get_id, mark_id_for_disposal)


export const mark_children_for_disposal = (item: any) => {
    const children = get_children(item)

    for_each(children, mark_children_for_disposal)
    for_each(children, get_the_id_and_mark_for_disposal)
}

export const mark_for_disposal = (item: any) => {
    mark_children_for_disposal(item)
    get_the_id_and_mark_for_disposal(item)
}