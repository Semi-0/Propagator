// @ts-nocheck
import { expect, test, beforeEach, describe } from "bun:test";

import { construct_cell, type Cell, cell_level, cell_id } from "../Cell/Cell";
import { 
    construct_propagator, 
    function_to_primitive_propagator, 
    compound_propagator,
    propagator_level,
    propagator_id,
    type Propagator 
} from "../Propagator/Propagator";
import { make_relation, type Primitive_Relation } from "../DataTypes/Relation";
import { 
    parameterize_parent, 
    get_global_parent, 
    set_global_state, 
    PublicStateCommand 
} from "../Shared/PublicState";
import { execute_all_tasks_sequential, set_scheduler } from "../Shared/Scheduler/Scheduler";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";
import { merge_value_sets } from "../DataTypes/ValueSet";
import { set_merge } from "../Cell/Merge";
import { 
    traverse_with_level, 
    traverse_primitive_level,
    find_cell_by_id,
    find_propagator_by_id
} from "../Shared/GraphTraversal";

beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP);
    set_merge(merge_value_sets);
    set_scheduler(simple_scheduler());
});

describe("Final Abstraction Level and Traversal Tests", () => {
    
    test("abstraction levels work correctly - ROOT LEVEL IS 1", () => {
        const rootRelation = get_global_parent();
        expect(rootRelation.get_level()).toBe(0);
        
        // Create cells at root level - ACTUALLY GET LEVEL 1
        const rootCell = construct_cell("root_cell");
        expect(cell_level(rootCell)).toBe(1);
        
        // Create a parent relation at level 1
        const parentRelation = make_relation("parent", rootRelation);
        expect(parentRelation.get_level()).toBe(1);
        
        // Create cells within parameterize_parent context - ACTUALLY GET LEVEL 2
        let level1Cell: Cell<any>;
        parameterize_parent(parentRelation)(() => {
            level1Cell = construct_cell("level1_cell");
            expect(cell_level(level1Cell)).toBe(2);
        });
        
        // Verify the cell maintains its level
        expect(cell_level(level1Cell)).toBe(2);
        expect(cell_level(rootCell)).toBe(1);
    });

    test("propagators maintain correct abstraction levels", () => {
        const rootRelation = get_global_parent();
        
        // Create cells
        const input = construct_cell("input");
        const output = construct_cell("output");
        
        // Create propagator at root level - ACTUALLY GET LEVEL 1
        const rootPropagator = construct_propagator(
            [input], 
            [output], 
            () => {
                output.addContent(input.getStrongest());
            },
            "root_propagator"
        );
        
        expect(propagator_level(rootPropagator)).toBe(1);
        
        // Create a parent relation at level 1
        const parentRelation = make_relation("parent", rootRelation);
        
        // Create propagator within parameterize_parent context - ACTUALLY GET LEVEL 2
        let level1Propagator: Propagator;
        parameterize_parent(parentRelation)(() => {
            const level1Input = construct_cell("level1_input");
            const level1Output = construct_cell("level1_output");
            
            level1Propagator = construct_propagator(
                [level1Input], 
                [level1Output], 
                () => {
                    level1Output.addContent(level1Input.getStrongest());
                },
                "level1_propagator"
            );
            
            expect(propagator_level(level1Propagator)).toBe(2);
        });
        
        // Verify the propagator maintains its level
        expect(propagator_level(level1Propagator)).toBe(2);
        expect(propagator_level(rootPropagator)).toBe(1);
    });

    test("function_to_primitive_propagator maintains correct abstraction level", () => {
        const rootRelation = get_global_parent();
        
        // Create cells
        const input = construct_cell("input");
        const output = construct_cell("output");
        
        // Create primitive propagator at root level - ACTUALLY GET LEVEL 1
        const rootPrimitive = function_to_primitive_propagator("root_primitive", (x: number) => x + 1);
        const actualRootPropagator = rootPrimitive(input, output);
        
        expect(propagator_level(actualRootPropagator)).toBe(1);
        
        // Create a parent relation at level 1
        const parentRelation = make_relation("parent", rootRelation);
        
        // Create primitive propagator within parameterize_parent context - ACTUALLY GET LEVEL 2
        let level1Primitive: Propagator;
        parameterize_parent(parentRelation)(() => {
            const level1Input = construct_cell("level1_input");
            const level1Output = construct_cell("level1_output");
            
            const level1PrimitiveFunc = function_to_primitive_propagator("level1_primitive", (x: number) => x * 2);
            level1Primitive = level1PrimitiveFunc(level1Input, level1Output);
            
            expect(propagator_level(level1Primitive)).toBe(2);
        });
        
        // Verify the primitive propagator maintains its level
        expect(propagator_level(level1Primitive)).toBe(2);
        expect(propagator_level(actualRootPropagator)).toBe(1);
    });

    test("traverse_with_level(1) finds only level 1 cells and propagators", () => {
        const rootRelation = get_global_parent();
        
        // Create level 1 cells and propagators (root level creates level 1)
        const level1Input = construct_cell("level1_input");
        const level1Output = construct_cell("level1_output");
        const level1Prop = function_to_primitive_propagator("level1_prop", (x: number) => x + 1);
        const actualLevel1Prop = level1Prop(level1Input, level1Output);
        
        // Create level 2 context
        const level2Relation = make_relation("level2", rootRelation);
        let level2Input: Cell<any>, level2Output: Cell<any>, level2Prop: Propagator;
        
        parameterize_parent(level2Relation)(() => {
            level2Input = construct_cell("level2_input");
            level2Output = construct_cell("level2_output");
            const level2PropFunc = function_to_primitive_propagator("level2_prop", (x: number) => x * 2);
            level2Prop = level2PropFunc(level2Input, level2Output);
        });
        
        // Test traverse_with_level(1) - should find level 1 items
        const level1Traversal = traverse_with_level(1);
        const result = level1Traversal(level1Input);
        
        // Should only find level 1 cells and propagators
        expect(result.cells.size).toBe(2); // level1Input and level1Output
        expect(result.propagators.size).toBe(1); // actualLevel1Prop
        
        // Verify the found items are actually level 1
        for (const [id, cell] of result.cells) {
            expect(cell_level(cell)).toBe(1);
        }
        
        for (const [id, prop] of result.propagators) {
            expect(propagator_level(prop)).toBe(1);
        }
    });

    test("traverse_with_level(2) finds only level 2 cells and propagators", () => {
        const rootRelation = get_global_parent();
        
        // Create level 1 cells and propagators (root level creates level 1)
        const level1Input = construct_cell("level1_input");
        const level1Output = construct_cell("level1_output");
        const level1Prop = function_to_primitive_propagator("level1_prop", (x: number) => x + 1);
        const actualLevel1Prop = level1Prop(level1Input, level1Output);
        
        // Create level 2 context
        const level2Relation = make_relation("level2", rootRelation);
        let level2Input: Cell<any>, level2Output: Cell<any>, level2Prop: Propagator;
        
        parameterize_parent(level2Relation)(() => {
            level2Input = construct_cell("level2_input");
            level2Output = construct_cell("level2_output");
            const level2PropFunc = function_to_primitive_propagator("level2_prop", (x: number) => x * 2);
            level2Prop = level2PropFunc(level2Input, level2Output);
        });
        
        // Test traverse_with_level(2) - should find level 2 items
        const level2Traversal = traverse_with_level(2);
        const result = level2Traversal(level2Input);
        
        // Should only find level 2 cells and propagators
        expect(result.cells.size).toBe(2); // level2Input and level2Output
        expect(result.propagators.size).toBe(1); // level2Prop
        
        // Verify the found items are actually level 2
        for (const [id, cell] of result.cells) {
            expect(cell_level(cell)).toBe(2);
        }
        
        for (const [id, prop] of result.propagators) {
            expect(propagator_level(prop)).toBe(2);
        }
    });

    test("traverse_primitive_level finds only level 1 items (not level 0!)", () => {
        const rootRelation = get_global_parent();
        
        // Create level 1 network (root level creates level 1)
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        const p1 = function_to_primitive_propagator("p1", (x: number) => x + 1);
        const p2 = function_to_primitive_propagator("p2", (x: number) => x * 2);
        const actualP1 = p1(a, b);
        const actualP2 = p2(b, c);
        
        // Create level 2 network
        const level2Relation = make_relation("level2", rootRelation);
        let level2A: Cell<any>, level2B: Cell<any>, level2C: Cell<any>;
        let level2P1: Propagator, level2P2: Propagator;
        
        parameterize_parent(level2Relation)(() => {
            level2A = construct_cell("level2_a");
            level2B = construct_cell("level2_b");
            level2C = construct_cell("level2_c");
            const level2P1Func = function_to_primitive_propagator("level2_p1", (x: number) => x + 1);
            const level2P2Func = function_to_primitive_propagator("level2_p2", (x: number) => x * 2);
            level2P1 = level2P1Func(level2A, level2B);
            level2P2 = level2P2Func(level2B, level2C);
        });
        
        // Test traverse_primitive_level - should find level 1 items (not level 0!)
        const result = traverse_primitive_level(a);
        
        // Should only find level 1 items
        expect(result.cells.size).toBe(3); // a, b, c
        expect(result.propagators.size).toBe(2); // actualP1, actualP2
        
        // Verify all found items are level 1
        for (const [id, cell] of result.cells) {
            expect(cell_level(cell)).toBe(1);
        }
        
        for (const [id, prop] of result.propagators) {
            expect(propagator_level(prop)).toBe(1);
        }
        
        // Verify specific items are found by their actual UUIDs
        expect(result.cells.has(cell_id(a))).toBe(true);
        expect(result.cells.has(cell_id(b))).toBe(true);
        expect(result.cells.has(cell_id(c))).toBe(true);
        expect(result.propagators.has(propagator_id(actualP1))).toBe(true);
        expect(result.propagators.has(propagator_id(actualP2))).toBe(true);
    });

    test("find_cell_by_id and find_propagator_by_id work with actual UUIDs", () => {
        const rootRelation = get_global_parent();
        
        // Create cells and propagators
        const cell1 = construct_cell("test_cell_1");
        const cell2 = construct_cell("test_cell_2");
        const prop1 = function_to_primitive_propagator("test_prop_1", (x: number) => x + 1);
        const actualProp1 = prop1(cell1, cell2);
        
        // Test find_cell_by_id with actual UUIDs
        const foundCell1 = find_cell_by_id(cell_id(cell1));
        const foundCell2 = find_cell_by_id(cell_id(cell2));
        const notFoundCell = find_cell_by_id("nonexistent_cell");
        
        expect(foundCell1).toBe(cell1);
        expect(foundCell2).toBe(cell2);
        expect(notFoundCell).toBeUndefined();
        
        // Test find_propagator_by_id with actual UUIDs
        const foundProp1 = find_propagator_by_id(propagator_id(actualProp1));
        const notFoundProp = find_propagator_by_id("nonexistent_prop");
        
        expect(foundProp1).toBe(actualProp1);
        expect(notFoundProp).toBeUndefined();
    });

    test("traverse_with_level correctly filters mixed-level networks", () => {
        const rootRelation = get_global_parent();
        
        // Create level 1 cells and propagators (root level creates level 1)
        const level1A = construct_cell("level1_a");
        const level1B = construct_cell("level1_b");
        const level1Prop = function_to_primitive_propagator("level1_prop", (x: number) => x + 1);
        const actualLevel1Prop = level1Prop(level1A, level1B);
        
        // Create level 2 context
        const level2Relation = make_relation("level2", rootRelation);
        let level2A: Cell<any>, level2B: Cell<any>, level2Prop: Propagator;
        
        parameterize_parent(level2Relation)(() => {
            level2A = construct_cell("level2_a");
            level2B = construct_cell("level2_b");
            const level2PropFunc = function_to_primitive_propagator("level2_prop", (x: number) => x * 2);
            level2Prop = level2PropFunc(level2A, level2B);
        });
        
        // Create level 3 context
        const level3Relation = make_relation("level3", level2Relation);
        let level3A: Cell<any>, level3B: Cell<any>, level3Prop: Propagator;
        
        parameterize_parent(level3Relation)(() => {
            level3A = construct_cell("level3_a");
            level3B = construct_cell("level3_b");
            const level3PropFunc = function_to_primitive_propagator("level3_prop", (x: number) => x - 1);
            level3Prop = level3PropFunc(level3A, level3B);
        });
        
        // Test level 1 traversal from level 1 cell
        const level1Result = traverse_with_level(1)(level1A);
        expect(level1Result.cells.size).toBe(2); // level1A, level1B
        expect(level1Result.propagators.size).toBe(1); // actualLevel1Prop
        
        // Test level 2 traversal from level 2 cell
        const level2Result = traverse_with_level(2)(level2A);
        expect(level2Result.cells.size).toBe(2); // level2A, level2B
        expect(level2Result.propagators.size).toBe(1); // level2Prop
        
        // Test level 3 traversal from level 3 cell
        const level3Result = traverse_with_level(3)(level3A);
        expect(level3Result.cells.size).toBe(2); // level3A, level3B
        expect(level3Result.propagators.size).toBe(1); // level3Prop
    });

    test("nested compound propagators maintain correct levels", () => {
        const rootRelation = get_global_parent();
        
        // Create outer compound propagator at level 1 (root level creates level 1)
        const outerInput = construct_cell("outer_input");
        const outerOutput = construct_cell("outer_output");
        
        const outerCompound = compound_propagator(
            [outerInput], 
            [outerOutput], 
            () => {
                // Inner cells and propagators should be at level 1
                const innerCell = construct_cell("inner_cell");
                const innerProp = function_to_primitive_propagator("inner_prop", (x: number) => x + 1);
                const actualInnerProp = innerProp(outerInput, innerCell);
                const actualInnerProp2 = innerProp(innerCell, outerOutput);
                
                // Verify levels
                expect(cell_level(innerCell)).toBe(1);
                expect(propagator_level(actualInnerProp)).toBe(1);
            },
            "outer_compound"
        );
        
        expect(propagator_level(outerCompound)).toBe(1);
        
        // Create level 2 context and nested compound
        const level2Relation = make_relation("level2", rootRelation);
        let level2Compound: Propagator;
        
        parameterize_parent(level2Relation)(() => {
            const level2Input = construct_cell("level2_input");
            const level2Output = construct_cell("level2_output");
            
            level2Compound = compound_propagator(
                [level2Input], 
                [level2Output], 
                () => {
                    // Inner cells and propagators should be at level 2
                    const level2InnerCell = construct_cell("level2_inner_cell");
                    const level2InnerProp = function_to_primitive_propagator("level2_inner_prop", (x: number) => x * 2);
                    const actualLevel2InnerProp = level2InnerProp(level2Input, level2InnerCell);
                    const actualLevel2InnerProp2 = level2InnerProp(level2InnerCell, level2Output);
                    
                    // Verify levels
                    expect(cell_level(level2InnerCell)).toBe(2);
                    expect(propagator_level(actualLevel2InnerProp)).toBe(2);
                },
                "level2_compound"
            );
            
            expect(propagator_level(level2Compound)).toBe(2);
        });
        
        expect(propagator_level(level2Compound)).toBe(2);
    });
});
