import { construct_cell, type Cell } from "@/cell/Cell";
import { p_add, p_divide, p_equal, p_less_than, p_multiply, p_subtract, p_switch } from "./BuiltInProps";
import type { Propagator } from "./Propagator";
import { make_temp_cell } from "@/cell/Cell";




// ce shorts for cell 
export function make_ce_arithmetical(propagator_constructor: (...args: any[]) => Propagator){
    return (...inputs: Cell<any>[]) => {
        let result =  make_temp_cell()
     
        propagator_constructor(...[...inputs, result]);

        return result;
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

export const ce_pipe = (arg_cell: Cell<any>, ...operators: ((...cells: Cell<any>[]) => void)[]) => {
    return ce_compose(...operators)(arg_cell);
}

export const link = (A: Cell<any>, B: Cell<any>, ...operators: ((...cells: Cell<any>[]) => void)[]) => {
    let current = A;
    let middle = make_temp_cell();
    let result = B;

    operators.forEach((operator, index) => {
        if (index === operators.length - 1) {
            operator(...[current, result]);
        } else {
            operator(...[current, middle]);
            current = middle;
        }
    });
}

export const bi_pipe = (A: Cell<any>, B: Cell<any>, AtoB: ((...cells: Cell<any>[]) => void)[], BtoA: ((...cells: Cell<any>[]) => void)[]) => {
    link(A, B, ...AtoB);
    link(B, A, ...BtoA);
}

