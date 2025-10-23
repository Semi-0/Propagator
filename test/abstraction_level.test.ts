// @ts-nocheck
// Disable TypeScript checking for this test file
import { expect, test, beforeEach, describe } from "bun:test";

import { construct_cell, type Cell } from "../Cell/Cell";
import { construct_propagator, type Propagator } from "../Propagator/Propagator";
import { make_relation, type Primitive_Relation } from "../DataTypes/Relation";
import { 
    parameterize_parent, 
    get_global_parent, 
    set_global_state, 
    PublicStateCommand 
} from "../Shared/PublicState";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";
import { merge_value_sets } from "../DataTypes/ValueSet";
import { set_merge } from "../Cell/Merge";

beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP);
    set_merge(merge_value_sets);
    set_merge(merge_value_sets);
});

describe("Abstraction Level Tests", () => {
    
    test("root relation has level 0", () => {
        const rootRelation = get_global_parent();
        expect(rootRelation.get_level()).toBe(0);
    });

    test("child relation has parent level + 1", () => {
        const parentRelation = get_global_parent();
        const childRelation = make_relation("child", parentRelation);
        
        expect(childRelation.get_level()).toBe(1);
        expect(parentRelation.get_level()).toBe(0);
    });

    test("nested relations have correct abstraction levels", () => {
        const rootRelation = get_global_parent();
        const level1Relation = make_relation("level1", rootRelation);
        const level2Relation = make_relation("level2", level1Relation);
        const level3Relation = make_relation("level3", level2Relation);
        
        expect(rootRelation.get_level()).toBe(0);
        expect(level1Relation.get_level()).toBe(1);
        expect(level2Relation.get_level()).toBe(2);
        expect(level3Relation.get_level()).toBe(3);
    });

    test("propagator created with parameterize_parent gets correct abstraction level", () => {
        const rootRelation = get_global_parent();
        expect(rootRelation.get_level()).toBe(0);
        
        // Create a parent relation at level 1
        const parentRelation = make_relation("parent", rootRelation);
        expect(parentRelation.get_level()).toBe(1);
        
        // Create cells for the propagator
        const input = construct_cell("input");
        const output = construct_cell("output");
        
        // Create a propagator using parameterize_parent
        let childRelation: Primitive_Relation;
        const propagator = parameterize_parent(parentRelation)(() => {
            return construct_propagator(
                [input], 
                [output], 
                () => {
                    // Simple identity propagator
                    output.update(input.getStrongest());
                },
                "test_propagator"
            );
        });
        
        // Get the relation from the propagator
        childRelation = propagator.getRelation();
        
        // The child relation should have level = parent level + 1
        expect(childRelation.get_level()).toBe(2);
        expect(parentRelation.get_level()).toBe(1);
        expect(rootRelation.get_level()).toBe(0);
    });

    test("nested parameterize_parent calls maintain correct abstraction levels", () => {
        const rootRelation = get_global_parent();
        expect(rootRelation.get_level()).toBe(0);
        
        // Create nested relations
        const level1Relation = make_relation("level1", rootRelation);
        const level2Relation = make_relation("level2", level1Relation);
        
        expect(level1Relation.get_level()).toBe(1);
        expect(level2Relation.get_level()).toBe(2);
        
        // Create cells
        const input = construct_cell("input");
        const output = construct_cell("output");
        
        // Create propagator with nested parameterize_parent calls
        let childRelation: Primitive_Relation;
        const propagator = parameterize_parent(level1Relation)(() => {
            return parameterize_parent(level2Relation)(() => {
                return construct_propagator(
                    [input], 
                    [output], 
                    () => {
                        output.update(input.getStrongest());
                    },
                    "nested_test_propagator"
                );
            });
        });
        
        childRelation = propagator.getRelation();
        
        // The child relation should have level = level2Relation level + 1
        expect(childRelation.get_level()).toBe(3);
        expect(level2Relation.get_level()).toBe(2);
        expect(level1Relation.get_level()).toBe(1);
        expect(rootRelation.get_level()).toBe(0);
    });

    test("multiple propagators created in same parameterize_parent context have same abstraction level", () => {
        const rootRelation = get_global_parent();
        const parentRelation = make_relation("parent", rootRelation);
        
        // Create cells
        const input1 = construct_cell("input1");
        const output1 = construct_cell("output1");
        const input2 = construct_cell("input2");
        const output2 = construct_cell("output2");
        
        let childRelation1: Primitive_Relation;
        let childRelation2: Primitive_Relation;
        
        // Create two propagators in the same parameterize_parent context
        parameterize_parent(parentRelation)(() => {
            const prop1 = construct_propagator(
                [input1], 
                [output1], 
                () => {
                    output1.update(input1.getStrongest());
                },
                "propagator1"
            );
            
            const prop2 = construct_propagator(
                [input2], 
                [output2], 
                () => {
                    output2.update(input2.getStrongest());
                },
                "propagator2"
            );
            
            childRelation1 = prop1.getRelation();
            childRelation2 = prop2.getRelation();
        });
        
        // Both child relations should have the same level
        expect(childRelation1.get_level()).toBe(2);
        expect(childRelation2.get_level()).toBe(2);
        expect(childRelation1.get_level()).toBe(childRelation2.get_level());
    });

    test("parameterize_parent restores original parent after execution", () => {
        const originalParent = get_global_parent();
        expect(originalParent.get_level()).toBe(0);
        
        const tempParent = make_relation("temp_parent", originalParent);
        expect(tempParent.get_level()).toBe(1);
        
        // Use parameterize_parent
        parameterize_parent(tempParent)(() => {
            const currentParent = get_global_parent();
            expect(currentParent.get_level()).toBe(1);
            expect(currentParent).toBe(tempParent);
        });
        
        // After execution, original parent should be restored
        const restoredParent = get_global_parent();
        expect(restoredParent.get_level()).toBe(0);
        expect(restoredParent).toBe(originalParent);
    });

    test("propagator activation within parameterize_parent context uses correct abstraction level", async () => {
        const rootRelation = get_global_parent();
        const parentRelation = make_relation("parent", rootRelation);
        
        // Create cells
        const input = construct_cell("input");
        const output = construct_cell("output");
        
        let childRelation: Primitive_Relation;
        let activationLevel: number;
        
        // Create propagator with parameterize_parent
        const propagator = parameterize_parent(parentRelation)(() => {
            const prop = construct_propagator(
                [input], 
                [output], 
                () => {
                    // Capture the current parent level during activation
                    activationLevel = get_global_parent().get_level();
                },
                "activation_test_propagator"
            );
            childRelation = prop.getRelation();
            return prop;
        });
        
        // Verify the child relation has correct level
        expect(childRelation.get_level()).toBe(2);
        
        // Activate the propagator
        propagator.activate();
        
        // During activation, the parent should be the child relation (level 2)
        expect(activationLevel).toBe(2);
    });

    test("complex nested propagator hierarchy maintains correct abstraction levels", () => {
        const rootRelation = get_global_parent();
        
        // Create a hierarchy: root -> level1 -> level2 -> level3
        const level1Relation = make_relation("level1", rootRelation);
        const level2Relation = make_relation("level2", level1Relation);
        const level3Relation = make_relation("level3", level2Relation);
        
        // Create cells
        const input = construct_cell("input");
        const output = construct_cell("output");
        
        let finalChildRelation: Primitive_Relation;
        
        // Create propagator with deeply nested parameterize_parent calls
        const propagator = parameterize_parent(level1Relation)(() => {
            return parameterize_parent(level2Relation)(() => {
                return parameterize_parent(level3Relation)(() => {
                    const prop = construct_propagator(
                        [input], 
                        [output], 
                        () => {
                            output.update(input.getStrongest());
                        },
                        "deeply_nested_propagator"
                    );
                    finalChildRelation = prop.getRelation();
                    return prop;
                });
            });
        });
        
        // Verify all levels are correct
        expect(rootRelation.get_level()).toBe(0);
        expect(level1Relation.get_level()).toBe(1);
        expect(level2Relation.get_level()).toBe(2);
        expect(level3Relation.get_level()).toBe(3);
        expect(finalChildRelation.get_level()).toBe(4);
    });
});
