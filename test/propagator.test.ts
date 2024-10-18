import { expect, test, jest, beforeEach, afterEach } from "bun:test"; 

import { add_cell_content, Cell, cell_strongest_base_value, cell_strongest_value } from "../Cell/Cell";
import { c_multiply, p_add, p_divide, p_multiply, p_subtract } from "../BuiltInProps";
import { kick_out, tell } from "../ui";
import { get_base_value, is_contradiction, the_contradiction } from "../Cell/CellValue";
import { execute_all_tasks_sequential, summarize_scheduler_state, simple_scheduler, set_immediate_execute } from "../Scheduler";
import { set_global_state } from "../PublicState";
import { merge_value_sets } from "../DataTypes/ValueSet";
import { PublicStateCommand } from "../PublicState";
import { generic_merge, set_merge } from "@/cell/Merge";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { set_get_length, to_array } from "generic-handler/built_in_generics/generic_better_set";
import { value_set_length } from "../DataTypes/ValueSet";
import { randomUUID } from "crypto";

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


test("hypothisis would retain in all cells", async () => {
    const x = new Cell("x");
    


    
    
})


test.only("tell a single cell multiple times should keep all values but the strongest value should be contradiction", async () => {
    const x = new Cell("x");
    const y = new Cell("y");
    const product = new Cell("product");

    p_multiply(x, y, product);

    const numValues = 100;
    const values: number[] = [];
    const premises: string[] = [];

    set_immediate_execute(true)

    let i = 0;
    while (i < numValues) {
        
        const value = i; // Random integer between 1 and 10
        const premise = randomUUID();
        
        add_cell_content(x, value)

        console.log(summarize_scheduler_state())

        // await new Promise<void>(resolve => {
        //     setTimeout(() => {
        //         console.log("tell", value, premise);
        //         resolve(); // Resolve the promise after the timeout
        //     }, 300); // Adjust the delay as needed (e.g., 1000 for 1 second)
        // });



        values.push(value);
        premises.push(premise);
        i++;
    }

    await execute_all_tasks_sequential((error: Error) => {}).task;
    console.log(summarize_scheduler_state())
    // expect(is_contradiction(cell_strongest_base_value(x))).toBe(true);
    console.log("value set length", value_set_length(x.getContent().get_value()))
    console.log("values", values) 
    console.log("content", x.getContent().get_value())
    expect(value_set_length(x.getContent().get_value())).toBe(numValues + 1); // +1 for the contradiction value

    // Optionally, you can check if all the values are present in the cell's content
    // const cellContent = x.getContent().get_value();
    // values.forEach(value => {
    //     expect(cellContent.has(value)).toBe(true);
    // });

    console.log("Added values:", values);
    console.log("Used premises:", premises);

    set_immediate_execute(false)
});


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

test('contradiction would be activated in primitive propagator', async () => {

    const x = new Cell("x");
    const y = new Cell("y");
    const product = new Cell("product");

    p_add(x, y, product)


    tell(x, 8, "fst");
    tell(y, 2, "snd")
    

    await execute_all_tasks_sequential((error: Error) => {}).task

    tell(product, 12, "third")

    await execute_all_tasks_sequential((error: Error) => {}).task

    expect(is_contradiction(cell_strongest_base_value(product))).toBe(true)
    
    const support_value = get_support_layer_value(cell_strongest_value(product))
    expect(set_get_length(support_value)).toBe(3)

    // expect(to_string(to_array(support_value))).toBe( "[\"third\",\"fst\",\"snd\"]")
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

test('contradiction with multiple propagators and resolution', async () => {
    const a = new Cell("a");
    const b = new Cell("b");
    const c = new Cell("c");
    const sum = new Cell("sum");
    const product = new Cell("product");

    p_add(a, b, sum);
    p_multiply(sum, c, product);

    tell(a, 3, "a_val");
    tell(b, 4, "b_val");
    tell(c, 2, "c_val");
    tell(product, 15, "prod_val");

    await execute_all_tasks_sequential((error: Error) => {}).task

    expect(is_contradiction(cell_strongest_base_value(product))).toBe(true);

    kick_out("prod_val");

    await execute_all_tasks_sequential((error: Error) => {}).task

    expect(is_contradiction(cell_strongest_base_value(product))).toBe(false);
    expect(cell_strongest_base_value(product)).toBe(14);
});

test('resolving contradiction with multiple conflicting inputs', async () => {
    const x = new Cell("x");
    const y = new Cell("y");
    const z = new Cell("z");

    p_add(x, y, z);

    tell(x, 5, "x_val");
    tell(y, 3, "y_val");
    tell(z, 10, "z_val_1");
    tell(z, 7, "z_val_2");

    await execute_all_tasks_sequential((error: Error) => {}).task

    expect(is_contradiction(cell_strongest_base_value(z))).toBe(true);

    kick_out("z_val_1");
    kick_out("z_val_2");

    await execute_all_tasks_sequential((error: Error) => {}).task

    expect(is_contradiction(cell_strongest_base_value(z))).toBe(false);
    expect(cell_strongest_base_value(z)).toBe(8);
});

// test('contradiction in a circular dependency', async () => {
//     const a = new Cell("a");
//     const b = new Cell("b");
//     const c = new Cell("c");

//     p_add(a, b, c);
//     p_subtract(c, a, b);

//     tell(a, 5, "a_val");
//     tell(b, 3, "b_val");
//     tell(c, 10, "c_val");

//     await execute_all_tasks_sequential((error: Error) => {}).task

//     expect(is_contradiction(cell_strongest_base_value(c))).toBe(true);

//     kick_out("c_val");

//     await execute_all_tasks_sequential((error: Error) => {}).task

//     expect(is_contradiction(cell_strongest_base_value(c))).toBe(false);
//     expect(cell_strongest_base_value(c)).toBe(8);
// });

test('resolving contradiction with floating-point precision issues', async () => {
    const x = new Cell("x");
    const y = new Cell("y");
    const z = new Cell("z");

    p_multiply(x, y, z);

    tell(x, 0.1, "x_val");
    tell(y, 0.2, "y_val");
    tell(z, 0.020000000000000004, "z_val"); // JavaScript floating-point precision issue

    await execute_all_tasks_sequential((error: Error) => {}).task

    // This should not be a contradiction due to floating-point precision
    expect(is_contradiction(cell_strongest_base_value(z))).toBe(false);

    // Now let's introduce a real contradiction
    tell(z, 0.025, "z_val_2");

    await execute_all_tasks_sequential((error: Error) => {}).task

    expect(is_contradiction(cell_strongest_base_value(z))).toBe(true);

    kick_out("z_val_2");

    await execute_all_tasks_sequential((error: Error) => {}).task

    expect(is_contradiction(cell_strongest_base_value(z))).toBe(false);
    expect(cell_strongest_base_value(z)).toBeCloseTo(0.02, 5);
});

// test('multiple contradictions and resolutions', async () => {
//     const a = new Cell("a");
//     const b = new Cell("b");
//     const sum = new Cell("sum");

//     p_add(a, b, sum);

//     // First round: Create and resolve a contradiction
//     tell(a, 5, "a_val_1");
//     tell(b, 3, "b_val_1");
//     tell(sum, 10, "sum_val_1");

//     await execute_all_tasks_sequential((error: Error) => {}).task

//     expect(is_contradiction(cell_strongest_base_value(sum))).toBe(true);

//     kick_out("sum_val_1");

//     await execute_all_tasks_sequential((error: Error) => {}).task

//     expect(is_contradiction(cell_strongest_base_value(sum))).toBe(false);
//     expect(cell_strongest_base_value(sum)).toBe(8);

//     // Second round: Create and resolve another contradiction
//     tell(a, 7, "a_val_2");
//     tell(sum, 9, "sum_val_2");

//     await execute_all_tasks_sequential((error: Error) => {}).task

//     expect(is_contradiction(cell_strongest_base_value(sum))).toBe(true);

//     kick_out("b_val_1");

//     await execute_all_tasks_sequential((error: Error) => {}).task

//     expect(is_contradiction(cell_strongest_base_value(sum))).toBe(false);
//     expect(cell_strongest_base_value(sum)).toBe(9);
//     expect(cell_strongest_base_value(b)).toBe(2);

//     // Third round: Create and resolve a contradiction with multiple conflicting inputs
//     tell(b, 4, "b_val_3");
//     tell(sum, 12, "sum_val_3");
//     tell(sum, 10, "sum_val_4");

//     await execute_all_tasks_sequential((error: Error) => {}).task

//     expect(is_contradiction(cell_strongest_base_value(sum))).toBe(true);

//     kick_out("sum_val_2");
//     kick_out("sum_val_3");
//     kick_out("sum_val_4");

//     await execute_all_tasks_sequential((error: Error) => {}).task

//     expect(is_contradiction(cell_strongest_base_value(sum))).toBe(false);
//     expect(cell_strongest_base_value(sum)).toBe(11);

//     // Fourth round: Resolve contradiction by kicking out multiple values
//     tell(a, 3, "a_val_4");
//     tell(b, 2, "b_val_4");
//     tell(sum, 7, "sum_val_5");

//     await execute_all_tasks_sequential((error: Error) => {}).task

//     expect(is_contradiction(cell_strongest_base_value(sum))).toBe(true);

//     kick_out("a_val_2");
//     kick_out("b_val_3");

//     await execute_all_tasks_sequential((error: Error) => {}).task

//     expect(is_contradiction(cell_strongest_base_value(sum))).toBe(false);
//     expect(cell_strongest_base_value(sum)).toBe(5);
//     expect(cell_strongest_base_value(a)).toBe(3);
//     expect(cell_strongest_base_value(b)).toBe(2);
// });


