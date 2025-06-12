import { get_children } from './MrPrimitive';
import type { Node } from './MrType';
import { for_each } from 'generic-handler/built_in_generics/generic_collection';

export function next(node: Node<any>, value: any){
   node.receive(value) 
}

export function activate_all_child(n: any){
    for_each(n.children_edges, (edge: any) => {
            edge.activate()
    })
    return get_children(n)
}
