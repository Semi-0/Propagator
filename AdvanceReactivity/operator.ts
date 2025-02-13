import type { LayeredObject } from "sando-layer/Basic/LayeredObject";

import { no_compute } from "../Helper/noCompute";
import { get_base_value } from "sando-layer/Basic/Layer";
import { map as generic_map } from "generic-handler/built_in_generics/generic_array_operation";
import { fresher, get_traced_timestamp_layer } from "./tracedTimestampLayer";

import { cell_strongest, cell_strongest_base_value, construct_cell, make_temp_cell, type Cell } from "@/cell/Cell";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { construct_reactive_propagator } from "./reactiveProcedure";
import { compound_propagator } from "../Propagator/Propagator";
import { p_add, p_divide, p_multiply } from "../Propagator/BuiltInProps";
import { update } from "./update";


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
    // hack to force the cells to be fresh
    update(a, cell_strongest_base_value(a))
    update(b, cell_strongest_base_value(b))
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



// export const c_sum_propotional = (inputs: Cell<number>[], output: Cell<number>) =>
//   compound_propagator(
//     inputs,
//     [output],
//     () => {
//       // Compute the total sum from all input cells.
//       const sumCell = make_temp_cell();
//       const addProp = p_add(...inputs, sumCell);

//       // For each input, compute its ratio: ratio = input / sum.
//       const ratioCells: Cell<number>[] = [];
//       const ratioProps = inputs.map((input) => {
//         const ratioCell = make_temp_cell();
//         ratioCells.push(ratioCell);
//         return p_divide(input, sumCell, ratioCell);
//       });

//       // Compute product for each input: product = input * (input / sum)
//       const productCells: Cell<number>[] = [];
//       const productProps = inputs.map((input, i) => {
//         const productCell = make_temp_cell();
//         productCells.push(productCell);
//         return p_multiply(input, ratioCells[i], productCell);
//       });

//       // Sum all product cells into output.
//       const finalProp = p_add(...productCells, output);

//       // Merge all activators to form the overall reactor.
//       return merge(
//         addProp.getActivator(),
//         ...ratioProps.map((p) => p.getActivator()),
//         ...productProps.map((p) => p.getActivator()),
//         finalProp.getActivator()
//       );
//     },
//     "c_sum_propotional"
//   );