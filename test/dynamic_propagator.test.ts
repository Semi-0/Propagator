// import { describe, test, expect, beforeEach } from "bun:test";
// import type { Cell } from "@/cell/Cell";
// import { dynamic_propagator, function_to_primitive_propagator, primitive_propagator } from "../Propagator/Propagator";
// import type { Propagator } from "ppropogator";
// import { ce_constant, p_increment } from "../Propagator/BuiltInProps";
// import { cell_strongest_base_value, construct_cell, execute_all_tasks_sequential, p_map_a, set_merge, the_nothing } from "ppropogator";
// import { compound_tell } from "../Helper/UI";
// import { construct_vector_clock, vector_clock_layer } from "../AdvanceReactivity/victor_clock";
// import { patched } from "../PatchSystem";
// import { patched_set_merge } from "../DataTypes/GenericValueSet";

// const execute_propagator = (controller: Cell<boolean>, input: Cell<Cell<any>[]>, closure: Cell<(...args: Cell<any>[]) => Propagator>, output: Cell<any>) => {
//     const internal = function_to_primitive_propagator("execute_propagator_internal", 
//     (closure: (...args: Cell<any>[]) => Propagator, cells: Cell<any>[]) => {
//         return closure(...cells)
//     }) // because this didin't establish correct links with root

//     return dynamic_propagator(controller, [input], [output], () => {
//         const args = [closure, input, output]
//         internal(...args)
//     }, "execute_propagator")
// }

// export const inspect_neighbors = (cell: Cell<any>, output: Cell<any>) => function_to_primitive_propagator(
//     "inspect_neighbots", (a: Cell<any>) => {
//         return cell.getNeighbors()
//     }, ["addNeighbor"]
// )(cell, output)


// describe("dynamic propagator", () => {
//     test("dynamic propagator would build when controller is true and unbuild when controller is false", async () => {
        
//         set_merge(patched_set_merge)
//         const increment = function_to_primitive_propagator("increment", (x: number) => x + 1)
//         const decrement = function_to_primitive_propagator("decrement", (x: number) => x - 1)

//         const controller =  construct_cell("controller") as Cell<boolean>
//         const input = construct_cell("input") as Cell<number>
//         const cell_input = construct_cell("cell_input") as Cell<Cell<any>[]>
//         const output = construct_cell("output") as Cell<any>
//         const prop_output = construct_cell("output")
//         const closure = construct_cell("closure") as Cell<(...args: Cell<any>[]) => Propagator>

//         execute_propagator(controller, cell_input, closure, prop_output)


//         compound_tell(closure, increment, vector_clock_layer, construct_vector_clock([{
//             source: "a",
//             value: 1
//         }]))

//         compound_tell(controller, true, vector_clock_layer, construct_vector_clock([{
//             source: "a",
//             value: 1
//         }]))

//         compound_tell(cell_input, [input, output], vector_clock_layer, construct_vector_clock([{
//             source: "a",
//             value: 1
//         }]))

//         compound_tell(input, 1, vector_clock_layer, construct_vector_clock([{
//             source: "a",
//             value: 1
//         }]))

   

//         await execute_all_tasks_sequential((error: Error) => {
//             if (error) {
//                 console.log("ERROR:", error.message);
//                 console.log(error.stack);
//             }
//         });



//         expect(cell_strongest_base_value(output)).toBe(2)


//         compound_tell(controller, false, vector_clock_layer, construct_vector_clock([{
//             source: "a",
//             value: 2
//         }]))

//         compound_tell(input, 3, vector_clock_layer, construct_vector_clock([{
//             source: "a",
//             value: 2
//         }]))

//         await execute_all_tasks_sequential((error: Error) => {
//             if (error) {
//                 console.log("ERROR:", error.message);
//                 console.log(error.stack);
//             }
//         });

//         expect(cell_strongest_base_value(output)).toBe(2)
//     });
// });