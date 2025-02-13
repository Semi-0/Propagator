import type { LayeredObject } from "sando-layer/Basic/LayeredObject";

import { no_compute } from "../Helper/noCompute";
import { get_base_value } from "sando-layer/Basic/Layer";
import { map as generic_map } from "generic-handler/built_in_generics/generic_array_operation";
import { annotate_timestamp, fresher, get_traced_timestamp_layer, same_source, timestamp_equal, type traced_timestamp } from "./tracedTimestampLayer";

import { add_cell_content, cell_strongest, cell_strongest_base_value, construct_cell, make_temp_cell, type Cell } from "@/cell/Cell";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { construct_reactive_propagator } from "./reactiveProcedure";
import { compound_propagator } from "../Propagator/Propagator";
import { p_add, p_divide, p_multiply } from "../Propagator/BuiltInProps";
import { update } from "./update";
import { is_nothing } from "@/cell/CellValue";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";


export const curried_generic_map  = (f: (a: any) => any) => (a: any[]) => generic_map(a, f);

export const make_operator = (name: string, f: (...a: LayeredObject[]) => any) => {
    const rf = (...a: LayeredObject[]) => f(...a.map((a) => get_base_value(a)));
    
    return construct_reactive_propagator(rf, name)
} 

export const r_compose = (...operators: ((...cells: Cell<any>[]) => void)[]) => {
    return (initial: Cell<any>) => {
        let current = initial;
        let result: Cell<any> = make_temp_cell();

        // For every operator except the last one, create a new temporary cell.
        operators.forEach((operator, index) => {
            // For the last operator, reuse the current temporary cell.

            if (index === operators.length - 1) {
               
                result = make_temp_cell();
                operator(...[current, result]);
            } else {
                const next = make_temp_cell();
         
                operator(...[current, next]);
                current = next;
            }
        });
        return result;
    }
}

export const r_pipe = (arg_cell: Cell<any>, ...operators: ((...cells: Cell<any>[]) => void)[]) => {
    console.log("operators", operators)
    return r_compose(...operators)(arg_cell);
}

export const r_subscribe = (f: (a: any) => void) => (a: Cell<any>) => {
    cell_strongest(a).subscribe(compose(get_base_value, f));
}

export const r_apply = (f: (...a: any[]) => any) => {
    return make_operator("apply", f);
}

export const r_filter = (f: (a: any) => boolean) => {
    return make_operator("filter", (base: any) => {
        if (f(base)){
            return base;
        }
        else{
            return no_compute;
        }
    });
}

export const r_reduce = (f: (a: any, b: any) => any, initial: any) => {
    let acc = initial;
    return make_operator("reduce", (base: any) => {
        acc = f(acc, base);
        return acc;
    });
}


export const r_until = construct_reactive_propagator(
    // @ts-ignore
    (w: LayeredObject, t: LayeredObject) => {
        if (get_base_value(w) === true){
            return t
        }
        else{
            return no_compute
        }

    }, "until")

export const r_first = (arg: Cell<any>) => {
    var first_arg: LayeredObject | undefined = undefined;

    return construct_reactive_propagator((...args: LayeredObject[]) => {
        if(first_arg === undefined){
            first_arg = args[0];
            return args[0];
        }
        else{
            return first_arg;
        }
    }, "first")(arg);
}

export const r_zip = (...args: Cell<any>[]) => {
    var last_timestamps:  BetterSet<traced_timestamp>[] | undefined = undefined
    return construct_reactive_propagator((...args: LayeredObject[]) => {
        const timestamps = args.map((arg) => get_traced_timestamp_layer(arg));
        if(last_timestamps === undefined){
            last_timestamps = timestamps;
        }
        // if the timestamps are the same return no_compute 
        else if(timestamp_equal(last_timestamps, timestamps)){
            return no_compute;
        }
        else{
            last_timestamps = timestamps;
            return args;
        }
    }, "zip")(...args);
}

export const r_or = (output: Cell<any>, ...args: Cell<any>[]) => {
    // hack to force the cells to be fresh
    args.forEach((arg) => {
       const value = cell_strongest_base_value(arg)
       if(is_nothing(value)){
         add_cell_content(arg, annotate_timestamp(arg, 0))
       }
    })
    // @ts-ignore
    construct_reactive_propagator((...args: LayeredObject[]) => {
        // calculate the freshest cell
        const freshest = args.reduce((a, b) => fresher(a, b) ? a : b);
     
        return freshest;
    }, "or")(...args, output);
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