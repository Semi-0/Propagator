import { construct_cell, type Cell } from "@/cell/Cell";
import { p_add, p_divide, p_equal, p_multiply, p_subtract, p_switcher } from "./BuiltInProps";
import type { Propagator } from "./Propagator";

var count = 0

function get_new_name(){
    let name = "#temp_cell_" + count;
    count += 1;
    return name;
}

// f means looks like a function
function make_f_arithmetical(propagator_constructor: (...args: any[]) => Propagator){
    return (...inputs: Cell[]) => {
        let result = construct_cell(get_new_name());
     
        propagator_constructor(...[...inputs, result]);

        return result;
    }
}

export const f_add = make_f_arithmetical(p_add);

export const f_subtract = make_f_arithmetical(p_subtract);

export const f_multiply = make_f_arithmetical(p_multiply);

export const f_divide = make_f_arithmetical(p_divide);

export const f_equal = make_f_arithmetical(p_equal);

export const f_switch = make_f_arithmetical(p_switcher);