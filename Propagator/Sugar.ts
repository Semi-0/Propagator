import { construct_cell, type Cell } from "@/cell/Cell";
import { p_add, p_divide, p_multiply, p_subtract } from "./BuiltInProps";
import type { Propagator } from "./Propagator";

var count = 0

function get_new_name(){
    let name = "#temp_cell_" + count;
    count += 1;
    return name;
}

// f means looks like a function
function make_f_arithmetical(propagator_constructor: (...args: any[]) => Propagator){
    (...inputs: Cell[]) => {
        let result = construct_cell(get_new_name());
        propagator_constructor.apply([...inputs, result])

        return result;
    }
}

export const f_add = make_f_arithmetical(p_add);

export const f_subtract = make_f_arithmetical(p_subtract);

export const f_multiply = make_f_arithmetical(p_multiply);

export const f_divide = make_f_arithmetical(p_divide);