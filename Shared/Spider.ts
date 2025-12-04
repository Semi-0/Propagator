import { cell_downstream, cell_id, cell_name, cell_upstream, is_cell, type Cell } from "../Cell/Cell";
import { is_propagator, propagator_downstream, propagator_id, propagator_name, propagator_upstream } from "../Propagator/Propagator";
import { flat_map } from "generic-handler/built_in_generics/generic_collection";
import { cell_strongest_base_value } from "ppropogator";
import { is_array, is_atom } from "generic-handler/built_in_generics/generic_predicates";

// generic graph traverse agent

export const traverse = (step: (x: any, go: (x: any) => any[]) => any[], final: (traversed: any[]) => any) => {
    const go = (target: any) => {
        return step(target, go);
    }

    return (target: any) => {
        return final(go(target));
    }
}


export const get_downstream = (x: any) => {
    if (is_cell(x)) {
        return cell_downstream(x)
    }
    else if (is_propagator(x)) {
        return propagator_downstream(x)
    }
    else {
        return []
    }
}

export const get_neighbors = (x: any) => {
    if (is_cell(x)) {
        return [...cell_downstream(x), ...cell_upstream(x)]
    }
    else if (is_propagator(x)) {
        return [...propagator_downstream(x), ...propagator_upstream(x)]
    }
    else {
        return []
    }
}

export const get_upstream = (x: any) => {
    if (is_cell(x)) {
        return cell_upstream(x)
    }
    else if (is_propagator(x)) {
        return propagator_upstream(x)
    }
    else {
        return []
    }
}

export const unshift = (x: any, xs: any[]) => [x, ...xs]

export const get_name = (x: any) => {
    if (is_cell(x)) {
        return cell_name(x)
    }
    else if (is_propagator(x)) {
        return propagator_name(x)
    }
    else {
        return ""
    }
}

export const get_id = (x: any) => {
    if (is_cell(x)) {
        return cell_id(x)
    }
    else if (is_propagator(x)) {
        return propagator_id(x)
    }
    else {
        return ""
    }
}

export const node_equal = (x: any, y: any) => get_id(x) === get_id(y)

export const traverse_chain = (direction: (node: any) => any[]) => (final: (traversed: any[]) => any) => (start: Cell<any>, end: Cell<any>) => 
    // find the chain from the beginning point to the end point
    traverse(
        (node: any, go: (x: any) => any[]) => {
            if (node_equal(node, end)) {
                // base: 一條 path：[end]
                return [[node]];
              } else {
                const direct = direction(node);   // Node[]
                const childPaths = direct.flatMap(go); // Path[]
         
                return childPaths.map(path => [node, ...path]);
              }
        },
        final
    )(start) 

export const traverse_chain_downstream = traverse_chain(get_downstream)
export const traverse_chain_upstream = traverse_chain(get_upstream)
export const traverse_chain_neighbors = traverse_chain(get_neighbors)

export const traverse_downstream = (final: (traversed: any[]) => any) => traverse(
    (node: any, go: (x: any) => any[]) => {
        const downstream = get_downstream(node)

        if (downstream.length === 0) {
            return [node]
        }
        else {
            const downstream_traversed = flat_map(downstream, go)
            return unshift(node, downstream_traversed)
        }
    },
    final
)

export const display_value = (a: any) => {
    if (is_cell(a)) {
        return "[ cell: " + get_name(a) + " : " + cell_strongest_base_value(a) + " ]"
    }
    else if (is_propagator(a)) {
        return "[ propagator: " + propagator_name(a) + " ]"
    }
    else {
        return ""
    }
}

export const flatten_path = (accum: any[], path: any[]): any[] => {
    if (path.length == 1){
        if (is_atom(path[0])){
            return [...accum, path[0]]
        }
        else if (is_array(path[0])){
            return path[0]
        } 
        else{
            return []
        } 
    }
    else if ((path.length == 2) && is_array(path[1])){
        return flatten_path([...accum, path[0]], path[1])
    }
    else{
        return []
    }
}

export const traverse_value_path_downstream = traverse_chain_downstream(
    (traversed: any[]) => traversed.map((path: any[]) => path.map(display_value).join(" -> "))
)

export const traverse_value_path_upstream = traverse_chain_upstream(
    (traversed: any[]) => traversed.map((path: any[]) => path.map(display_value).join(" <- "))
)

// maybe give these combinator a vector?
// but how?
export const traverse_value_path_neighbors = traverse_chain_neighbors(
    (traversed: any[]) => traversed.map((path: any[]) => path.map(display_value).join(" -- "))
)


// interface spider 

// spider was something like turtle?
// it keep doing the same thing until a condition is met?


export const is_location = (x: any) => is_cell(x) || 
                                       is_propagator(x) || 
                                       (is_downstream(x) && is_upstream(x) && is_neighbors(x))

export const is_downstream = (x: any) => x === "downstream"
export const is_upstream = (x: any) => x === "upstream"
export const is_neighbors = (x: any) => x === "neighbors"


// go to or go downstream?
interface Spider {
    get_location(): any 
    goto(location: any): void 
    get_web(): any[] 
}


export const create_spider = (current_location: any): Spider => {
    var web: any[] = []

    return {
        get_location: () => current_location,
        goto: (location: any) => {
            if (is_downstream(location)) {
                current_location = [current_location, ...get_downstream(current_location)]
            }
            else if (is_upstream(location)) {
                current_location = [current_location, ...get_upstream(current_location)]
            }
            else if (is_neighbors(location)) {
                current_location = [current_location, ...get_neighbors(current_location)]
            }
            else {
                const traversed = traverse_chain_neighbors(
                    traversed => traversed
                )(current_location, location)
                web = [...web, ...traversed]
                current_location = location
            }
        },
        get_web: () => web
    }
}
// higer order function on spider?
// like map, filter, reduce? 
// search (both upstream and downstream?)
// or built the graph conditionally?