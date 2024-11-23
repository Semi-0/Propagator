import { type Node, type EdgeCallback } from './MrType';
import { construct_edge, construct_node, fetch_edge, get_children,  get_parents, remove_edge, remove_node } from './MrPrimitive';
import {  set_for_each } from 'generic-handler/built_in_generics/generic_better_set';

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

interface Stepper<A>{
    value: A,
    node: Node<A>
}

export function stepper<A>(initial: A){
    var value: A = initial;
    return  (node: Node<A>) => {
        return {
            value:  value,
            node:   apply((notify, update: A) => {
                        value = update;
                        notify(update);
                })(node)
    }}
}


export function combine(f: (notify: (update: any) => void, update: any, sources: Stepper<any>[]) => void) {
    return (...parents: Node<any>[]) => {
        const child = construct_node();
        const parent_steppers = parents.map(stepper(undefined));
        parents.forEach((parent, index) => {
            connect(parent, child, (notify, update) => f(notify, update, parent_steppers));
        })
    }
}

export function dispose(node: Node<any>){
    // TODO: should track the dependency
    set_for_each((parents: Node<any>) => {
        disconnect(parents, node);
    }, get_children(node))

    set_for_each((children: Node<any>) => {
        disconnect(node, children);
    }, get_parents(node))

    remove_node(node);
}



