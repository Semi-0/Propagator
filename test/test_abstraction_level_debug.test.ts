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

beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP);
    set_merge(merge_value_sets);
    set_scheduler(simple_scheduler());
});

describe("Abstraction Level Debug Tests", () => {
    
    test("debug: what is the actual root level?", () => {
        const rootRelation = get_global_parent();
        console.log("Root relation level:", rootRelation.get_level());
        expect(rootRelation.get_level()).toBe(0);
    });

    test("debug: what level are cells created at root?", () => {
        const rootRelation = get_global_parent();
        console.log("Root relation level:", rootRelation.get_level());
        
        const rootCell = construct_cell("root_cell");
        console.log("Root cell level:", cell_level(rootCell));
        
        // The actual behavior - let's see what it is
        expect(cell_level(rootCell)).toBeDefined();
    });

    test("debug: what level are propagators created at root?", () => {
        const rootRelation = get_global_parent();
        console.log("Root relation level:", rootRelation.get_level());
        
        const input = construct_cell("input");
        const output = construct_cell("output");
        
        const rootPropagator = construct_propagator(
            [input], 
            [output], 
            () => {
                output.addContent(input.getStrongest());
            },
            "root_propagator"
        );
        
        console.log("Root propagator level:", propagator_level(rootPropagator));
        
        // The actual behavior - let's see what it is
        expect(propagator_level(rootPropagator)).toBeDefined();
    });

    test("debug: function_to_primitive_propagator return type", () => {
        const input = construct_cell("input");
        const output = construct_cell("output");
        
        const primitiveFunc = function_to_primitive_propagator("test_primitive", (x: number) => x + 1);
        console.log("Primitive function type:", typeof primitiveFunc);
        console.log("Primitive function has getRelation:", 'getRelation' in primitiveFunc);
        
        // Call the function to get the actual propagator
        const actualPropagator = primitiveFunc(input, output);
        console.log("Actual propagator type:", typeof actualPropagator);
        console.log("Actual propagator has getRelation:", 'getRelation' in actualPropagator);
        console.log("Actual propagator level:", propagator_level(actualPropagator));
        
        expect(actualPropagator).toBeDefined();
        expect(propagator_level(actualPropagator)).toBeDefined();
    });

    test("debug: parameterize_parent behavior", () => {
        const rootRelation = get_global_parent();
        console.log("Root relation level:", rootRelation.get_level());
        
        // Create a parent relation
        const parentRelation = make_relation("parent", rootRelation);
        console.log("Parent relation level:", parentRelation.get_level());
        
        let cellInContext: Cell<any>;
        let propagatorInContext: Propagator;
        
        parameterize_parent(parentRelation)(() => {
            const currentParent = get_global_parent();
            console.log("Current parent in context:", currentParent.get_level());
            
            cellInContext = construct_cell("context_cell");
            console.log("Cell in context level:", cell_level(cellInContext));
            
            const input = construct_cell("context_input");
            const output = construct_cell("context_output");
            
            propagatorInContext = construct_propagator(
                [input], 
                [output], 
                () => {
                    output.addContent(input.getStrongest());
                },
                "context_propagator"
            );
            
            console.log("Propagator in context level:", propagator_level(propagatorInContext));
        });
        
        // Check levels after context
        console.log("Cell level after context:", cell_level(cellInContext));
        console.log("Propagator level after context:", propagator_level(propagatorInContext));
        
        expect(cell_level(cellInContext)).toBeDefined();
        expect(propagator_level(propagatorInContext)).toBeDefined();
    });

    test("debug: nested parameterize_parent behavior", () => {
        const rootRelation = get_global_parent();
        console.log("Root relation level:", rootRelation.get_level());
        
        const level1Relation = make_relation("level1", rootRelation);
        console.log("Level 1 relation level:", level1Relation.get_level());
        
        const level2Relation = make_relation("level2", level1Relation);
        console.log("Level 2 relation level:", level2Relation.get_level());
        
        let cellInNestedContext: Cell<any>;
        
        parameterize_parent(level1Relation)(() => {
            console.log("In level 1 context, current parent:", get_global_parent().get_level());
            
            parameterize_parent(level2Relation)(() => {
                console.log("In level 2 context, current parent:", get_global_parent().get_level());
                
                cellInNestedContext = construct_cell("nested_cell");
                console.log("Cell in nested context level:", cell_level(cellInNestedContext));
            });
        });
        
        console.log("Cell level after nested context:", cell_level(cellInNestedContext));
        
        expect(cell_level(cellInNestedContext)).toBeDefined();
    });
});
