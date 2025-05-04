// @ts-nocheck
// Disable TypeScript checking for this test file
import { expect, test, jest, beforeEach, afterEach, describe } from "bun:test"; 

import { add_cell_content, type Cell, cell_strongest_base_value, cell_strongest_value, constant_cell, construct_cell } from "../Cell/Cell";
import { c_add, c_multiply, p_add, p_divide, p_multiply, p_subtract, p_switch } from "../Propagator/BuiltInProps";
import { all_results, enum_num_set, kick_out, tell } from "../Helper/UI";
import { is_contradiction, the_nothing } from "../Cell/CellValue";
import { execute_all_tasks_sequential, summarize_scheduler_state, simple_scheduler, set_immediate_execute, execute_all_tasks_simultaneous } from "../Shared/Reactivity/Scheduler";
import { set_global_state } from "../Shared/PublicState";
import { merge_value_sets } from "../DataTypes/ValueSet";
import { PublicStateCommand } from "../Shared/PublicState";
import { generic_merge, set_merge, set_trace_merge } from "@/cell/Merge";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { construct_better_set, set_get_length, to_array } from "generic-handler/built_in_generics/generic_better_set";
import { value_set_length } from "../DataTypes/ValueSet";
import { randomUUID } from "crypto";
import { configure_log_amb_choose, configure_log_process_contradictions, p_amb } from "../Propagator/Search";
import { ce_add, ce_equal, ce_less_than, ce_switch } from "../Propagator/BuiltInProps";
import { return_default_behavior } from "../Propagator/PropagatorBehavior";
import { com_if } from "../Propagator/BuiltInProps";
import { inspect } from "util";
import { inspect_content, inspect_strongest } from "../Helper/Debug";
import { function_to_primitive_propagator, primitive_propagator } from "../Propagator/Propagator";

beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP)
    return_default_behavior();
    set_merge(merge_value_sets)
    
})
describe("test propagator", () => {
    test("c_multiply is propoerly working with value set", async () => {

        const x = construct_cell("x");
        const y = construct_cell("y");
        const product = construct_cell("product");
        
        c_multiply(x, y, product);

        tell(x, 8, "fst");


        tell(product, 40, "snd");


        execute_all_tasks_sequential((error: Error) => {
        });
        
    
            expect(cell_strongest_base_value(y)).toBe(5);
    })


    test("causing contradiction", async () => {
        const x = construct_cell("x");
        const y = construct_cell("y");
        const product = construct_cell("product");
        // @ts-ignore
        c_multiply(x, y, product);



        tell(x, 8, "fst");


        tell(product, 40, "snd");


        execute_all_tasks_sequential((error: Error) => {
        });
        
    
        expect(cell_strongest_base_value(y)).toBe(5);


        tell(product, 5, "red");

        execute_all_tasks_sequential((error: Error) => {
        });

        expect(is_contradiction(cell_strongest_base_value(product))).toBe(true)
    }) 

    test("kick out resolve contradiction", async () => {
        const x = construct_cell("x");
        const y = construct_cell("y");
        const product = construct_cell("product");
        
        c_multiply(x, y, product);



        tell(x, 8, "fst");


        tell(product, 40, "snd");


        execute_all_tasks_sequential((error: Error) => {
        });
        
    
        expect(cell_strongest_base_value(y)).toBe(5);


        tell(product, 5, "red");

        execute_all_tasks_sequential((error: Error) => {
        });

        expect(is_contradiction(cell_strongest_base_value(product))).toBe(true)

        kick_out("red")


        execute_all_tasks_sequential((error: Error) => {
        });

        expect(is_contradiction(cell_strongest_base_value(product))).toBe(false)
    }) 


    test("tell a single cell multiple times should keep all values but the strongest value should be contradiction", async () => {
        const x = construct_cell("x");
        const y = construct_cell("y");
        const product = construct_cell("product");

        p_multiply(x, y, product);
        const numValues = 100;
        const values: number[] = [];
        const premises: string[] = [];

        // set_immediate_execute(true)

        let i = 0;
        while (i < numValues) {
            
            const value = i; // Random integer between 1 and 10
            const premise = randomUUID();
            
            add_cell_content(x, value)


            await execute_all_tasks_simultaneous((error: Error) => {});

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

        execute_all_tasks_simultaneous((error: Error) => {});
        // expect(is_contradiction(cell_strongest_base_value(x))).toBe(true);
        expect(value_set_length(x.getContent().get_value())).toBe(numValues) // +1 for the contradiction value

 
    });


    test('primitive propagator is working with multiply', async () => {
        const x = construct_cell("x");
        const y = construct_cell("y");
        const product = construct_cell("product");

        p_multiply(x, y, product)


        tell(x, 8, "fst");
        tell(y, 5, "snd")

        execute_all_tasks_sequential((error: Error) => {
        });

        expect(cell_strongest_base_value(product)).toBe(40)

    })


    test('primitive propagator is working with subtract', async () => {
        const x = construct_cell("x");
        const y = construct_cell("y");
        const product = construct_cell("product");

        p_subtract(x, y, product)


        tell(x, 8, "fst");
        tell(y, 2, "snd")

        execute_all_tasks_sequential((error: Error) => {
        });

        expect(cell_strongest_base_value(product)).toBe(6)

    })


    test('primitive propagator works fine with incrementation_set', async () => {
        const obj = {
            x: 0
        }
        const x = constant_cell(() => obj, "x")
        const pulse = construct_cell("pulse");
        const product = construct_cell("product");

        const increment = (pulse: boolean) => {
            obj.x = obj.x + 1
        }
        const increment_propagator = function_to_primitive_propagator("increment", increment)

        increment_propagator(pulse)

        tell(pulse, true, "fst")
        
        execute_all_tasks_sequential((error: Error) => {
        });

        expect(obj.x).toBe(1)

        kick_out("fst")

        tell(pulse, false, "snd") 

        execute_all_tasks_sequential((error: Error) => {
        });

        expect(obj.x).toBe(2)
    })



    test('primitive propagator is working with divide', async () => {
        const x = construct_cell("x");
        const y = construct_cell("y");
        const product = construct_cell("product");

        p_divide(x, y, product)


        tell(x, 8, "fst");
        tell(y, 2, "snd")

        execute_all_tasks_sequential((error: Error) => {
        });

        expect(cell_strongest_base_value(product)).toBe(4)

    })

    test('primitive propagator is working with add', async () => {
        const x = construct_cell("x");
        const y = construct_cell("y");
        const product = construct_cell("product");

        p_add(x, y, product)


        tell(x, 8, "fst");
        tell(y, 2, "snd")

        execute_all_tasks_sequential((error: Error) => {
        });

        expect(cell_strongest_base_value(product)).toBe(10)

    })


    test('contradiction is properly propagated with primitive propagator', async () => {
        

        const x = construct_cell("x");
        const y = construct_cell("y");
        const product = construct_cell("product");

        p_add(x, y, product)


        tell(x, 8, "fst");
        tell(y, 2, "snd")
        tell(product, 12, "third")

        execute_all_tasks_sequential((error: Error) => {
        });

        expect(is_contradiction(cell_strongest_base_value(product))).toBe(true)
        
        const support_value = get_support_layer_value(cell_strongest_value(product))
        expect(set_get_length(support_value)).toBe(3)

        expect(to_string(to_array(support_value))).toBe( "[\"third\",\"fst\",\"snd\"]")
    })

    test('contradiction would be activated in primitive propagator', async () => {

        const x = construct_cell("x");
        const y = construct_cell("y");
        const product = construct_cell("product");

        p_add(x, y, product)


        tell(x, 8, "fst");
        tell(y, 2, "snd")
        

        execute_all_tasks_sequential((error: Error) => {
        });

        tell(product, 12, "third")

        execute_all_tasks_sequential((error: Error) => {
        });

        expect(is_contradiction(cell_strongest_base_value(product))).toBe(true)
        
        const support_value = get_support_layer_value(cell_strongest_value(product))
        expect(set_get_length(support_value)).toBe(3)

        expect(to_string(to_array(support_value))).toBe( "[\"fst\",\"snd\",\"third\"]")
    })

    test("switch", async () => {
        set_merge(merge_value_sets)
   

// TODO: RECURSION

        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");

        const result  = ce_switch(c, ce_add(a, b))
        inspect_content(c)
        inspect_strongest(c)

        inspect_content(result)
        inspect_strongest(result)

        tell(a, 1, "a")
        tell(b, 2, "b")
        tell(c, true, "c")

        execute_all_tasks_sequential((e) => {})
        // @ts-ignore
        expect(cell_strongest_base_value(result)).toBe(3)

        tell(c, false, "e")
        // kick_out("c")

        tell(a, 4, "f")
        tell(b, 2, "g")

        kick_out("c")
        kick_out("b")
        kick_out("a")
        execute_all_tasks_sequential((e) => {})

        // @ts-ignore
        expect(cell_strongest_base_value(result)).toBe(the_nothing)

    })


    test("equality", async () => {
        set_merge(merge_value_sets)

        

        const x = construct_cell("x1");
        const y = construct_cell("y1");
        const result = ce_equal(x, y)

        tell(x, 1, "x")
        tell(y, 1, "y")

        



        execute_all_tasks_sequential((e) => {})
        // @ts-ignore
        expect(cell_strongest_base_value(result)).toBe(true)


        console.log(x.summarize())
        kick_out("x")
        tell(x, 2, "z")

        execute_all_tasks_sequential((e) => {})
        // @ts-ignore
        expect(cell_strongest_base_value(result)).toBe(false)

    })

    test("less than", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");

        const result = ce_less_than(a, b)

        tell(a, 1, "a")
        tell(b, 2, "b")

        execute_all_tasks_sequential((e) => {})

        //@ts-ignore
        expect(cell_strongest_base_value(result)).toBe(true)

        kick_out("a")
        tell(a, 3, "c")
        execute_all_tasks_sequential((e) => {})
        //@ts-ignore
        expect(cell_strongest_base_value(result)).toBe(false)
    })

    test("propagator disposal should stop cell updates", async () => {
        // Prepare cells and propagator
        const a = construct_cell("dispTestA");
        const b = construct_cell("dispTestB");
        const output = construct_cell("dispTestOut");
        const prop = p_add(a as any, b as any, output as any);
        
        // Initial update should propagate
        tell(a as any, 10, "a1");
        tell(b as any, 5, "b1");
        await execute_all_tasks_sequential(() => {});
        const first = cell_strongest_base_value(output);
        expect(first).toBe(15);
        
        // Dispose the propagator
        prop.dispose();
        
        // Further updates should not change output
        tell(a as any, 20, "a2");
        tell(b as any, 10, "b2");
        await execute_all_tasks_sequential(() => {});
        const second = cell_strongest_base_value(output);
        expect(second).toBe(15);
    });
})
// test("test kicking", async () => {
//     const x = construct_cell("x");
//     const y = construct_cell("y");
//     const product = construct_cell("product");
    
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
//     const x = construct_cell("e");
//     const y = construct_cell("f");
//     const product = construct_cell("g");
    
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
    const a = construct_cell("a");
    const b = construct_cell("b");
    const c = construct_cell("c");
    const sum = construct_cell("sum");
    const product = construct_cell("product");

    p_add(a, b, sum);
    p_multiply(sum, c, product);

    tell(a, 3, "a_val");
    tell(b, 4, "b_val");
    tell(c, 2, "c_val");
    tell(product, 15, "prod_val");

    execute_all_tasks_sequential((error: Error) => {
    });

    expect(is_contradiction(cell_strongest_base_value(product))).toBe(true);

    kick_out("prod_val");

    execute_all_tasks_sequential((error: Error) => {
    });

    expect(is_contradiction(cell_strongest_base_value(product))).toBe(false);
    expect(cell_strongest_base_value(product)).toBe(14);
});

test('resolving contradiction with multiple conflicting inputs', async () => {
    const x = construct_cell("x");
    const y = construct_cell("y");
    const z = construct_cell("z");

    p_add(x, y, z);

    tell(x, 5, "x_val");
    tell(y, 3, "y_val");
    tell(z, 10, "z_val_1");
    tell(z, 7, "z_val_2");

    execute_all_tasks_sequential((error: Error) => {
    });

    expect(is_contradiction(cell_strongest_base_value(z))).toBe(true);

    kick_out("z_val_1");
    kick_out("z_val_2");

    execute_all_tasks_sequential((error: Error) => {
    });

    expect(is_contradiction(cell_strongest_base_value(z))).toBe(false);
    expect(cell_strongest_base_value(z)).toBe(8);
});

// test('contradiction in a circular dependency', async () => {
//     const a = construct_cell("a");
//     const b = construct_cell("b");
//     const c = construct_cell("c");

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
    const x = construct_cell("x");
    const y = construct_cell("y");
    const z = construct_cell("z");

    p_multiply(x, y, z);

    tell(x, 0.1, "x_val");
    tell(y, 0.2, "y_val");
    tell(z, 0.020000000000000004, "z_val"); // JavaScript floating-point precision issue

    execute_all_tasks_sequential((error: Error) => {
    });

    // This should not be a contradiction due to floating-point precision
    expect(is_contradiction(cell_strongest_base_value(z))).toBe(false);

    // Now let's introduce a real contradiction
    tell(z, 0.025, "z_val_2");

    execute_all_tasks_sequential((error: Error) => {
    });

    expect(is_contradiction(cell_strongest_base_value(z))).toBe(true);

    kick_out("z_val_2");

    execute_all_tasks_sequential((error: Error) => {
    });

    expect(is_contradiction(cell_strongest_base_value(z))).toBe(false);
    expect(cell_strongest_base_value(z)).toBeCloseTo(0.02, 5);
});



test('AMB operator: example test from SimpleTest.ts', async () => {
 

    // configure_log_amb_choose(true)
    // configure_log_process_contradictions(true)
    // configure_log_nogoods(true)
    
    
    const x = construct_cell("x");
    const y = construct_cell("y");
    const z = construct_cell("z");

    const possibilities = enum_num_set(1, 10);

    p_amb(x, possibilities);
    p_amb(y, possibilities);
    p_amb(z, possibilities);

    const x2 = construct_cell("x2");
    const y2 = construct_cell("y2");
    const z2 = construct_cell("z2");

    p_multiply(x, x, x2);
    p_multiply(y, y, y2);
    p_multiply(z, z, z2);

    p_add(x2, y2, z2);

    const results: any[] = [];
    all_results(construct_better_set([x, y, z], to_string), (value: any) => {
        console.log("all results", to_string(value));
        results.push(to_string(value));
    });

    execute_all_tasks_sequential((error: Error) => {
        if (error) {
            console.error(error);
        }
    });

    // Add assertions for expected results
    expect(results).toContain("[4, 3, 5]");
    expect(results).toContain("[3, 4, 5]");
    expect(results).toContain("[8, 6, 10]");
    expect(results).toContain("[6, 8, 10]");

    expect(x.summarize()).toBeDefined();
    expect(y.summarize()).toBeDefined();
    expect(z.summarize()).toBeDefined();
});

test('compound propagator com_if works correctly', async () => {
    // Initialize cells
    const condition = construct_cell("condition");
    const thenValue = construct_cell("thenValue");
    const otherwiseValue = construct_cell("otherwiseValue");
    const output = construct_cell("output");
    
    // Set up the if propagator
    // @ts-ignore
    com_if(condition, thenValue, otherwiseValue, output);
    
    // Test when condition is true
    tell(condition, true, "c_true");
    tell(thenValue, 42, "then_val");
    tell(otherwiseValue, 24, "else_val");
    
    execute_all_tasks_sequential((error: Error) => {});
    
    expect(cell_strongest_base_value(output)).toBe(42);
    
    // Test when condition changes to false
    kick_out("c_true");
    tell(condition, false, "c_false");

    // inspect_strongest(output)
    inspect_content(output)
    
    execute_all_tasks_sequential((error: Error) => {});
    
    expect(cell_strongest_base_value(output)).toBe(24);
    
    // Test when 'then' value changes while condition is false
    kick_out("then_val")
    tell(thenValue, 100, "new_then");
    
    execute_all_tasks_sequential((error: Error) => {});
    
    // Output should still be the 'otherwise' value
    expect(cell_strongest_base_value(output)).toBe(24);
    
    // Test when 'otherwise' value changes while condition is false
    kick_out("else_val")
    tell(otherwiseValue, 200, "new_else");
    
    execute_all_tasks_sequential((error: Error) => {});
    
    // Output should update to the new 'otherwise' value
    expect(cell_strongest_base_value(output)).toBe(200);
    
    // Test switching back to true condition
    kick_out("c_false");
    tell(condition, true, "c_true_again");
    
    execute_all_tasks_sequential((error: Error) => {});
    
    // Output should now match the 'then' value
    expect(cell_strongest_base_value(output)).toBe(100);
});

// Add test for propagator disposal
test("propagator disposal", async () => {
    // Create cells with proper typing
    // Note: There are type errors throughout the test file related to Cell typing
    // This would require a more extensive refactoring of the entire test file
    // @ts-ignore - Using any to match existing test patterns
    const a: any = construct_cell("a");
    // @ts-ignore - Using any to match existing test patterns
    const b: any = construct_cell("b");
    // @ts-ignore - Using any to match existing test patterns
    const result: any = construct_cell("result");
    
    // Create a propagator
    const prop = p_add(a, b, result);
    
    // Add values
    tell(a, 2, "a");
    tell(b, 3, "b");
    
    // Execute tasks
    await execute_all_tasks_sequential((e) => {});
    
    // Verify propagation worked
    expect(cell_strongest_base_value(result)).toBe(5);
    
    // Dispose the propagator
    prop.dispose();
    
    // Update values
    tell(a, 10, "a");
    tell(b, 20, "b");
    
    // Execute tasks
    await execute_all_tasks_sequential((e) => {});
    
    // Verify that propagation no longer happens
    expect(cell_strongest_base_value(result)).toBe(5); // Still the old value
});