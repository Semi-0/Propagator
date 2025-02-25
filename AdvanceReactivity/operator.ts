import type { LayeredObject } from "sando-layer/Basic/LayeredObject";

import { no_compute } from "../Helper/noCompute";
import { get_base_value } from "sando-layer/Basic/Layer";
import { map as generic_map } from "generic-handler/built_in_generics/generic_array_operation";
import { annotate_identified_timestamp, patch_traced_timestamps, fresher, get_traced_timestamp_layer, same_source, timestamp_equal, type traced_timestamp, annotate_now_with_id, stale } from "./traced_timestamp/tracedTimestampLayer";

import { add_cell_content, cell_content, cell_id, cell_name, cell_strongest, cell_strongest_base_value, constant_cell, construct_cell, make_temp_cell, type Cell } from "@/cell/Cell";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { construct_reactive_propagator } from "./reactiveProcedure";
import { compound_propagator } from "../Propagator/Propagator";
import { p_add, p_divide, p_multiply } from "../Propagator/BuiltInProps";
import { initialize, update, update_store } from "./update";
import { is_nothing } from "@/cell/CellValue";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { construct_reactor } from "../Shared/Reactivity/Reactor";
import { get_new_reference_count, reference_store } from "../Helper/Helper";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { is_timestamp_value_set } from "./traced_timestamp/genericPatch";
import { set_every, set_get_length, set_has } from "generic-handler/built_in_generics/generic_better_set";
import { Socket } from "net";

 // perhaps a better design for this is convey it to generic propagator
 // ( so as generic operator )
 // but let us think about that later

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

// Classic queue-based implementation of r_zip operator with lastSent tracking
export const r_zip = (output: Cell<any>, f: Cell<any>, ...args: Cell<any>[]) => {
    // todo generate new fresh cells
    // Initialize a queue for each input cell
    const queues: any[][] = args.map(() => []);
    // last emitted zipped result; initially no_compute
    let lastSent: any = no_compute;
    // @ts-ignore
    return construct_reactive_propagator((f: (...a: any[]) => any, ...values: LayeredObject[]) => {
        // Exclude the output cell from the inputs

        const currentValues = values.map(cell => get_base_value(cell));
        // @ts-ignore
        const currentFunc = get_base_value(f);
        // For each input, if currentValue is valid and it is new compared to the last queued value or the last emitted value,
        // then push it into its respective queue
        for (let i = 0; i < currentValues.length; i++) {
            const curr = currentValues[i];
            // If we haven't emitted any value yet, or the last emitted value for input i is different
            if (lastSent === no_compute || (Array.isArray(lastSent) && lastSent[i] !== curr)) {
                queues[i].push(curr);
            }
      
        }

        // If every input's queue has at least one element, consume one from each to produce a new zipped result
        if (queues.every(queue => queue.length > 0)) {
            const newZip = queues.map(queue => queue.shift());
            lastSent = newZip;
            return currentFunc(...newZip);
        }
        
        // Otherwise, return the previously emitted zipped result (or no_compute if none)
        return lastSent;
    }, "zip")(f, ...args, output);
}

export const r_or = (output: Cell<any>, ...args: Cell<any>[]) => {
    // hack to force the cells to be fresh
    args.forEach((arg) => {
       const value = cell_strongest_base_value(arg)
       if(is_nothing(value)){
         initialize(arg, value)
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

        return result;
    })(output, ...args);
}

export const r_divide = (output: Cell<any>, ...args: Cell<any>[]) => {
    return make_operator("divide", (...args: number[]) => args.slice(1).reduce((a, b) => a / b, args[0]))(output, ...args);
}

export const r_reduce_array = (f: (a: any, b: any) => any, initial: any) => {
    return make_operator("reduce_array", (base: any[]) =>{
        const result = base.slice(1).reduce(f, base[0]);
        return result;
    });
}

export const r_delay = (
    output: Cell<any>,
    arg: Cell<any>,
    initial?: any
) => {
    // Initialize "last" with annotated initial value if provided, or leave undefined.
    let last: LayeredObject | undefined =
        initial !== undefined ? annotate_now_with_id(cell_id(output))(initial) : undefined;

    return construct_reactive_propagator((...args: LayeredObject[]) => {
        // Get the newest value from the input cell.
        const curr = get_base_value(args[args.length - 1]);
        // We annotate the current value with the output cell's id (for tracking/timestamp purposes).
        const annotatedCurr = annotate_now_with_id(cell_id(output))(curr);

        if (last === undefined) {
            // First update: save the value but do not emit it.
            last = annotatedCurr;
            return no_compute;
        } else {
            // On subsequent updates, output the stored previous value,
            // and then update "last" with the current annotated value.
            const ret = last;
            last = annotatedCurr;
            return ret;
        }
    }, "delay")(arg, output);
}

export const r_first = (output: Cell<any>, arg: Cell<any>) => {
    var first_arg: LayeredObject | undefined = undefined;
    return construct_reactive_propagator((...args: LayeredObject[]) => {
        if(first_arg === undefined){
            first_arg = args[0];
            return args[0];
        }
        else{
            return annotate_now_with_id(cell_id(output))(first_arg);
        }
    }, "first")(arg, output);
}

// export const r_cal_ratio = (output: Cell<any>, a: Cell<any>, b: Cell<any>) => {
//     // @ts-ignore
//     return construct_reactive_propagator((a: LayeredObject, b: LayeredObject) => {
//         // ratio is calculated only when the input is updated from user aspect
//         // which means the strongest value of input only have one timestamp(not propagated)
//         const input_timestamp = get_traced_timestamp_layer(a)
//         const output_timestamp = get_traced_timestamp_layer(b)
//         if(set_get_length(input_timestamp) === 1 && set_get_length(output_timestamp) > 1) {
//             return get_base_value(a) / get_base_value(b)
//         }
//         else{
//             return no_compute
//         }

//     }, "cal_ratio")(a, b, output);
// }

// sum solver is temporarily gaved up 
// because in real life situation to recalculate inputs could be triggered by drag event
// then it would be very different
// export function c_sum_propotional(output: Cell<number>, ...inputs: Cell<number>[]) {
//     // for some reason c_sum can only work by setting handle_contradiction to trace_earliest_emerged_value
//     return compound_propagator(inputs, [output], () => {
//         r_add(output, ...inputs);

//         const ratios = inputs.map((input) => {
//             const ratio_out = construct_cell("ratio" + get_new_reference_count())
//             r_cal_ratio(ratio_out, input, output)
//             return ratio_out;
//         });

    
//         //calculate the product of each input and its ratio by zip
//         inputs.forEach((input, index) => {
//             r_multiply(input, output, ratios[index]);
//         });


//         return construct_reactor();
//     }, "c_sum_propotional")
// }


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

// ------------------------------------------------------------
// New correct proportional sum propagation operator
// This operator works bidirectionally as follows:
// 1. When any input is updated, it computes the new sum (= input1 + input2 + ...),
//    calculates ratios (input_i / sum) and updates the output with the new sum.
// 2. When the output is updated (and no input update is detected), it propagates the change back
//    to each input proportionally using the previously computed ratios.

// export function c_sum_proportional_correct(output: Cell<number>, ...inputs: Cell<number>[]) {
//     // Create an internal ratio cell for each input
//     let ratios = inputs.map(() => {
//          const r = construct_cell("ratio" + get_new_reference_count());
//          update(r, 0);
//          return r;
//     });
//     // Closure variable to store the last propagated sum
//     let prevSum: number | undefined = undefined;

//     // Use a compound propagator to listen to changes from inputs and output
//     return compound_propagator(inputs, [output], () => {
//          const currentInputs = inputs.map(i => get_base_value(i));
//          const forwardSum = currentInputs.reduce((acc, val) => acc + val, 0);
//          const outVal = get_base_value(output);

//          // If an input update is detected (forwardSum changed)
//          if (prevSum === undefined || forwardSum !== prevSum) {
//               if (forwardSum !== 0) {
//                   ratios.forEach((r, i) => {
//                       update(r, currentInputs[i] / forwardSum);
//                   });
//               } else {
//                   // If the sum is 0, distribute equally among inputs
//                   ratios.forEach((r, i) => {
//                       update(r, 1 / inputs.length);
//                   });
//               }
//               if (outVal !== forwardSum) {
//                   update(output, forwardSum);
//               }
//               prevSum = forwardSum;
//          } else {
//               // No input update detected; if output changed, propagate backward to inputs
//               if (outVal !== forwardSum) {
//                   ratios.forEach((r, i) => {
//                       const newInputVal = outVal * get_base_value(r);
//                       if (newInputVal !== currentInputs[i]) {
//                           update(inputs[i], newInputVal);
//                       }
//                   });
//                   prevSum = outVal;
//               }
//          }
//          return construct_reactor();
//     }, "c_sum_proportional_correct");
// }