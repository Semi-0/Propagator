import type { LayeredObject } from "sando-layer/Basic/LayeredObject";

import { no_compute } from "../Helper/noCompute";
import { get_base_value } from "sando-layer/Basic/Layer";
import { map as generic_map } from "generic-handler/built_in_generics/generic_array_operation";
import { fresher, get_traced_timestamp_layer } from "./tracedTimestampLayer";

import { cell_strongest, construct_cell, make_temp_cell, type Cell } from "@/cell/Cell";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { construct_reactive_propagator } from "./reactiveProcedure";
import { compound_propagator } from "../Propagator/Propagator";


export const curried_generic_map  = (f: (a: any) => any) => (a: any[]) => generic_map(a, f);

export const make_operator = (name: string, f: (a: LayeredObject) => any) => {
    const rf = (a: LayeredObject) => f(get_base_value(a));

    return construct_reactive_propagator(rf, name)
} 

export const compose_r = (...operators: ((...cells: Cell<any>[]) => void)[]) => {
    return (initial: Cell<any>) => {
        let current = initial;
        let result: Cell<any>;

        // For every operator except the last one, create a new temporary cell.
        operators.forEach((operator, index) => {
            // For the last operator, reuse the current temporary cell.
            if (index === operators.length - 1) {
                result = make_temp_cell();
                operator(current, result);
            } else {
                const next = make_temp_cell();
                operator(current, next);
                current = next;
            }
        });
        return result!;
    }
}

export const pipe_r = (arg_cell: Cell<any>, ...operators: ((...cells: Cell<any>[]) => void)[]) => {
    return compose_r(...operators)(arg_cell);
}

export const subscribe = (f: (a: any) => void) => (a: Cell<any>) => {
    cell_strongest(a).subscribe(compose(get_base_value, f));
}

export const apply_e = (f: (a: any) => any) => {
    return make_operator("apply", f);
}

export const filter_e = (f: (a: any) => boolean) => {
    return make_operator("filter", (base: any) => {
        if (f(base)){
            return base;
        }
        else{
            return no_compute;
        }
    });
}

export const reduce_e = (f: (a: any, b: any) => any, initial: any) => {
    let acc = initial;
    return make_operator("reduce", (base: any) => {
        acc = f(acc, base);
        return acc;
    });
}


export const until = (when: Cell<any>, then: Cell<any>) => {
    const output = construct_cell("until");
    // @ts-ignore
    construct_reactive_propagator((w: LayeredObject, t: LayeredObject) => {
        if (get_base_value(w) === true){
            return t
        }
        else{
            return no_compute
        }
        // @ts-ignore
    }, "until")(when, then, output);
    return output;
}

export const or = (a: Cell<any>, b: Cell<any>) => {
    const output = construct_cell("or");
    // @ts-ignore
    construct_reactive_propagator((a: LayeredObject, b: LayeredObject) => {
        if (fresher(a, b)){
            return a;
        }
        else if (fresher(b, a)){
            return b;
        }
        else{
            return a
        }
        // @ts-ignore
    }, "or")(a, b, output);
    return output;
}

// export const c_sum_propotional = (inputs: Cell<number>[], output: Cell<number>) => compound_propagator(inputs, [output], 
//     () => {
//         const sum_cell = make_temp_cell(); 
//         const ratios = inputs.map((input) => {
//             const ratio_cell = make_temp_cell();
//             return pr_first(p_divide(input, sum_cell, ratio_cell))
//         })
//         const reducer =  p_reduce((acc, curr) => add(acc, (multiply(curr, ratios))), sum_cell) 
//       return [...ratios, reducer]
//     }
    
//     "sum_propotional")