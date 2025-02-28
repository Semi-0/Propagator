import { primitive_propagator, constraint_propagator,type Propagator, compound_propagator, function_to_primitive_propagator } from "./Propagator"; 
import { multiply, divide } from "../AdvanceReactivity/Generics/GenericArith";
import { make_temp_cell, type Cell, cell_strongest, cell_name, cell_content } from "../Cell/Cell";
import { merge,  subscribe,  type Reactor, map, construct_reactor } from "../Shared/Reactivity/Reactor";
import { add, subtract} from "../AdvanceReactivity/Generics/GenericArith";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { not } from "../AdvanceReactivity/Generics/GenericArith";
import { is_nothing, the_nothing } from "@/cell/CellValue";
import { get_base_value } from "sando-layer/Basic/Layer";

import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { less_than, equal } from "../AdvanceReactivity/Generics/GenericArith";
import { base_equal } from "../Shared/base_equal";
import { pipe } from "fp-ts/lib/function";
import { no_compute } from "../Helper/noCompute";
import { for_each } from "../Helper/Helper";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { bi_pipe, link } from "./Sugar";
import { make_ce_arithmetical } from "./Sugar";




// export const p_switch = (condition: Cell<boolean>, value: Cell<any>, output: Cell<any>) => primitive_propagator((condition: boolean, value: any) => {
//     if (base_equal(condition, true)){
//         return value;
//     }
//     else{
//         return no_compute
//     }
// }, "switcher")(condition, value, output);

export const p_switch = function_to_primitive_propagator("switch", (condition: boolean, value: any) => {
    if (is_nothing(condition)){
        return no_compute;
    }
    else if (base_equal(condition, true)){
        return value;
    }
    else{
        return no_compute
    }
})


export const p_equal = primitive_propagator((x: any, y: any) => {
    return equal(x, y)
}, "equal")

export const p_not = primitive_propagator((input: any) => {
    return not(input);
}, "not");

export const p_less_than = primitive_propagator((x: any, y: any) => {
    return less_than(x, y);
}, "less_than");

export const p_add = primitive_propagator((...inputs: any[]) => {
    // Check if there are inputs
    if (inputs.length === 0) {
        return 0; // Return 0 for empty input, or consider throwing an error
    }
    return inputs.reduce((acc, curr) => add(acc, curr));
}, "+");

export const p_subtract = primitive_propagator((...inputs: any[]) => {
    // Check if there are inputs
    if (inputs.length === 0) {
        return 0; // Return 0 for empty input, or consider throwing an error
    }
    if (inputs.length === 1) {
        return inputs[0]; // Return the single input if only one is provided
    }
    // Subtract all subsequent inputs from the first input
    return inputs.slice(1).reduce((acc, curr) => subtract(acc, curr), inputs[0]);
}, "-");

export const p_multiply =  primitive_propagator((...inputs: any[]) => {
    const result = inputs.slice(1).reduce((acc, curr) => multiply(acc, curr), inputs[0]);
   
    return result;
}, "*");

export const p_divide = primitive_propagator((...inputs: any[]) => {
    return inputs.slice(1).reduce((acc, curr) => divide(acc, curr), inputs[0]);
}, "/"); 

export const p_sync = function_to_primitive_propagator("sync", (input: any) => {
    return input;
})

export const p_reduce = (f: (a: any, b: any) => any, initial: any) => {
    let acc = initial;
    return function_to_primitive_propagator("reduce", (inputs: any) => {
        acc = f(acc, inputs);
        return acc;
    })
}

export const p_filter_a = (f: (a: any) => boolean) => {
    return function_to_primitive_propagator("filter", (inputs: any) => {
        if (f(inputs)){
            return inputs;
        }
        else{
            return no_compute;
        }
    })
}

export const p_filter_b = function_to_primitive_propagator("filter", (input: any, predicate: (a: any) => boolean) => {
    if (predicate(input)){
        return input;
    }
    else{
        return no_compute;
    }
})

export const p_index = (index: number) => {
    // index for time sequence
    var acc_index = 0;

    return function_to_primitive_propagator("index", (input: any) => {
        acc_index++;
        if (acc_index === index){
            return input;
        }
        else{
            return no_compute;
        }
    })
}

export const p_first = p_index(0);

export const p_array_first = function_to_primitive_propagator("array_first", (input: any[]) => {
    return input[0];
})

export const p_map_a = (f: (a: any) => any) => {
    return function_to_primitive_propagator("map", (inputs: any) => {
        return f(inputs);
    })
} 

export const p_map_b = function_to_primitive_propagator("map", (input: any, f: (a: any) => any) => {
    return f(input);
}) 

export const p_zip = (to_zip: Cell<any>[], f: Cell<any>, output: Cell<any>) => {
    const queues: any[][] = to_zip.map(() => []);
    // last emitted zipped result; initially no_compute
    let lastSent: any = no_compute;
    // @ts-ignore
    return function_to_primitive_propagator("zip", (f: (...a: any[]) => any, ...objects: any[]) => {
        // Exclude the output cell from the inputs
        
      
        // For each input, if currentValue is valid and it is new compared to the last queued value or the last emitted value,
        // then push it into its respective queue
        for (let i = 0; i < objects.length; i++) {
            const curr = objects[i];
            // If we haven't emitted any value yet, or the last emitted value for input i is different
            if (lastSent === no_compute || (Array.isArray(lastSent) && lastSent[i] !== curr)) {
                queues[i].push(curr);
            }
      
        }

        // If every input's queue has at least one element, consume one from each to produce a new zipped result
        if (queues.every(queue => queue.length > 0)) {
            const newZip = queues.map(queue => queue.shift());
            lastSent = newZip;
            return f(...newZip);
        }
        
        // Otherwise, return the previously emitted zipped result (or no_compute if none)
        return no_compute;
    })(f, ...to_zip, output);
}

export const p_and = function_to_primitive_propagator("and", (...inputs: any[]) => {
    for (let i = 0; i < inputs.length; i++){
        if (inputs[i] === false){
            return false;
        }
    }
    return true;
})

export const p_or = function_to_primitive_propagator("or", (...inputs: any[]) => {
    for (let i = 0; i < inputs.length; i++){
        if (inputs[i] === true){
            return true;
        }
    }
    return false;
})
export const comp_reactive_or = (inputs: Cell<any>[], output: Cell<any>) => {
    return compound_propagator(inputs, [output], () => {
        for_each(inputs, (i: Cell<any>) => {
            return p_sync(i, output)
        })
    }, "or")
}


export const com_celsius_to_fahrenheit = (celsius: Cell<number>, fahrenheit: Cell<number>) => { 
    return compound_propagator([celsius, fahrenheit], [celsius, fahrenheit], () => {
        link(
            celsius,
            fahrenheit,
            p_filter_a(x => x !== the_nothing),
            p_map_a((c: number) => c * 9/5 + 32)
        );

        link(
            fahrenheit,
            celsius,
            p_filter_a(x => x !== the_nothing),
            p_map_a((f: number) => (f - 32) * 5/9)
        );
    }, "celsius_to_fahrenheit")
}

export const com_meters_feet_inches = (meters: Cell<number>, feet: Cell<number>, inches: Cell<number>) => {
    return compound_propagator([meters, feet, inches], [meters, feet, inches], () => {
        bi_pipe(
            meters, 
            feet,
            // meters to feet
            [
              p_filter_a(x => x !== the_nothing),
              p_map_a((m: number) => m * 3.28084)
            ],
            // feet to meters
            [
              p_filter_a(x => x !== the_nothing),
              p_map_a((ft: number) => ft / 3.28084)
            ]
          );

          // Bi-directional conversion between feet and inches
          bi_pipe(
            feet,
            inches,
            // feet to inches
            [
              p_filter_a(x => x !== the_nothing),
              p_map_a((ft: number) => ft * 12)
            ],
            // inches to feet
            [
              p_filter_a(x => x !== the_nothing),
              p_map_a((inch: number) => inch / 12)
            ]
          );
        },
        "length_converter"
    )
}

export function com_if(condition: Cell<boolean>, then: Cell<any>, otherwise: Cell<any>, output: Cell<any>){
    return compound_propagator([condition, then, otherwise], [output], () => {
       p_switch(condition, then, output);
       p_switch(ce_not(condition), otherwise, output);
    }, "if")
}
            

export function c_multiply(x: Cell<number>, y: Cell<number>, product: Cell<number>){
    // Some Weird bug if i try to figure out y through constraint it would always failed into infinite loop
    // i think it was happened due to execution order in here
    // if there is a moment when m and s1 has established but s2 not 
    // then it would cause infinite loop
    return constraint_propagator([x, y, product], () => {
        const m = p_multiply(x, y, product);
        const s1 = p_divide(product, x, y);
        const s2 = p_divide(product, y, x);
    }, "c:*")
}

export function c_subtract(x: Cell<number>, y: Cell<number>, difference: Cell<number>){
    return constraint_propagator([x, y, difference], () => {
        const m = p_subtract(x, y, difference);
        const s1 = p_divide(difference, x, y);
        const s2 = p_divide(difference, y, x);
    }, "c:-")
}

export function c_divide(x: Cell<number>, y: Cell<number>, quotient: Cell<number>){
    return constraint_propagator([x, y, quotient], () => {
        const m = p_divide(x, y, quotient);
        const s1 = p_divide(quotient, x, y);
        const s2 = p_divide(quotient, y, x);
    }, "c:/")
}   

export function c_add(x: Cell<number>, y: Cell<number>, sum: Cell<number>){
    return constraint_propagator([x, y, sum], () => {
        const m = p_add(x, y, sum);
        const s1 = p_subtract(sum, x, y);
        const s2 = p_subtract(sum, y, x);
    }, "c:+")
}



export const ce_add = make_ce_arithmetical(p_add);

export const ce_subtract = make_ce_arithmetical(p_subtract);

export const ce_multiply = make_ce_arithmetical(p_multiply);

export const ce_divide = make_ce_arithmetical(p_divide);

export const ce_equal = make_ce_arithmetical(p_equal);

export const ce_switch = make_ce_arithmetical(p_switch);

export const ce_less_than = make_ce_arithmetical(p_less_than);

// @ts-ignore
export const ce_not: (input: Cell<boolean>) => Cell<boolean> = make_ce_arithmetical(p_not);

export const ce_and = make_ce_arithmetical(p_and);

export const ce_or = make_ce_arithmetical(p_or);

