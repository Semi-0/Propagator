import { for_each } from "generic-handler/built_in_generics/generic_collection";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { throw_error } from "generic-handler/built_in_generics/other_generic_helper";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args } from "generic-handler/Predicates";
import { mark_for_disposal as mark_id_for_disposal} from "./Scheduler/Scheduler";
import { is_relation, type Relation } from "../DataTypes/Relation";
import { cell_children, cell_dependents, cell_downstream, cell_id, is_cell } from "@/cell/Cell";
import { is_propagator, propagator_children, propagator_id } from "../Propagator/Propagator";
// import type { Propagator } from "ppropogator";


export const get_id = construct_simple_generic_procedure(
    "get_id",
    1,
   (x: any) => {
    throw new Error("get_id is not implemented with:" + x)
   } 
)
// needs install get_id_handler package for relationship cell and propagator

export const install_get_id_generic_package = () => {
    define_generic_procedure_handler(
        get_id,
        match_args(is_relation),
        (relation: Relation) => {
            return relation.get_id();
        }
    )
    define_generic_procedure_handler(
        get_id,
        match_args(is_cell),
        cell_id
    )
    define_generic_procedure_handler(
        get_id,
        match_args(is_propagator),
        propagator_id
    )
}

export const get_children = construct_simple_generic_procedure(
    "get_children",
    1,
    
    (x: any) => {
        throw new Error("get_children is not implemented with:" + x)
    }
)

export const install_get_children_generic_package = () => {
    define_generic_procedure_handler(
        get_children,
        match_args(is_relation),
        (relation: Relation) => {
            return relation.get_children();
        }
    )
    define_generic_procedure_handler(
        get_children,
        match_args(is_cell),
        cell_children
    )
    define_generic_procedure_handler(
        get_children,
        match_args(is_propagator),
        propagator_children
    )
}



// define_generic_procedure_handler(get_children, match_args(is_relation), (relation: Relation) => {
//     return relation.get_children();
// });

// define_generic_procedure_handler(get_id, match_args(is_relation), (relation: Relation) => {
//     return relation.get_id();
// });

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

/** Duck-check for cell-like items. Used to avoid enqueueing cells (disposal is propagator-only; cells are GC'd by scheduler). */
const looks_like_cell = (item: any): boolean =>
  item != null &&
  typeof item.getNeighbors === "function" &&
  typeof item.getRelation === "function" &&
  typeof item.getContent === "function";

export const get_the_id_and_mark_for_disposal = compose(get_id, mark_id_for_disposal)


export const mark_children_for_disposal = (item: any) => {
    const children = get_children(item)

    for_each(children, mark_children_for_disposal)
    for_each(children, get_the_id_and_mark_for_disposal)
}

export const mark_for_disposal = (item: any) => {
    // Disposal is propagator-only; cells are collected by scheduler when unreachable. Do not enqueue cells.
    if (looks_like_cell(item)) return;
    mark_children_for_disposal(item);
    get_the_id_and_mark_for_disposal(item);
};


export const get_dependents = (x: any): any[] => {
    if (is_cell(x)) return cell_dependents(x)
    if (x && typeof x.getInputs === 'function') return x.getInputs()
    return []
}

export const get_downstream = (x: any): any[] => {
    if (is_cell(x)) return cell_downstream(x)
    if (x && typeof x.getOutputs === 'function') return x.getOutputs()
    return []
}

export const at_primitives = (x: any): boolean =>
    is_cell(x) && cell_dependents(x).length === 0

export const generic_relation_parent_child = (parent: any, child: any) => {
    if (parent && typeof parent.getRelation === 'function') {
        parent.getRelation().add_child(child)
    }
}

export const install_generics_package = () => {
    install_get_id_generic_package();
    install_get_children_generic_package();
}