import { primitive_propagator, constraint_propagator,type Propagator, compound_propagator, function_to_primitive_propagator, construct_propagator, error_logged_primitive_propagator } from "./Propagator"; 
import { multiply, divide, greater_than, and, or, install_propagator_arith_pack, feedback } from "../AdvanceReactivity/Generics/GenericArith";
import { make_temp_cell, type Cell, cell_strongest, cell_name, cell_content, construct_cell } from "../Cell/Cell";
import { Reactive } from "../Shared/Reactivity/ReactiveEngine";
import { add, subtract} from "../AdvanceReactivity/Generics/GenericArith";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { not } from "../AdvanceReactivity/Generics/GenericArith";
import { is_nothing, the_nothing } from "@/cell/CellValue";
import { get_base_value } from "sando-layer/Basic/Layer";
import { for_each } from "generic-handler/built_in_generics/generic_collection";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { less_than, equal } from "../AdvanceReactivity/Generics/GenericArith";
import { base_equal } from "../Shared/base_equal";
import { no_compute } from "../Helper/noCompute";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { bi_pipe, ce_pipe, link } from "./Sugar";
import { make_ce_arithmetical } from "./Sugar";
import { r_constant } from "../AdvanceReactivity/interface";

export const p_switch = (condition: Cell<boolean>, value: Cell<any>, output: Cell<any>) => function_to_primitive_propagator("switch", (condition: boolean, value: any) => { 
    if (base_equal(condition, true)){
        return value;
    }
    else{
        return no_compute
    }
})(condition, value, output)


export const p_equal = error_logged_primitive_propagator(equal, "equal")

export const p_not = error_logged_primitive_propagator(not, "not");

export const p_less_than = error_logged_primitive_propagator(less_than, "less_than");

export const p_add = error_logged_primitive_propagator(add, "+");

export const p_subtract = error_logged_primitive_propagator(subtract, "-");

export const p_multiply =  error_logged_primitive_propagator(multiply, "*");

export const p_divide = error_logged_primitive_propagator(divide, "/"); 

export const p_greater_than = error_logged_primitive_propagator(greater_than, ">");

export const p_sync = function_to_primitive_propagator("sync", (input: any) => {
    return input;
})

export const p_feedback = error_logged_primitive_propagator(feedback, "feedback")

export const p_and = error_logged_primitive_propagator(and, "and")

export const p_or = error_logged_primitive_propagator(or, "or")

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

export const c_if_a = (condition: Cell<boolean>, then: Cell<any>, otherwise: Cell<any>, output: Cell<any>) => {
    return compound_propagator([condition, then, otherwise], [output], () => {
        p_switch(condition, then, output);
        p_switch(ce_not(condition), otherwise, output);
    }, "if")
}


export const c_if_b = (condition: Cell<boolean>, input: Cell<any>, then_out: Cell<any>, otherwise_out: Cell<any>) => {
    return compound_propagator([condition, input, then_out, otherwise_out], [input], () => {
        p_switch(condition, input, then_out);
        p_switch(ce_not(condition), input, otherwise_out);
    }, "if")
}


export const c_if_c = (condition: Cell<boolean>, then_in: Cell<any>,  then_out: Cell<any>, otherwise_in: Cell<any>, otherwise_out: Cell<any>) => {
    return compound_propagator([condition, then_in, otherwise_in], [then_out, otherwise_out], () => {
        p_switch(condition, then_in, then_out);
        p_switch(ce_not(condition), otherwise_in, otherwise_out);
    }, "if")
}


export const p_less_than_or_equal = (a: Cell<number>, b: Cell<number>, output: Cell<boolean>) => {
    return compound_propagator([a, b], [output], () => {
        p_or(ce_less_than(a, b), ce_equal(a, b), output)
    }, "less_than_or_equal")
}

export const p_greater_than_or_equal = (a: Cell<number>, b: Cell<number>, output: Cell<boolean>) => {
    return compound_propagator([a, b], [output], () => {
        p_or(ce_greater_than(a, b), ce_equal(a, b), output)
    }, "greater_than_or_equal")
}

export const p_between = (input: Cell<number>, min: Cell<number>, max: Cell<number>, output: Cell<number>) => {
    return compound_propagator([input, min, max], [output], () => {
        p_and(ce_less_than_or_equal(input, max), ce_greater_than_or_equal(input, min), output)
    }, "between")
}

export const p_range = (input: Cell<number>, min: Cell<number>, max: Cell<number>, output: Cell<number>) => {
    return compound_propagator([input, min, max], [output], () => {

        const less_than: Cell<boolean> = ce_less_than(input, min)
        const greater_than: Cell<boolean> = ce_greater_than(input, max)
        const in_range: Cell<boolean> = ce_between(input, min, max)
        p_switch(less_than, min, output)
        p_switch(greater_than, max, output)
        p_switch(in_range, input, output)
    }, "range")
}


export const c_range = (input: Cell<number>, min: Cell<number>, max: Cell<number>) => {
    return compound_propagator([input, min, max], [input], () => {
        const less_than: Cell<boolean> = ce_less_than(input, min)
        const greater_than: Cell<boolean> = ce_greater_than(input, max)
        
        const temp: Cell<number> = construct_cell("temp")

        
        p_switch(less_than, min, temp)
        p_switch(greater_than, max, temp)

        p_feedback(temp, input)
    }, "range")
}

export const p_zip = (to_zip: Cell<any>[], f: Cell<any>, output: Cell<any>) => {
    // TODO: Memory leak!!!!
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



export const p_composite = (inputs: Cell<any>[], output: Cell<any>) => {
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


// @ts-ignore
export const ce_add: (x: Cell<number>, y: Cell<number>) => Cell<number> = make_ce_arithmetical(p_add, "add");

// @ts-ignore
export const ce_subtract: (x: Cell<number>, y: Cell<number>) => Cell<number> = make_ce_arithmetical(p_subtract, "subtract");

// @ts-ignore
export const ce_multiply: (x: Cell<number>, y: Cell<number>) => Cell<number> = make_ce_arithmetical(p_multiply, "multiply");

// @ts-ignore
export const ce_divide: (x: Cell<number>, y: Cell<number>) => Cell<number> = make_ce_arithmetical(p_divide, "divide");

// @ts-ignore
export const ce_equal: (x: Cell<number>, y: Cell<number>) => Cell<boolean> = make_ce_arithmetical(p_equal, "equal");

// @ts-ignore
export const ce_switch: (condition: Cell<boolean>, value: Cell<any>) => Cell<any> = make_ce_arithmetical(p_switch, "switch");

// @ts-ignore
export const ce_less_than: (x: Cell<number>, y: Cell<number>) => Cell<boolean> = make_ce_arithmetical(p_less_than, "less_than");

// @ts-ignore
export const ce_greater_than: (x: Cell<number>, y: Cell<number>) => Cell<boolean> = make_ce_arithmetical(p_greater_than, "greater_than");

// @ts-ignore
export const ce_not: (input: Cell<boolean>) => Cell<boolean> = make_ce_arithmetical(p_not, "not");

// @ts-ignore
export const ce_and: (...inputs: Cell<boolean>[]) => Cell<boolean> = make_ce_arithmetical(p_and, "and");

// @ts-ignore
export const ce_or: (...inputs: Cell<boolean>[]) => Cell<boolean> = make_ce_arithmetical(p_or, "or");


// @ts-ignore
export const ce_less_than_or_equal: (x: Cell<number>, y: Cell<number>) => Cell<boolean> = make_ce_arithmetical(p_less_than_or_equal, "less_than_or_equal");

// @ts-ignore
export const ce_greater_than_or_equal: (x: Cell<number>, y: Cell<number>) => Cell<boolean> = make_ce_arithmetical(p_greater_than_or_equal, "greater_than_or_equal");

// @ts-ignore
export const ce_between: (input: Cell<number>, min: Cell<number>, max: Cell<number>) => Cell<boolean> = make_ce_arithmetical(p_between, "between");

// @ts-ignore
export const ce_zip = make_ce_arithmetical(p_zip, "zip");

export const ce_zip_passthrough = (cells: Cell<any>[]) => {
    return ce_zip(cells[0], r_constant(cells.slice(1), "pulse"))
}

export const p_remove_duplicates = (input: Cell<any>, output: Cell<any>) =>  {
    // TODO: Memory leak!!!!
    var last_value: any = null
    return function_to_primitive_propagator("p_remove_duplicates",
        (x: any) => {
            if (x === last_value) {
                return no_compute
            }
            else {
                last_value = x
                return x
            }
    }
    )(input, output)
}

export const p_tap = (prop: Cell<any>, f: (x: any) => void) => 
    construct_propagator(
        [prop],
        [],
        () => f(cell_strongest(prop)),
        "p_tap"
    );

export const p_combine =  (...cells: Cell<any>[]) => function_to_primitive_propagator("p_combine",
    (...args: any[]) => {
        return args
    }
)(...cells)


export const ce_combine = make_ce_arithmetical(p_combine, "combine")


export const p_as_true = p_map_a((x: any) => true)

export const p_as_false = p_map_a((x: any) => false)

export const p_pulse = (pulse: Cell<any>, input: Cell<any>, output: Cell<any>) => {
    return compound_propagator([pulse, input], [output], () => {
        const switcher: Cell<boolean> = construct_cell("switcher")
        p_as_true(pulse, switcher)
        p_as_false(input, switcher)

        p_switch(switcher, input, output)
    }, "pulse")
}




export const p_increment = (pulse: Cell<any>, output: Cell<number>, increment: Cell<number> ) => {
    return compound_propagator([pulse, output], [output], () => {
        const temp = construct_cell("temp")

        p_pulse(pulse, ce_add(output, increment), temp)
        p_feedback(temp, output)
    }, "increment")
}

export const p_dispatch = (i: Cell<string>, conds: ((input: Cell<string>) => void)[]) => {
    for (const cond of conds) {
      cond(i)
    }
}

export const p_case = (predicate: (cell: Cell<string>) => Propagator, execute: (input: Cell<string>) => void) => 
(keyboard_input: Cell<string>) => {
    const result = ce_pipe(keyboard_input, predicate)
    execute(result)
}



// export const p_switch = (condition: Cell<boolean>, value: Cell<any>, output: Cell<any>) => primitive_propagator((condition: boolean, value: any) => {
//     if (base_equal(condition, true)){
//         return value;
//     }
//     else{
//         return no_compute
//     }
// }, "switcher")(condition, value, output);