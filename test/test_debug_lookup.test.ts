// @ts-nocheck
import { expect, test, beforeEach, describe } from "bun:test";

import { construct_cell, type Cell, cell_id } from "../Cell/Cell";
import { 
    function_to_primitive_propagator,
    propagator_id,
    type Propagator 
} from "../Propagator/Propagator";
import { 
    set_global_state, 
    PublicStateCommand 
} from "../Shared/PublicState";
import { set_scheduler } from "../Shared/Scheduler/Scheduler";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";
import { merge_value_sets } from "../DataTypes/ValueSet";
import { set_merge } from "../Cell/Merge";
import { 
    find_cell_by_id,
    find_propagator_by_id,
    traverse_primitive_level
} from "../Shared/GraphTraversal";

beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP);
    set_merge(merge_value_sets);
    set_scheduler(simple_scheduler());
});

describe("Debug Lookup Tests", () => {
    
    test("debug: cell IDs and lookup", () => {
        const cell1 = construct_cell("test_cell_1");
        const cell2 = construct_cell("test_cell_2");
        
        console.log("Cell 1 ID:", cell_id(cell1));
        console.log("Cell 2 ID:", cell_id(cell2));
        
        // Test find_cell_by_id
        const foundCell1 = find_cell_by_id("test_cell_1");
        const foundCell2 = find_cell_by_id("test_cell_2");
        
        console.log("Found cell 1:", foundCell1);
        console.log("Found cell 2:", foundCell2);
        
        expect(foundCell1).toBeDefined();
        expect(foundCell2).toBeDefined();
    });

    test("debug: propagator IDs and lookup", () => {
        const cell1 = construct_cell("test_cell_1");
        const cell2 = construct_cell("test_cell_2");
        
        const prop1 = function_to_primitive_propagator("test_prop_1", (x: number) => x + 1);
        const actualProp1 = prop1(cell1, cell2);
        
        console.log("Propagator ID:", propagator_id(actualProp1));
        
        // Test find_propagator_by_id
        const foundProp1 = find_propagator_by_id(propagator_id(actualProp1));
        
        console.log("Found propagator:", foundProp1);
        
        expect(foundProp1).toBeDefined();
    });

    test("debug: traverse_primitive_level result", () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        
        console.log("Cell a ID:", cell_id(a));
        console.log("Cell b ID:", cell_id(b));
        console.log("Cell c ID:", cell_id(c));
        
        const p1 = function_to_primitive_propagator("p1", (x: number) => x + 1);
        const p2 = function_to_primitive_propagator("p2", (x: number) => x * 2);
        const actualP1 = p1(a, b);
        const actualP2 = p2(b, c);
        
        console.log("Propagator p1 ID:", propagator_id(actualP1));
        console.log("Propagator p2 ID:", propagator_id(actualP2));
        
        // Test traverse_primitive_level
        const result = traverse_primitive_level(a);
        
        console.log("Traversal result cells:", Array.from(result.cells.keys()));
        console.log("Traversal result propagators:", Array.from(result.propagators.keys()));
        
        expect(result.cells.size).toBeGreaterThan(0);
        expect(result.propagators.size).toBeGreaterThan(0);
    });
});
