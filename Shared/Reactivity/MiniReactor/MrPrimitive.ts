import { type Node, type Edge, type EdgeCallback, is_node } from './MrType';
import {  reference_store } from '../../../Helper/Helper';
import { construct_better_set, identify_by  } from 'generic-handler/built_in_generics/generic_better_set';

import { to_string } from 'generic-handler/built_in_generics/generic_conversation';
import { add_item, remove_item, for_each } from 'generic-handler/built_in_generics/generic_collection';
import { map, length, every } from 'generic-handler/built_in_generics/generic_collection';
import { define_generic_procedure_handler } from 'generic-handler/GenericProcedure';
import { match_args } from 'generic-handler/Predicates';

export const get_reference = reference_store();

const node_store = new Map<number, Node<any>>();

export function set_node(node: Node<any>){
    if (node_store.has(node.id)){
        throw new Error("Node already exists");
    }
    else{
        node_store.set(node.id, node);
    }
}

export function remove_node(node: Node<any>){
    node_store.delete(node.id);
}

export function get_node(id: number): Node<any>{
    const v = node_store.get(id);
    if (v !== undefined){
        return v;
    }
    else{
        throw new Error("Node not found: " + id);
    }
}


export function construct_node<E>(): Node<E>{
    const id: number = get_reference();

    var children_edges = construct_better_set<any>([])
    var parents_edges = construct_better_set<any>([])

    const node = {
        id,
        receive(v: E) {
            for_each(children_edges, (e: any) => {
                e.activate(v)
            })
        },
        get children_edges() {return children_edges},
        get parent_edges() {return parents_edges},
        add_child_edge: (edge: any) => {
            children_edges = add_item(children_edges, edge)
        },
        remove_child_edge: (edge: any) => {
            children_edges = remove_item(children_edges, edge)
        },
        add_parent_edge: (edge: any) => {
            parents_edges = add_item(parents_edges, edge)
        },
        remove_parent_edge: (edge: any) => {
            parents_edges = remove_item(parents_edges, edge)
        }
    };

    set_node(node);
    return node;
}

define_generic_procedure_handler(identify_by, match_args(is_node), (node: Node<any>) => {
    return node.id;
})

export function get_children(n: any){
    return map(n.children_edges, (e: any) => {
        return get_node(e.child_id);
    })
}

export function get_parents(n: any){
    return map(n.parent_edges, (e: any) => {
        return get_node(e.parent_id);
    })
}

export function have_only_one_parent_of(child: Node<any>, parent: Node<any>){
    const parents = get_parents(child)
    return length(parents) === 1 && 
           every(parents, (p: any) => p.id === parent.id)
}

var edge_store = new Map<string, Edge<any, any>>();

function store_reference_pair(edge: Edge<any, any>){
    edge_store.set(edge_to_key(edge), edge)
}

export function remove_edge(edge: Edge<any, any>){
    edge_store.delete(edge_to_key(edge))

}

export function fetch_edge<A, B>(source: Node<A>, target: Node<B>): Edge<A, B>{
    const v = edge_store.get(to_edge_key(source.id, target.id))
    console.log(v)
    if (v !== undefined){
        return v
    }
    else{
        throw new Error("Edge not found: " + to_string(source.id) + " " + to_string(target.id))
    }
}

export function edge_to_key(edge: Edge<any, any>){
    return to_edge_key(edge.parent_id, edge.child_id)
}

export function to_edge_key<A, B>(source_id: number, target_id: number){
    return "k:" + source_id+ " " + target_id
}

export function construct_edge<A, B>(source: Node<A>, target: Node<B>, f: EdgeCallback<A, B>): Edge<A, B>{
    var to_activate = (v: any) => f(notify, v)

    function activate(v: any){
        to_activate(v)
    }                                                                                                                

    function notify(v: any){
        target.receive(v)
    }

    const edge = {
        parent_id: source.id,
        child_id: target.id,
        activate,
        id: get_reference()
    }    

    source.add_child_edge(edge)
    target.add_parent_edge(edge)
    store_reference_pair(edge)

    return edge
}







