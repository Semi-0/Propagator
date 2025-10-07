import { test, expect, describe } from "bun:test";
import { construct_cell, cell_strongest_base_value } from "../Cell/Cell";
import { update, execute_all_tasks_sequential } from "../index";
import { p_drop } from "../Propagator/BuiltInProps";

describe("p_drop debug", () => {
    test("batched updates - shows the problem", async () => {
        const input = construct_cell("input");
        const output = construct_cell("output");
        p_drop(2)(input, output);

        // All updates happen BEFORE execution
        update(input, "a");
        update(input, "b");
        update(input, "c");
        await execute_all_tasks_sequential(() => {});
        
        console.log("After batched updates:", cell_strongest_base_value(output));
        // Problem: propagator only runs once with latest value "c"
        // acc_index goes from 0 to 1, returns no_compute
        expect(cell_strongest_base_value(output)).toBe("&&the_nothing&&"); // This is what actually happens
    });

    test("sequential updates - this works", async () => {
        const input = construct_cell("input");
        const output = construct_cell("output");
        p_drop(2)(input, output);

        // Execute after each update
        update(input, "a");
        await execute_all_tasks_sequential(() => {});
        console.log("After 'a':", cell_strongest_base_value(output));
        
        update(input, "b");
        await execute_all_tasks_sequential(() => {});
        console.log("After 'b':", cell_strongest_base_value(output));
        
        update(input, "c");
        await execute_all_tasks_sequential(() => {});
        console.log("After 'c':", cell_strongest_base_value(output));
        
        expect(cell_strongest_base_value(output)).toBe("c"); // This works!
    });
});
