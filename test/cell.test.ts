import { test, expect } from "bun:test";
import { primitive_construct_cell, cell_strongest_base_value } from "../Cell/Cell";
import { tell } from "../Helper/UI";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { dispose } from "../Shared/Reactivity/Dispose";
import { the_disposed } from "../Cell/CellValue";

// // Test that disposing a cell stops further updates
// test("cell disposal should stop updates", async () => {
//     const cell = construct_cell<number>("testCell");

//     // Initial update should propagate
//     tell(cell, 1, "p1");
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(cell)).toBe(1);

//     // Dispose the cell
//     dispose(cell);

//     // Further update should be ignored - cell should be marked as disposed
//     tell(cell, 2, "p2");
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(cell)).toBe(the_disposed);
// }); 