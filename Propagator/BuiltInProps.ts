import { primitive_propagator, constraint_propagator,type Propagator } from "./Propagator"; 
import { multiply, divide } from "../Cell/GenericArith";
import { type Cell } from "../Cell/Cell";
import { merge,  type Reactor } from "../Shared/Reactivity/Reactor";
import { add, subtract} from "../Cell/GenericArith";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { not } from "../Cell/GenericArith";
import { the_nothing } from "@/cell/CellValue";
import { get_base_value } from "sando-layer/Basic/Layer";
import { base_equal } from "../Shared/PublicState";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";


export const p_switcher = primitive_propagator((condition: boolean, value: any) => {
    console.log(condition)
    if (base_equal(condition, true)){
        console.log("switch true")
        return value;
    }
    else{
        console.log("switch false")
        return the_nothing
    }
}, "switcher")

export const p_equal = primitive_propagator((x: any, y: any) => {
    return x === y;
}, "equal")

export const p_not = primitive_propagator((input: any) => {

    return not(input);
}, "not");

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


export function c_multiply(x: Cell, y: Cell, product: Cell){
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



