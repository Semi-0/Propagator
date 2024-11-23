import { set_for_each } from 'generic-handler/built_in_generics/generic_better_set';
import { get_children } from './MrPrimitive';
import type { Node } from './MrType';

export function next(node: Node<any>, value: any){
    node.v = value;
    update(node);
}

export function update(node: any){
    set_for_each(update,  activate_all_child(node))
}

export function activate_all_child(n: any){
    set_for_each((edge: any) => {
            edge.activate()
    },  n.children_edges)
    return get_children(n)
}
