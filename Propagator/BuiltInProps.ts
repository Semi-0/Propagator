import { primitive_propagator, constraint_propagator,type Propagator, compound_propagator } from "./Propagator"; 
import { multiply, divide } from "../Cell/GenericArith";
import { make_temp_cell, type Cell } from "../Cell/Cell";
import { merge,  type Reactor } from "../Shared/Reactivity/Reactor";
import { add, subtract} from "../Cell/GenericArith";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { not } from "../Cell/GenericArith";
import { the_nothing } from "@/cell/CellValue";
import { get_base_value } from "sando-layer/Basic/Layer";
import { base_equal } from "../Shared/PublicState";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { less_than } from "generic-handler/built_in_generics/generic_arithmetic";



// Cons Cdr Pair 
// Stategy instead of directly passing the value 
// passing a pointer to the value ( with curried propagator or reactor)
// so pair atom could be seperated from the value it point to

export const p_switcher = primitive_propagator((condition: boolean, value: any) => {
    if (base_equal(condition, true)){
        return value;
    }
    else{
        return the_nothing
    }
}, "switcher")

export const p_equal = primitive_propagator((x: any, y: any) => {
    return base_equal(x, y)
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

// function make_pair(fst: any, snd: any){
//     return [fst, snd];
// }

// export const p_pair = primitive_propagator((fst: any, snd: any) => {
//     return [fst, snd];
// }, "p:pair")

// export function c_pair(fst: Cell, snd: Cell, visitor: propagator){
//     return compound_propagator([fst, snd],  [pair], () => {
        
        
//     }, "c:pair")
// }


export function c_multiply(x: Cell, y: Cell, product: Cell){
    // Some Weird bug if i try to figure out y through constraint it would always failed into infinite loop
    // i think it was happened due to execution order in here
    // if there is a moment when m and s1 has established but s2 not 
    // then it would cause infinite loop
    return constraint_propagator([x, y, product], () => {
        const m = p_multiply(x, y, product).getActivator();
        const s1 = p_divide(product, x, y).getActivator();
        const s2 = p_divide(product, y, x).getActivator();

        return merge(m, s1, s2) as Reactor<any>
    }, "c:*")
}

export function c_subtract(x: Cell, y: Cell, difference: Cell){
    return constraint_propagator([x, y, difference], () => {
        const m = p_subtract(x, y, difference).getActivator();
        const s1 = p_divide(difference, x, y).getActivator();
        const s2 = p_divide(difference, y, x).getActivator();

        return merge(m, s1, s2) as Reactor<any>
    }, "c:-")
}

export function c_divide(x: Cell, y: Cell, quotient: Cell){
    return constraint_propagator([x, y, quotient], () => {
        const m = p_divide(x, y, quotient).getActivator();
        const s1 = p_divide(quotient, x, y).getActivator();
        const s2 = p_divide(quotient, y, x).getActivator();

        return merge(m, s1, s2) as Reactor<any>
    }, "c:/")
}   

export function c_add(x: Cell, y: Cell, sum: Cell){
    return constraint_propagator([x, y, sum], () => {
        const m = p_add(x, y, sum).getActivator();
        const s1 = p_subtract(sum, x, y).getActivator();
        const s2 = p_subtract(sum, y, x).getActivator();

        return merge(m, s1, s2) as Reactor<any>
    }, "c:+")
}






