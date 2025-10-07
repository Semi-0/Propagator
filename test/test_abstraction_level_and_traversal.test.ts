// @ts-nocheck
import { expect, test, beforeEach, describe } from "bun:test";

import { construct_cell, type Cell, cell_level } from "../Cell/Cell";
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

describe("Abstraction Level and Traversal Tests", () => {
    
    test("cells maintain correct abstraction levels in different contexts", () => {
        const rootRelation = get_global_parent();
        expect(rootRelation.get_level()).toBe(0);
        
        // Create cells at root level
        const rootCell = construct_cell("root_cell");
        expect(cell_level(rootCell)).toBe(1);
        
        // Create a parent relation at level 1
        const parentRelation = make_relation("parent", rootRelation);
        expect(parentRelation.get_level()).toBe(1);
        
        // Create cells within parameterize_parent context
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
        
        // Create propagator at root level
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
        
        // Create propagator within parameterize_parent context
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
        
        // Create primitive propagator at root level
        const rootPrimitiveFn = function_to_primitive_propagator("root_primitive", (x: number) => x + 1);
        const rootPrimitive = rootPrimitiveFn(input, output); // This creates the actual propagator
        
        expect(propagator_level(rootPrimitive)).toBe(1);
        
        // Create a parent relation at level 1
        const parentRelation = make_relation("parent", rootRelation);
        
        // Create primitive propagator within parameterize_parent context
        let level1Primitive: Propagator;
        parameterize_parent(parentRelation)(() => {
            const level1Input = construct_cell("level1_input");
            const level1Output = construct_cell("level1_output");
            
            const level1PrimitiveFn = function_to_primitive_propagator("level1_primitive", (x: number) => x * 2);
            level1Primitive = level1PrimitiveFn(level1Input, level1Output); // This creates the actual propagator
            
            expect(propagator_level(level1Primitive)).toBe(2);
        });
        
        // Verify the primitive propagator maintains its level
        expect(propagator_level(level1Primitive)).toBe(2);
        expect(propagator_level(rootPrimitive)).toBe(1);
    });

    test("compound_propagator maintains correct abstraction level", () => {
        const rootRelation = get_global_parent();
        
        // Create cells
        const input = construct_cell("input");
        const output = construct_cell("output");
        
        // Create compound propagator at root level
        const rootCompound = compound_propagator(
            [input], 
            [output], 
            () => {
                const innerCell = construct_cell("inner_cell");
                const innerProp = function_to_primitive_propagator("inner_prop", (x: number) => x + 1);
                innerProp(input, innerCell);
                innerProp(innerCell, output);
            },
            "root_compound"
        );
        
        expect(propagator_level(rootCompound)).toBe(1);
        
        // Create a parent relation at level 1
        const parentRelation = make_relation("parent", rootRelation);
        
        // Create compound propagator within parameterize_parent context
        let level1Compound: Propagator;
        parameterize_parent(parentRelation)(() => {
            const level1Input = construct_cell("level1_input");
            const level1Output = construct_cell("level1_output");
            
            level1Compound = compound_propagator(
                [level1Input], 
                [level1Output], 
                () => {
                    const innerCell = construct_cell("level1_inner_cell");
                    const innerProp = function_to_primitive_propagator("level1_inner_prop", (x: number) => x * 2);
                    innerProp(level1Input, innerCell);
                    innerProp(innerCell, level1Output);
                },
                "level1_compound"
            );
            
            expect(propagator_level(level1Compound)).toBe(2);
        });
        
        // Verify the compound propagator maintains its level
        expect(propagator_level(level1Compound)).toBe(2);
        expect(propagator_level(rootCompound)).toBe(1);
    });

    test("traverse_with_level(0) finds only level 0 cells and propagators", () => {
        const rootRelation = get_global_parent();
        
        // Create level 0 cells and propagators
        const level0Input = construct_cell("level0_input");
        const level0Output = construct_cell("level0_output");
        const level0Prop = function_to_primitive_propagator("level0_prop", (x: number) => x + 1);
        level0Prop(level0Input, level0Output);
        
        // Create level 1 context
        const level1Relation = make_relation("level1", rootRelation);
        let level1Input: Cell<any>, level1Output: Cell<any>, level1Prop: Propagator;
        
        parameterize_parent(level1Relation)(() => {
            level1Input = construct_cell("level1_input");
            level1Output = construct_cell("level1_output");
            level1Prop = function_to_primitive_propagator("level1_prop", (x: number) => x * 2);
            level1Prop(level1Input, level1Output);
        });
        
        // Create level 2 context
        const level2Relation = make_relation("level2", level1Relation);
        let level2Input: Cell<any>, level2Output: Cell<any>, level2Prop: Propagator;
        
        parameterize_parent(level2Relation)(() => {
            level2Input = construct_cell("level2_input");
            level2Output = construct_cell("level2_output");
            level2Prop = function_to_primitive_propagator("level2_prop", (x: number) => x - 1);
            level2Prop(level2Input, level2Output);
        });
        
        // Test traverse_with_level(0)
        const level0Traversal = traverse_with_level(0);
        const result = level0Traversal(level0Input);
        
        // Should only find level 0 cells and propagators
        expect(result.cells.size).toBe(2); // level0Input and level0Output
        expect(result.propagators.size).toBe(1); // level0Prop
        
        // Verify the found items are actually level 0
        for (const [id, cell] of result.cells) {
            expect(cell_level(cell)).toBe(1);
        }
        
        for (const [id, prop] of result.propagators) {
            expect(propagator_level(prop)).toBe(1);
        }
    });

    test("traverse_with_level(1) finds only level 1 cells and propagators", () => {
        const rootRelation = get_global_parent();
        
        // Create level 0 cells and propagators
        const level0Input = construct_cell("level0_input");
        const level0Output = construct_cell("level0_output");
        const level0Prop = function_to_primitive_propagator("level0_prop", (x: number) => x + 1);
        level0Prop(level0Input, level0Output);
        
        // Create level 1 context
        const level1Relation = make_relation("level1", rootRelation);
        let level1Input: Cell<any>, level1Output: Cell<any>, level1Prop: Propagator;
        
        parameterize_parent(level1Relation)(() => {
            level1Input = construct_cell("level1_input");
            level1Output = construct_cell("level1_output");
            level1Prop = function_to_primitive_propagator("level1_prop", (x: number) => x * 2);
            level1Prop(level1Input, level1Output);
        });
        
        // Test traverse_with_level(1)
        const level1Traversal = traverse_with_level(1);
        const result = level1Traversal(level1Input);
        
        // Should only find level 1 cells and propagators
        expect(result.cells.size).toBe(2); // level1Input and level1Output
        expect(result.propagators.size).toBe(1); // level1Prop
        
        // Verify the found items are actually level 1
        for (const [id, cell] of result.cells) {
            expect(cell_level(cell)).toBe(2);
        }
        
        for (const [id, prop] of result.propagators) {
            expect(propagator_level(prop)).toBe(2);
        }
    });

    test("traverse_primitive_level finds only level 0 items", () => {
        const rootRelation = get_global_parent();
        
        // Create level 0 network
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        const p1Fn = function_to_primitive_propagator("p1", (x: number) => x + 1);
        const p2Fn = function_to_primitive_propagator("p2", (x: number) => x * 2);
        const p1 = p1Fn(a, b); // Create actual propagator
        const p2 = p2Fn(b, c); // Create actual propagator
        
        // Create level 1 network
        const level1Relation = make_relation("level1", rootRelation);
        let level1A: Cell<any>, level1B: Cell<any>, level1C: Cell<any>;
        let level1P1: Propagator, level1P2: Propagator;
        
        parameterize_parent(level1Relation)(() => {
            level1A = construct_cell("level1_a");
            level1B = construct_cell("level1_b");
            level1C = construct_cell("level1_c");
            const level1P1Fn = function_to_primitive_propagator("level1_p1", (x: number) => x + 1);
            const level1P2Fn = function_to_primitive_propagator("level1_p2", (x: number) => x * 2);
            level1P1 = level1P1Fn(level1A, level1B); // Create actual propagator
            level1P2 = level1P2Fn(level1B, level1C); // Create actual propagator
        });
        
        // Test traverse_primitive_level
        const result = traverse_primitive_level(a);
        
        // Should only find level 0 items
        expect(result.cells.size).toBe(3); // a, b, c
        expect(result.propagators.size).toBe(2); // p1, p2
        
        // Verify all found items are level 0
        for (const [id, cell] of result.cells) {
            expect(cell_level(cell)).toBe(1);
        }
        
        for (const [id, prop] of result.propagators) {
            expect(propagator_level(prop)).toBe(1);
        }
        
        // Verify specific items are found (using actual IDs)
        const aId = a.getRelation().get_id();
        const bId = b.getRelation().get_id();
        const cId = c.getRelation().get_id();
        const p1Id = propagator_id(p1);
        const p2Id = propagator_id(p2);
        
        expect(result.cells.has(aId)).toBe(true);
        expect(result.cells.has(bId)).toBe(true);
        expect(result.cells.has(cId)).toBe(true);
        expect(result.propagators.has(p1Id)).toBe(true);
        expect(result.propagators.has(p2Id)).toBe(true);
    });

    test("traverse_with_level correctly filters mixed-level networks", () => {
        const rootRelation = get_global_parent();
        
        // Create a complex network with mixed levels
        const rootA = construct_cell("root_a");
        const rootB = construct_cell("root_b");
        const rootProp = function_to_primitive_propagator("root_prop", (x: number) => x + 1);
        rootProp(rootA, rootB);
        
        // Level 1 network
        const level1Relation = make_relation("level1", rootRelation);
        let level1A: Cell<any>, level1B: Cell<any>, level1Prop: Propagator;
        
        parameterize_parent(level1Relation)(() => {
            level1A = construct_cell("level1_a");
            level1B = construct_cell("level1_b");
            level1Prop = function_to_primitive_propagator("level1_prop", (x: number) => x * 2);
            level1Prop(level1A, level1B);
        });
        
        // Level 2 network
        const level2Relation = make_relation("level2", level1Relation);
        let level2A: Cell<any>, level2B: Cell<any>, level2Prop: Propagator;
        
        parameterize_parent(level2Relation)(() => {
            level2A = construct_cell("level2_a");
            level2B = construct_cell("level2_b");
            level2Prop = function_to_primitive_propagator("level2_prop", (x: number) => x - 1);
            level2Prop(level2A, level2B);
        });
        
        // Test level 0 traversal from root cell
        const level0Result = traverse_with_level(0)(rootA);
        expect(level0Result.cells.size).toBe(2); // rootA, rootB
        expect(level0Result.propagators.size).toBe(1); // rootProp
        
        // Test level 1 traversal from level 1 cell
        const level1Result = traverse_with_level(1)(level1A);
        expect(level1Result.cells.size).toBe(2); // level1A, level1B
        expect(level1Result.propagators.size).toBe(1); // level1Prop
        
        // Test level 2 traversal from level 2 cell
        const level2Result = traverse_with_level(2)(level2A);
        expect(level2Result.cells.size).toBe(2); // level2A, level2B
        expect(level2Result.propagators.size).toBe(1); // level2Prop
    });

    test("find_cell_by_id and find_propagator_by_id work correctly", () => {
        const rootRelation = get_global_parent();
        
        // Create cells and propagators
        const cell1 = construct_cell("test_cell_1");
        const cell2 = construct_cell("test_cell_2");
        const prop1Fn = function_to_primitive_propagator("test_prop_1", (x: number) => x + 1);
        const prop1 = prop1Fn(cell1, cell2); // Create the actual propagator
        
        // Test find_cell_by_id using actual UUID IDs
        const cell1Id = cell1.getRelation().get_id();
        const cell2Id = cell2.getRelation().get_id();
        const foundCell1 = find_cell_by_id(cell1Id);
        const foundCell2 = find_cell_by_id(cell2Id);
        const notFoundCell = find_cell_by_id("nonexistent_cell");
        
        expect(foundCell1).toBe(cell1);
        expect(foundCell2).toBe(cell2);
        expect(notFoundCell).toBeUndefined();
        
        // Test find_propagator_by_id using actual UUID ID
        const prop1Id = propagator_id(prop1);
        const foundProp1 = find_propagator_by_id(prop1Id);
        const notFoundProp = find_propagator_by_id("nonexistent_prop");
        
        expect(foundProp1).toBe(prop1);
        expect(notFoundProp).toBeUndefined();
    });

    test("nested compound propagators maintain correct levels", () => {
        const rootRelation = get_global_parent();
        
        // Create outer compound propagator at level 0
        const outerInput = construct_cell("outer_input");
        const outerOutput = construct_cell("outer_output");
        
        const outerCompound = compound_propagator(
            [outerInput], 
            [outerOutput], 
            () => {
                // Inner cells and propagators should be at level 0
                const innerCell = construct_cell("inner_cell");
                const innerProp = function_to_primitive_propagator("inner_prop", (x: number) => x + 1);
                innerProp(outerInput, innerCell);
                innerProp(innerCell, outerOutput);
                
                // Verify levels
                expect(cell_level(innerCell)).toBe(1);
                expect(propagator_level(innerProp)).toBe(1);
            },
            "outer_compound"
        );
        
        expect(propagator_level(outerCompound)).toBe(1);
        
        // Create level 1 context and nested compound
        const level1Relation = make_relation("level1", rootRelation);
        let level1Compound: Propagator;
        
        parameterize_parent(level1Relation)(() => {
            const level1Input = construct_cell("level1_input");
            const level1Output = construct_cell("level1_output");
            
            level1Compound = compound_propagator(
                [level1Input], 
                [level1Output], 
                () => {
                    // Inner cells and propagators should be at level 1
                    const level1InnerCell = construct_cell("level1_inner_cell");
                    const level1InnerProp = function_to_primitive_propagator("level1_inner_prop", (x: number) => x * 2);
                    level1InnerProp(level1Input, level1InnerCell);
                    level1InnerProp(level1InnerCell, level1Output);
                    
                    // Verify levels
                    expect(cell_level(level1InnerCell)).toBe(2);
                    expect(propagator_level(level1InnerProp)).toBe(2);
                },
                "level1_compound"
            );
            
            expect(propagator_level(level1Compound)).toBe(2);
        });
        
        expect(propagator_level(level1Compound)).toBe(2);
    });
});
