import { primitive_propagator, constraint_propagator, Propagator } from "./Propagator"; 
import { multiply, divide } from "./Cell/GenericArith";
import { Cell } from "./Cell/Cell";
import { merge,  type Reactor } from "./Reactivity/Reactor";
import { add, subtract} from "./Cell/GenericArith";

export const p_add =  primitive_propagator((...inputs: any[]) => {
    const result = inputs.slice(1).reduce((acc, curr) => add(acc, curr), inputs[0]);

    return result;
}, "add");

export const p_subtract =  primitive_propagator((...inputs: any[]) => {
    const result = inputs.slice(1).reduce((acc, curr) => subtract(acc, curr), inputs[0]);
    return result;
}, "subtract");

export const p_multiply =  primitive_propagator((...inputs: any[]) => {
    const result = inputs.slice(1).reduce((acc, curr) => multiply(acc, curr), inputs[0]);
   
    return result;
}, "multiply");

export const p_divide = primitive_propagator((...inputs: any[]) => {
    return inputs.slice(1).reduce((acc, curr) => divide(acc, curr), inputs[0]);
}, "subdivide"); 


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



