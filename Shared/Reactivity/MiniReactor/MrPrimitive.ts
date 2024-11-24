import type { Node, Edge, EdgeCallback } from './MrType';
import { reference_store } from '../../../Helper/Helper';
import { make_better_set, set_add_item,  set_every,  set_for_each,  set_get_length,  set_map, set_remove_item } from 'generic-handler/built_in_generics/generic_better_set';

import { to_string } from 'generic-handler/built_in_generics/generic_conversation';

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

    var children_edges = make_better_set<any>([])
    var parents_edges = make_better_set<any>([])

    return {
        id,
        receive(v: E) {
            set_for_each((e: any) => {
                e.activate(v)
            }, children_edges)
        },
        get children_edges() {return children_edges},
        get parent_edges() {return parents_edges},
        add_child_edge: (edge: any) => {
            children_edges = set_add_item(children_edges, edge)
        },
        remove_child_edge: (edge: any) => {
            children_edges = set_remove_item(children_edges, edge)
        },
        add_parent_edge: (edge: any) => {
            parents_edges = set_add_item(parents_edges, edge)
        },
        remove_parent_edge: (edge: any) => {
            parents_edges = set_remove_item(parents_edges, edge)
        }
    }
}

export function get_children(n: any){
    return set_map(n.children_edges, (e: any) => {
        return e.child
    })
}

export function get_parents(n: any){
    return set_map(n.parent_edges, (e: any) => {
        return e.parent
    })
}

export function have_only_one_parent_of(child: Node<any>, parent: Node<any>){
    const parents = get_parents(child)
    return set_get_length(parents) === 1 && 
           set_every(parents, (p: any) => p.id === parent.id)
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
        activate
    }    

    source.add_child_edge(edge)
    target.add_parent_edge(edge)
    store_reference_pair(edge)

    return edge
}







