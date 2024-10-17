import { expect, test, jest, beforeEach, afterEach } from "bun:test"; 

import { Cell, cell_strongest_base_value, cell_strongest_value } from "../Cell/Cell";
import { c_multiply, p_add, p_divide, p_multiply, p_subtract } from "../BuiltInProps";
import { kick_out, tell } from "../ui";
import { get_base_value, is_contradiction, the_contradiction } from "../Cell/CellValue";
import { execute_all_tasks_sequential, summarize_scheduler_state, simple_scheduler } from "../Scheduler";
import { set_global_state } from "../PublicState";
import { merge_value_sets } from "../DataTypes/ValueSet";
import { PublicStateCommand } from "../PublicState";
import { generic_merge, set_merge } from "@/cell/Merge";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { set_get_length, to_array } from "generic-handler/built_in_generics/generic_better_set";

beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP)
    set_merge(merge_value_sets)
})

test("c_multiply is propoerly working with value set", async () => {


    const x = new Cell("x");
    const y = new Cell("y");
    const product = new Cell("product");
    
    c_multiply(x, y, product);



    tell(x, 8, "fst");


    tell(product, 40, "snd");


   await  execute_all_tasks_sequential((error: Error) => {
    }).task
    
   
        expect(cell_strongest_base_value(y)).toBe(5);
})


test("causing contradiction", async () => {
    const x = new Cell("x");
    const y = new Cell("y");
    const product = new Cell("product");
    
    c_multiply(x, y, product);



    tell(x, 8, "fst");


    tell(product, 40, "snd");


    await execute_all_tasks_sequential((error: Error) => {
    }).task
    
   
    expect(cell_strongest_base_value(y)).toBe(5);


    tell(product, 5, "red");

    await execute_all_tasks_sequential((error: Error) => {}).task

    expect(is_contradiction(cell_strongest_base_value(product))).toBe(true)
}) 

test("kick out resolve contradiction", async () => {
    const x = new Cell("x");
    const y = new Cell("y");
    const product = new Cell("product");
    
    c_multiply(x, y, product);



    tell(x, 8, "fst");


    tell(product, 40, "snd");


    await execute_all_tasks_sequential((error: Error) => {
    }).task
    
   
    expect(cell_strongest_base_value(y)).toBe(5);


    tell(product, 5, "red");

    await execute_all_tasks_sequential((error: Error) => {}).task

    expect(is_contradiction(cell_strongest_base_value(product))).toBe(true)

    kick_out("red")


    await execute_all_tasks_sequential((error: Error) => {}).task

    expect(is_contradiction(cell_strongest_base_value(product))).toBe(false)
}) 


test('primitive propagator is working with multiply', async () => {
    const x = new Cell("x");
    const y = new Cell("y");
    const product = new Cell("product");

    p_multiply(x, y, product)


    tell(x, 8, "fst");
    tell(y, 5, "snd")

    await execute_all_tasks_sequential((error: Error) => {}).task

    expect(cell_strongest_base_value(product)).toBe(40)

})


test('primitive propagator is working with subtract', async () => {
    const x = new Cell("x");
    const y = new Cell("y");
    const product = new Cell("product");

    p_subtract(x, y, product)


    tell(x, 8, "fst");
    tell(y, 2, "snd")

    await execute_all_tasks_sequential((error: Error) => {}).task

    expect(cell_strongest_base_value(product)).toBe(6)

})



test('primitive propagator is working with divide', async () => {
    const x = new Cell("x");
    const y = new Cell("y");
    const product = new Cell("product");

    p_divide(x, y, product)


    tell(x, 8, "fst");
    tell(y, 2, "snd")

    await execute_all_tasks_sequential((error: Error) => {}).task

    expect(cell_strongest_base_value(product)).toBe(4)

})

test('primitive propagator is working with add', async () => {
    const x = new Cell("x");
    const y = new Cell("y");
    const product = new Cell("product");

    p_add(x, y, product)


    tell(x, 8, "fst");
    tell(y, 2, "snd")

    await execute_all_tasks_sequential((error: Error) => {}).task

    expect(cell_strongest_base_value(product)).toBe(10)

})


test('contradiction is properly propagated with primitive propagator', async () => {

    const x = new Cell("x");
    const y = new Cell("y");
    const product = new Cell("product");

    p_add(x, y, product)


    tell(x, 8, "fst");
    tell(y, 2, "snd")
    tell(product, 12, "third")

    await execute_all_tasks_sequential((error: Error) => {}).task

    expect(is_contradiction(cell_strongest_base_value(product))).toBe(true)
    
    const support_value = get_support_layer_value(cell_strongest_value(product))
    expect(set_get_length(support_value)).toBe(3)

    expect(to_string(to_array(support_value))).toBe( "[\"third\",\"fst\",\"snd\"]")
})

// test("test kicking", async () => {
//     const x = new Cell("x");
//     const y = new Cell("y");
//     const product = new Cell("product");
    
//     c_multiply(x, y, product);



//     tell(x, 8, "fst");


//     tell(product, 40, "fst");


//     await execute_all_tasks_sequential((error: Error) => {
//     }).task
       
//     expect(cell_strongest_base_value(y)).toBe(5);


//     tell(product, 3, "snd")
// }) 





// TODO: element subsume
// KICK OUT
// PRIMITIVE PROPAGATOR


// test("kick out 123", async () => {
//     // set_global_state(PublicStateCommand.SET_CELL_MERGE, merge_value_sets)
//     const x = new Cell("e");
//     const y = new Cell("f");
//     const product = new Cell("g");
    
//     c_multiply(x, y, product);

//     tell(x, 8, "fst");

//     tell(product, 40, "snd");


//     await execute_all_tasks_sequential(() => {}).task


//     expect(cell_strongest_base_value(y)).toBe(5);
//     // tell(x, 9, "c")

//     // await execute_all_tasks_sequential(() => {}).task 

//     // console.log(x.summarize())
//     // expect(is_contradiction(cell_strongest_base_value(x))).toBe(true)
    

//         // execute_all_tasks_sequential(() => {}, () => {
//         //     expect(cell_strongest_base_value(y)).toBe(the_contradiction);

//         //     kick_out("c")

//         //     execute_all_tasks_sequential(() => {}, () => {
//         //         expect(cell_strongest_base_value(y)).toBe(9);
//         //     })
//         // })
    
//     // set_global_state(PublicStateCommand.CLEAN_UP)
    
// })