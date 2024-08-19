// import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
// import { ValueSet } from "./ValueSet";
// import { match_args } from "generic-handler/Predicates";
// // TODO: ADD GENRIC SUPPORT FOR VALUE SET AND NOTHING

// const mul = construct_simple_generic_procedure(
//     "mul",
//     2,
//     (a: number, b: number) => {
//         return a * b
//     }
// );

// const div = construct_simple_generic_procedure(
//     "div",
//     2,
//     (a: number, b: number) => {
//         return a / b
//     }
// );

// const add = construct_simple_generic_procedure(
//     "add",
//     2,
//     (a: number, b: number) => {
//         return a + b
//     }
// ); 

// const sub = construct_simple_generic_procedure(
//     "sub",
//     2,
//     (a: number, b: number) => {
//         return a - b
//     }
// );



// // define_generic_procedure_handler(mul, 
// //     match_args(
// //         isValu/
    
// //     )
// // );

// export function v_add(a: ValueSet, b: ValueSet): ValueSet {
//     return a.flatMap(x => b.map(y => x + y));
// }

// export function v_sub(a: ValueSet, b: ValueSet): ValueSet {
//     return a.flatMap(x => b.map(y => x - y));
// }

// export function v_mul(a: ValueSet, b: ValueSet): ValueSet {
//     return a.flatMap(x => b.map(y => x * y));
// }

// export function v_div(a: ValueSet, b: ValueSet): ValueSet {
//     return a.flatMap(x => b.map(y => x / y));
// }