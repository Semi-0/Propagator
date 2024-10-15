import { expect, test, jest } from "bun:test"; 

import { Cell, cell_strongest_base_value, cell_strongest_value } from "../Cell/Cell";
import { c_multiply } from "../BuiltInProps";
import { kick_out, tell } from "../ui";
import { get_base_value, the_contradiction } from "../Cell/CellValue";
import { execute_all_tasks_sequential, summarize_scheduler_state, simple_scheduler } from "../Scheduler";
import { set_global_state } from "../PublicState";
import { merge_value_sets } from "../DataTypes/ValueSet";
import { PublicStateCommand } from "../PublicState";
import { generic_merge } from "@/cell/Merge";

test("c_multiply", async () => {
    const x = new Cell("x");
    const y = new Cell("y");
    const product = new Cell("product");
    
    c_multiply(x, y, product);



    tell(x, 8, "fst");


    tell(product, 40, "fst");


    execute_all_tasks_sequential((error: Error) => {
        expect(cell_strongest_base_value(y)).toBe(5);
    })
    
    set_global_state(PublicStateCommand.CLEAN_UP)
   
})


// test("kick out", async () => {
//     set_global_state(PublicStateCommand.CLEAN_UP)
//     // set_global_state(PublicStateCommand.SET_CELL_MERGE, merge_value_sets)
//     const x = new Cell("x");
//     const y = new Cell("y");
//     const product = new Cell("product");
    
//     c_multiply(x, y, product);

//     tell(x, 8, "fst");

//     tell(product, 40, "snd");


//     execute_all_tasks_sequential(() => {}, () => {
//         expect(cell_strongest_base_value(y)).toBe(5);

//         // tell(x, 9, "c")

//         // execute_all_tasks_sequential(() => {}, () => {
//         //     expect(cell_strongest_base_value(y)).toBe(the_contradiction);

//         //     kick_out("c")

//         //     execute_all_tasks_sequential(() => {}, () => {
//         //         expect(cell_strongest_base_value(y)).toBe(9);
//         //     })
//         // })
//     })
    
//     set_global_state(PublicStateCommand.CLEAN_UP)
    
// })