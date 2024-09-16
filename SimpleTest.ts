// import { isNumber } from "effect/Predicate";
import { Cell, add_cell_content } from "./Cell/Cell";

import { Propagator, constraint_propagator, primitive_propagator } from "./Propagator";  
import { get_all_cells, observe_all_cells } from "./PublicState";


import { combineLatestAll, of, type BehaviorSubject, type Observable, map, combineLatest, Subscription, tap } from "rxjs";
import { support_by } from "sando-layer/Specified/SupportLayer";
import { construct_value_set } from "./DataTypes/ValueSet";
import { multiply, divide, add, subtract } from "generic-handler/built_in_generics/generic_arithmetic";
import { one_of_args_match } from "generic-handler/Predicates";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { is_nothing, the_nothing } from "./Cell/CellValue";
import { force } from "./Cell/GenericArith";

force();



const p_multiply =  primitive_propagator((...inputs: any[]) => {
    // console.log("multiple inputs", inputs);
    const result = inputs.reduce((acc, curr) => multiply(acc, curr), construct_value_set([]));
   
    // console.log("multiply result", result);
    return result;
}, "multiply");

const p_subdivide = primitive_propagator((...inputs: any[]) => {
    // console.log("subdivide inputs", inputs);
    return inputs.slice(1).reduce((acc, curr) => divide(acc, curr), inputs[0]);
}, "subdivide"); 


function c_multiply(x: Cell, y: Cell, product: Cell){
    return constraint_propagator([x, y, product], () => {
        p_multiply(x, y, product);
        p_subdivide(product, x, y);
        p_subdivide(product, y, x);
    }, "c:*")
}


function tell(cell: Cell, value: any, support: string){
   add_cell_content(cell, support_by(value, support));
}

function configure_value_set(cell: Cell, value: any, support: string){
    add_cell_content(cell, support_by(value, support));
}

const x = new Cell("x");
const y = new Cell("y");
const product = new Cell("product");

observe_all_cells((cell_value: any[]) =>{
    console.log("cell_value", cell_value);
})



// combineLatest([x.getStrongest(), y.getStrongest(), product.getStrongest()]).pipe(
//     tap(values => console.log("values", values))
// ).subscribe();

// x.getStrongest().subscribe(value => console.log("x update", value));



c_multiply(x, y, product);
// console.log("before");
// get_all_cells().forEach(cell => console.log(cell.summarize()));

tell(x, 4, "fst");
// get_all_cells().forEach(cell => console.log(cell.summarize()));

// tell(product, 40, "fst");
// get_all_cells().forEach(cell => console.log(cell.summarize()));


// console.log(x.summarize());
// console.log(y.summarize());
// console.log(product.summarize());

// tell(x, 5);
// get_all_cells().forEach(cell => console.log(cell.summarize()));