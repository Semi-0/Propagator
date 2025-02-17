import type { LayeredObject } from "sando-layer/Basic/LayeredObject";

import { no_compute } from "../Helper/noCompute";
import { get_base_value } from "sando-layer/Basic/Layer";
import { map as generic_map } from "generic-handler/built_in_generics/generic_array_operation";
import { annotate_identified_timestamp, patch_traced_timestamps, fresher, get_traced_timestamp_layer, same_source, timestamp_equal, type traced_timestamp } from "./traced_timestamp/tracedTimestampLayer";

import { add_cell_content, cell_content, cell_name, cell_strongest, cell_strongest_base_value, construct_cell, make_temp_cell, type Cell } from "@/cell/Cell";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { construct_reactive_propagator } from "./reactiveProcedure";
import { compound_propagator } from "../Propagator/Propagator";
import { p_add, p_divide, p_multiply } from "../Propagator/BuiltInProps";
import { update } from "./update";
import { is_nothing } from "@/cell/CellValue";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { construct_reactor } from "../Shared/Reactivity/Reactor";
import { get_new_reference_count, reference_store } from "../Helper/Helper";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { is_timestamp_value_set } from "./traced_timestamp/generic_patch";


export const curried_generic_map  = (f: (a: any) => any) => (a: any[]) => generic_map(a, f);

export const make_operator = (name: string, f: (...a: any[]) => any) => {
    const rf = (...a: LayeredObject[]) => f(...a.map((a) => get_base_value(a)));
    
    return (output: Cell<any>, ...args: Cell<any>[]) => {
        return construct_reactive_propagator(rf, name)(...args, output);
    }
    
    
} 


export const r_inspect_strongest = (cell: Cell<any>) => {
    return cell_strongest(cell).subscribe((value) => {
        console.log("cell name:" + cell_name(cell) + " updated")
        console.log("cell strongest value:")
        console.log(to_string(value));
    })
}

export const r_inspect_content = (cell: Cell<any>) => {
    return cell_content(cell).subscribe((value) => {
        console.log("cell name:" + cell_name(cell) + " updated")
        console.log("cell content:")
        console.log(to_string(value));
    })
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
                operator(...[result, current]);
            } else {
                const next = make_temp_cell();
         
                operator(...[next, current]);
                current = next;
            }
        });
        return result;
    }
}

export const r_pipe = (arg_cell: Cell<any>, ...operators: ((...cells: Cell<any>[]) => void)[]) => {
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

export const r_first = (output: Cell<any>, arg: Cell<any>) => {
    var first_arg: LayeredObject | undefined = undefined;

    return construct_reactive_propagator((...args: LayeredObject[]) => {
        if(first_arg === undefined){
            first_arg = args[0];
            return args[0];
        }
        else{
            return first_arg;
        }
    }, "first")(arg, output);
}

export const any_time_stamp_equal = (a: BetterSet<traced_timestamp>[], b: BetterSet<traced_timestamp>[]) => {
    

    if (a.length !== b.length){
        return false;
    }

    for (let index = 0; index < a.length; index++) {
        const element_a = a[index];
        const element_b = b[index];
        if(timestamp_equal(element_a, element_b)){
            return true;
        }
    }


    return false;
}

export const r_zip = (output: Cell<any>, ...args: Cell<any>[]) => {
    var last_timestamps:  BetterSet<traced_timestamp>[] | undefined = undefined
    return construct_reactive_propagator((...args: LayeredObject[]) => {
        const timestamps = args.map((arg) => get_traced_timestamp_layer(arg));
        const base_values = args.map((arg) => get_base_value(arg));
        if(last_timestamps === undefined){
            last_timestamps = timestamps;
            return base_values;
        }
        // if the timestamps are the same return no_compute 
        else if(timestamp_equal(last_timestamps, timestamps)){
            return no_compute;
        }
        else{
            last_timestamps = timestamps;
            return base_values;
        }
    }, "zip")(...args, output);
}

export const r_or = (output: Cell<any>, ...args: Cell<any>[]) => {
    // hack to force the cells to be fresh
    args.forEach((arg) => {
       const value = cell_strongest_base_value(arg)
       if(is_nothing(value)){
         add_cell_content(arg, patch_traced_timestamps(arg, 0))
       }
    })
    // @ts-ignore
    return construct_reactive_propagator((...args: LayeredObject[]) => {
        // calculate the freshest cell
        const freshest = args.reduce((a, b) => fresher(a, b) ? a : b);
     
        return freshest;
    }, "or")(...args, output);
    
}


export const r_add = (output: Cell<any>, ...args: Cell<any>[]) => {
    return make_operator("add", (...args: number[]) => args.reduce((a, b) => a + b, 0))(output, ...args);
}

export const r_subtract = (output: Cell<any>, ...args: Cell<any>[]) => {
    return make_operator("subtract", (...args: number[]) => args.slice(1).reduce((a, b) => a - b, args[0]))(output, ...args);
}

export const r_multiply = (output: Cell<any>, ...args: Cell<any>[]) => {
    return make_operator("multiply", (...args: number[]) => {
        const result = args.slice(1).reduce((a, b) => a * b, args[0]);
        console.log("multiply");
        console.log(args);
        console.log(result);
        return result;
    })(output, ...args);
}

export const r_divide = (output: Cell<any>, ...args: Cell<any>[]) => {
    return make_operator("divide", (...args: number[]) => args.slice(1).reduce((a, b) => a / b, args[0]))(output, ...args);
}

export const r_reduce_array = (f: (a: any, b: any) => any, initial: any) => {
    return make_operator("reduce_array", (base: any[]) =>{
        const result = base.slice(1).reduce(f, base[0]);
        console.log(base);
        console.log(result);
        return result;
    });
}



export function c_sum_propotional(output: Cell<number>, ...inputs: Cell<number>[]) {
    return compound_propagator(inputs, [output], () => {
        r_add(output, ...inputs);

        //calculate the ratio of each input to the sum by zip
       
        const ratios =  inputs.map((input) => {
            const zip_out = construct_cell("zip" + get_new_reference_count())  
            r_zip(zip_out, input, output);
            // @ts-ignore
            const ratio_out = construct_cell("ratio" +  get_new_reference_count())
            r_reduce_array((a, b) => a / b, 0)(ratio_out, zip_out);
            return ratio_out;
        });

        //calculate the product of each input and its ratio by zip
        inputs.forEach((input, index) => {
            r_multiply(input, output, ratios[index]);
        });


        return construct_reactor();
    }, "c_sum_propotional")
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