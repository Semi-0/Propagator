import { construct_simple_generic_procedure, define_generic_procedure_handler } from 'generic-handler/GenericProcedure';
import { match_args } from 'generic-handler/Predicates';
import { is_any } from 'generic-handler/built_in_generics/generic_predicates';
import { pipe } from 'fp-ts/lib/function';
import { type Node, type Edge, is_edge, is_node } from './MrType';
const node_store = new Map<number, Node<any>>();
import { reference_store } from '../../../Helper/Helper';
import type { ReferencePair } from './MrType';
import { make_better_set, set_add_item, set_for_each, set_map, set_remove_item } from 'generic-handler/built_in_generics/generic_better_set';
import { get_node } from './MrPrimitive';
import { get_children } from './MrPrimitive';

export function update(node: any){
    set_for_each(update,  activate_all_child(node))
}


export function activate_all_child(n: any){
    set_for_each((edge: any) => {
            edge.activate()
    },  n.children_edges)
    return get_children(n)
}
