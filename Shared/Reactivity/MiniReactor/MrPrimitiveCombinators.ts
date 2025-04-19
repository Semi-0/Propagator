import { type Node, type EdgeCallback, type Edge } from './MrType';
import { construct_edge, construct_node, fetch_edge, get_children, get_parents, have_only_one_parent_of, remove_edge, remove_node, get_node } from './MrPrimitive';
import {  make_better_set, set_for_each, set_map } from 'generic-handler/built_in_generics/generic_better_set';
import { set_add_item } from 'generic-handler/built_in_generics/generic_better_set';
import { guard, throw_error } from 'generic-handler/built_in_generics/other_generic_helper';
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
    let value: A = initial;
    return (node: Node<A>) => {
        const stepperNode = apply((notify, update: A) => {
            value = update;
            notify(update);
        })(node);
        
        return {
            get_value: () => value,
            node: stepperNode
        };
    }
}

export function combine(f: (notify: (update: any) => void, update: any, sources: Stepper<any>[]) => void, initals: any[]): (...parents: Node<any>[]) =>  Node<any> {
    return (...parents: Node<any>[]) => {

        guard(initals.length === parents.length, throw_error("combine","requirement mismatch", "initial: " + initals.length + " parents: " + parents.length));
        const child = construct_node();
        const parent_steppers = parents.map((node, index) => stepper(initals[index])(node));
        
        // Connect each parent to the child with proper stepper handling
        parent_steppers.forEach((parent) => {
            connect(parent.node, child, (notify, update) => {
                // Update the value for this parent
                // Call the combine function with updated values
                f(notify, update, parent_steppers);
            });
        });
        
        return child;
    }
}

export function dispose(node: Node<any>) {
    if (!node) return;

    // Create a set to track nodes that need to be disposed
    let nodes_to_dispose = make_better_set<Node<any>>([]);
    
    // Collect all nodes that should be disposed
    const collect_nodes_to_dispose = (parent: Node<any>) => {
        if (!parent) return;
        
        nodes_to_dispose = set_add_item(nodes_to_dispose, parent);
        
        // Get all children before we start modifying edges
        const children = get_children(parent);
        set_for_each((child: Node<any>) => {
            if (child && have_only_one_parent_of(child, parent)) {
                collect_nodes_to_dispose(child);
            }
        }, children);
    };

    collect_nodes_to_dispose(node);

    // Disconnect all edges for each node
    const disconnect_all_edges = (n: Node<any>) => {
        if (!n) return;

        // Get all edges before disconnecting to avoid mutation during iteration
        const child_edges = set_map(n.children_edges, (edge: Edge<any, any>) => edge);
        const parent_edges = set_map(n.parent_edges, (edge: Edge<any, any>) => edge);

        // Disconnect from children
        set_for_each((edge: Edge<any, any>) => {
            try {
                const child = get_node(edge.child_id);
                if (child) {
                    disconnect(n, child);
                }
            } catch (e) {
                // Ignore errors for nodes that don't exist
            }
        }, child_edges);

        // Disconnect from parents
        set_for_each((edge: Edge<any, any>) => {
            try {
                const parent = get_node(edge.parent_id);
                if (parent) {
                    disconnect(parent, n);
                }
            } catch (e) {
                // Ignore errors for nodes that don't exist
            }
        }, parent_edges);

        // Clear the node's edges
        set_for_each((edge: Edge<any, any>) => {
            remove_edge(edge);
        }, n.children_edges);
        set_for_each((edge: Edge<any, any>) => {
            remove_edge(edge);
        }, n.parent_edges);
    };

    // Dispose of all collected nodes
    set_for_each((n) => {
        if (n) {
            disconnect_all_edges(n);
            remove_node(n);
        }
    }, nodes_to_dispose);
}



