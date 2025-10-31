import { construct_cell, type Cell } from "@/cell/Cell";
import {  p_add, p_divide, p_equal, p_less_than, p_multiply, p_subtract, p_switch } from "./BuiltInProps";
import { propagator_name, type Propagator } from "./Propagator";
import { make_temp_cell } from "@/cell/Cell";
import { get_new_reference_count } from "../Helper/Helper";




// ce shorts for cell 
export function make_ce_arithmetical(propagator_constructor: (...args: any[]) => Propagator, name: string | undefined = undefined){
    return (...inputs: Cell<any>[]) => {
        if (name != undefined){
            let result =  construct_cell(name + "_" +  String(get_new_reference_count()))
            propagator_constructor(...[...inputs, result]);
            return result;
        }
        else{
             let result = make_temp_cell()
             propagator_constructor(...[...inputs, result]);
             return result;
        }
    }
}

export const ce_compose = (...operators: ((...cells: Cell<any>[]) => void)[]) => {
    return (initial: Cell<any>) => {
        let current = initial;
        let result: Cell<any> = make_temp_cell();

        operators.forEach((operator, index) => {
            if (index === operators.length - 1) {
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

export const ce_pipe = (arg_cell: Cell<any>, ...operators: ((...cells: Cell<any>[]) => Propagator)[]) => {
    return ce_compose(...operators)(arg_cell);
}

export const link = (A: Cell<any>, B: Cell<any>, ...operators: ((...cells: Cell<any>[]) => Propagator)[]) => {
    let current = A;
    var middle = make_temp_cell();
    let result = B;

    operators.forEach((operator, index) => {
        if (index === operators.length - 1) {
            operator(...[current, result]);
        } else {
            const propagator = operator(...[current, middle]);
            current = middle;
            middle = construct_cell(propagator_name(propagator) + "_" + "result")
        }
    });
}

export const bi_pipe = (A: Cell<any>, B: Cell<any>, AtoB: ((...cells: Cell<any>[]) => Propagator)[], BtoA: ((...cells: Cell<any>[]) => Propagator)[]) => {
    link(A, B, ...AtoB);
    link(B, A, ...BtoA);
}
