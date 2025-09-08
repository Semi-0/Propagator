import { identify_by, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args, register_predicate } from "generic-handler/Predicates";
import { get_reference } from "./MrPrimitive";

export type EdgeCallback<A, B> = (notify: (update: B) => void, update: A) => void 

export interface Node<E>{
    id: number;
    receive: (v: E) => void;
    readonly children_edges: BetterSet<Edge<E, any>>;
    readonly parent_edges: BetterSet<Edge<any, E>>;
    add_child_edge: (node: Edge<E, any>) => void;
    remove_child_edge: (node: Edge<E, any>) => void;
    add_parent_edge: (node: Edge<any, E>) => void;
    remove_parent_edge: (node: Edge<any, E>) => void;
}

export const is_node = register_predicate("is_node", (a: any) => {
    return a !== null && a !== undefined && 
    a.id !== undefined && 
    a.children_edges !== undefined &&
    a.parent_edges !== undefined;

})


export interface Edge<A, B>{
    id: number;
    parent_id: number;
    child_id: number;
    activate: (v: any) => void; 
}

export const is_edge = register_predicate("is_edge", (a: any) => {
    return a !== null && a !== undefined &&  a.parent_id !== undefined && a.child_id !== undefined && a.activate !== undefined && a.id !== undefined;

})

define_generic_procedure_handler(identify_by, match_args(is_edge), (edge: Edge<any, any>) => {
    return edge.id;
})

define_generic_procedure_handler(to_string, match_args(is_node), (node: Node<any>) => {
    return `Node(${node.id})`
})

define_generic_procedure_handler(to_string, match_args(is_edge), (edge: Edge<any, any>) => {
    return `Edge(${edge.parent_id}, ${edge.child_id})`
})