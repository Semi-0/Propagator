import { type Node, type EdgeCallback, type Edge } from './MrType';
import { construct_edge, construct_node, fetch_edge, get_children,  get_parents, have_only_one_parent_of, remove_edge, remove_node } from './MrPrimitive';
import {  make_better_set, set_for_each } from 'generic-handler/built_in_generics/generic_better_set';
import { set_add_item } from 'generic-handler/built_in_generics/generic_better_set';
export function connect<A, B>(parent: Node<A>, child: Node<B>, f: EdgeCallback<A, B>){
    const edge = construct_edge(parent, child, f);

    parent.add_child_edge(edge);
    child.add_parent_edge(edge);
}

export function disconnect<A, B>(parent: Node<A>, child: Node<B>){
    const edge = fetch_edge(parent, child);
     
    parent.remove_child_edge(edge);
    child.remove_parent_edge(edge);

    remove_edge(edge);
}

export function apply<A, B>(f: EdgeCallback<A, B>){
    return (parent: Node<A>) => {
        const child = construct_node();
        //@ts-ignore
        connect(parent, child, f);
        return child;
    }
}

export interface Stepper<A>{
    get_value: () => A,
    node: Node<A>
}

export function stepper<A>(initial: A): (node: Node<A>) => Stepper<A>{
    var value: A =  initial
    return  (node: Node<A>) => {
        return {
            get_value: () => {return value},
            node:   apply((notify, update: A) => {
                        value = update;

                        notify(update);
                })(node)
    }} 
}

export function combine(f: (notify: (update: any) => void, update: any, sources: Stepper<any>[]) => void): (...parents: Node<any>[]) =>  Node<any> {
    return (...parents: Node<any>[]) => {
        const child = construct_node();
        const parent_steppers = parents.map(stepper(undefined));
        parent_steppers.forEach((parent) => {
            connect(parent.node, child, (notify, update) => f(notify, update, parent_steppers));
        })
        return child;
    }
}

export function dispose(node: Node<any>){
   // recursivly dispose the children only have this node as parent
    var nodes_to_dispose = make_better_set<Node<any>>([]);
    
    const collect_nodes_to_despose = (parent: Node<any>) => {
        nodes_to_dispose = set_add_item(nodes_to_dispose, parent);
        set_for_each((child: Node<any>) => {
            if (have_only_one_parent_of(child, parent)){
                collect_nodes_to_despose(child);
            }
        }, get_children(node))
    } 

    collect_nodes_to_despose(node);

    // TODO: should track the dependency
    const disconnect_all_edge = (n: Node<any>) => {  
        set_for_each((child: Node<any>) => {
            disconnect(n, child);
        }, get_children(n))
        
        set_for_each((parent: Node<any>) => {
            disconnect(parent, n);
        }, get_parents(n))
    }

    set_for_each((node) => {
        disconnect_all_edge(node);
        remove_node(node);
    }, nodes_to_dispose)
}



