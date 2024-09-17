// import { isNumber } from "effect/Predicate";
import { Cell } from "./Cell/Cell";
import {  constraint_propagator, primitive_propagator } from "./Propagator";  
import { monitor_change, tell } from "./ui";
import { add, divide, multiply, subtract } from "./Cell/GenericArith";


import { construct_value_set } from "./DataTypes/ValueSet";


import { force } from "./Cell/GenericArith";
import { Relation } from "./DataTypes/Relation";

force();




const p_multiply =  primitive_propagator((...inputs: any[]) => {
    // console.log("multiple inputs", inputs);
    const result = inputs.slice(1).reduce((acc, curr) => multiply(acc, curr), inputs[0]);
   
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

monitor_change();

const x = new Cell("x");
const y = new Cell("y");
const product = new Cell("product");



// combineLatest([x.getStrongest(), y.getStrongest(), product.getStrongest()]).pipe(
//     tap(values => console.log("values", values))
// ).subscribe();

// x.getStrongest().subscribe(value => console.log("x update", value));



c_multiply(x, y, product);
// console.log("before");
// get_all_cells().forEach(cell => console.log(cell.summarize()));

tell(x, 4, "fst");
// get_all_cells().forEach(cell => console.log(cell.summarize()));

tell(product, 40, "fst");
// get_all_cells().forEach(cell => console.log(cell.summarize()));


// console.log(x.summarize());
// console.log(y.summarize());
// console.log(product.summarize());

// tell(x, 5);
// get_all_cells().forEach(cell => console.log(cell.summarize()));