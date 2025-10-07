import { describe, it, expect, beforeEach } from "bun:test";
import { construct_cell, cell_strongest, cell_dispose, cell_strongest_base_value, cell_id, type Cell } from "../Cell/Cell";
import { p_add, p_multiply, p_subtract } from "../Propagator/BuiltInProps";
import { clear_all_tasks, execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { PublicStateCommand, set_global_state } from "../Shared/PublicState";
import { the_disposed, is_disposed, the_nothing } from "../Cell/CellValue";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";
import { compound_propagator, propagator_id, propagator_dispose, function_to_primitive_propagator } from "../Propagator/Propagator";
import { find_cell_by_id, find_propagator_by_id } from "../Shared/GraphTraversal";

describe("Compound Propagator Child Disposal", () => {
    beforeEach(() => {
        set_global_state(PublicStateCommand.CLEAN_UP);
        set_global_state(PublicStateCommand.SET_SCHEDULER, simple_scheduler());
        clear_all_tasks();
    });

    describe("Basic Child Disposal", () => {
        it("should dispose internal cells when compound propagator is disposed", async () => {
            const input = construct_cell<number>("compound_input");
            const output = construct_cell<number>("compound_output");
            
            // Track the IDs of internal cells
            let step1Id: string;
            let step2Id: string;
            
            const compound = compound_propagator([input], [output], () => {
                const step1 = construct_cell<number>("compound_step1");
                const step2 = construct_cell<number>("compound_step2");
                
                step1Id = cell_id(step1);
                step2Id = cell_id(step2);
                
                const addOne = function_to_primitive_propagator("add_one", (x: number) => x + 1);
                const multiplyTwo = function_to_primitive_propagator("multiply_two", (x: number) => x * 2);
                
                addOne(input, step1);
                multiplyTwo(step1, step2);
                multiplyTwo(step2, output);
            }, "compound_with_internals");
            
            // Set initial value to trigger execution
            input.addContent(5);
            await execute_all_tasks_sequential(() => {});
            
            // Verify internal cells exist and have values
            const step1Before = find_cell_by_id(step1Id!);
            const step2Before = find_cell_by_id(step2Id!);
            expect(step1Before).toBeDefined();
            expect(step2Before).toBeDefined();
            expect(cell_strongest_base_value(step1Before!)).toBe(6); // 5 + 1
            expect(cell_strongest_base_value(step2Before!)).toBe(12); // 6 * 2
            expect(cell_strongest_base_value(output)).toBe(24); // 12 * 2
            
            // Dispose the compound propagator
            compound.dispose();
            await execute_all_tasks_sequential(() => {});
            
            // Verify internal cells are disposed
            const step1After = find_cell_by_id(step1Id!);
            const step2After = find_cell_by_id(step2Id!);
            
            expect(step1After).toBeUndefined(); // Should be removed from global state
            expect(step2After).toBeUndefined(); // Should be removed from global state
        });

        it("should dispose internal propagators when compound propagator is disposed", async () => {
            const input = construct_cell<number>("compound_input2");
            const output = construct_cell<number>("compound_output2");
            
            // Track the IDs of internal propagators
            let addOnePropId: string;
            let multiplyTwoPropId: string;
            
            const compound = compound_propagator([input], [output], () => {
                const step1 = construct_cell<number>("compound_step1_2");
                const step2 = construct_cell<number>("compound_step2_2");
                
                const addOne = function_to_primitive_propagator("add_one_2", (x: number) => x + 1);
                const multiplyTwo = function_to_primitive_propagator("multiply_two_2", (x: number) => x * 2);
                
                const addOneProp = addOne(input, step1);
                const multiplyTwoProp = multiplyTwo(step1, step2);
                multiplyTwo(step2, output);
                
                addOnePropId = propagator_id(addOneProp);
                multiplyTwoPropId = propagator_id(multiplyTwoProp);
            }, "compound_with_propagators");
            
            // Set initial value to trigger execution
            input.addContent(3);
            await execute_all_tasks_sequential(() => {});
            
            // Verify internal propagators exist
            expect(find_propagator_by_id(addOnePropId!)).toBeDefined();
            expect(find_propagator_by_id(multiplyTwoPropId!)).toBeDefined();
            
            // Dispose the compound propagator
            compound.dispose();
            await execute_all_tasks_sequential(() => {});
            
            // Verify internal propagators are removed
            expect(find_propagator_by_id(addOnePropId!)).toBeUndefined();
            expect(find_propagator_by_id(multiplyTwoPropId!)).toBeUndefined();
        });

        it("should dispose propagators before cells", async () => {
            const input = construct_cell<number>("compound_input3");
            const output = construct_cell<number>("compound_output3");
            
            const disposalOrder: string[] = [];
            
            const compound = compound_propagator([input], [output], () => {
                const step1 = construct_cell<number>("compound_step1_3");
                const step2 = construct_cell<number>("compound_step2_3");
                
                // Override dispose to track order
                const originalStep1Dispose = step1.dispose;
                const originalStep2Dispose = step2.dispose;
                
                step1.dispose = () => {
                    disposalOrder.push("cell_step1");
                    originalStep1Dispose.call(step1);
                };
                
                step2.dispose = () => {
                    disposalOrder.push("cell_step2");
                    originalStep2Dispose.call(step2);
                };
                
                const addOne = function_to_primitive_propagator("add_one_3", (x: number) => x + 1);
                const multiplyTwo = function_to_primitive_propagator("multiply_two_3", (x: number) => x * 2);
                
                const addOneProp = addOne(input, step1);
                const multiplyTwoProp = multiplyTwo(step1, step2);
                
                // Override propagator dispose to track order
                const originalAddOneDispose = addOneProp.dispose;
                const originalMultiplyTwoDispose = multiplyTwoProp.dispose;
                
                addOneProp.dispose = () => {
                    disposalOrder.push("prop_addOne");
                    originalAddOneDispose.call(addOneProp);
                };
                
                multiplyTwoProp.dispose = () => {
                    disposalOrder.push("prop_multiplyTwo");
                    originalMultiplyTwoDispose.call(multiplyTwoProp);
                };
                
                multiplyTwo(step2, output);
            }, "compound_disposal_order");
            
            // Set initial value
            input.addContent(7);
            await execute_all_tasks_sequential(() => {});
            
            // Clear disposal order
            disposalOrder.length = 0;
            
            // Dispose the compound propagator
            compound.dispose();
            await execute_all_tasks_sequential(() => {});
            
            // Verify propagators were disposed before cells
            const propIndices = disposalOrder
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => item.startsWith("prop_"))
                .map(({ index }) => index);
            
            const cellIndices = disposalOrder
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => item.startsWith("cell_"))
                .map(({ index }) => index);
            
            // All propagators should come before all cells
            if (propIndices.length > 0 && cellIndices.length > 0) {
                const lastPropIndex = Math.max(...propIndices);
                const firstCellIndex = Math.min(...cellIndices);
                expect(lastPropIndex).toBeLessThan(firstCellIndex);
            }
        });
    });

    describe("Nested Compound Propagators", () => {
        it("should dispose nested compound propagators and their children", async () => {
            const input = construct_cell<number>("nested_input");
            const output = construct_cell<number>("nested_output");
            
            let innerCellId: string;
            let innerPropId: string;
            let outerCellId: string;
            
            const outerCompound = compound_propagator([input], [output], () => {
                const outerStep = construct_cell<number>("outer_step");
                outerCellId = cell_id(outerStep);
                
                const innerCompound = compound_propagator([input], [outerStep], () => {
                    const innerCell = construct_cell<number>("inner_cell");
                    innerCellId = cell_id(innerCell);
                    
                    const double = function_to_primitive_propagator("double", (x: number) => x * 2);
                    const doubleProp = double(input, innerCell);
                    innerPropId = propagator_id(doubleProp);
                    
                    const addOne = function_to_primitive_propagator("add_one_nested", (x: number) => x + 1);
                    addOne(innerCell, outerStep);
                }, "inner_compound");
                
                const triple = function_to_primitive_propagator("triple", (x: number) => x * 3);
                triple(outerStep, output);
            }, "outer_compound");
            
            // Set initial value
            input.addContent(4);
            await execute_all_tasks_sequential(() => {});
            
            // Verify nested structure exists
            expect(find_cell_by_id(outerCellId!)).toBeDefined();
            expect(find_cell_by_id(innerCellId!)).toBeDefined();
            expect(find_propagator_by_id(innerPropId!)).toBeDefined();
            
            // Dispose outer compound
            outerCompound.dispose();
            await execute_all_tasks_sequential(() => {});
            
            // Verify all nested children are disposed
            expect(find_cell_by_id(outerCellId!)).toBeUndefined();
            expect(find_cell_by_id(innerCellId!)).toBeUndefined();
            expect(find_propagator_by_id(innerPropId!)).toBeUndefined();
        });

        it("should handle deeply nested compound propagators", async () => {
            const input = construct_cell<number>("deep_input");
            const output = construct_cell<number>("deep_output");
            
            const cellIds: string[] = [];
            
            const level1 = compound_propagator([input], [output], () => {
                const cell1 = construct_cell<number>("level1_cell");
                cellIds.push(cell_id(cell1));
                
                const level2 = compound_propagator([input], [cell1], () => {
                    const cell2 = construct_cell<number>("level2_cell");
                    cellIds.push(cell_id(cell2));
                    
                    const level3 = compound_propagator([input], [cell2], () => {
                        const cell3 = construct_cell<number>("level3_cell");
                        cellIds.push(cell_id(cell3));
                        
                        const addOne = function_to_primitive_propagator("add_one_l3", (x: number) => x + 1);
                        addOne(input, cell3);
                        
                        const double = function_to_primitive_propagator("double_l3", (x: number) => x * 2);
                        double(cell3, cell2);
                    }, "level3");
                    
                    const triple = function_to_primitive_propagator("triple_l2", (x: number) => x * 3);
                    triple(cell2, cell1);
                }, "level2");
                
                const addTen = function_to_primitive_propagator("add_ten_l1", (x: number) => x + 10);
                addTen(cell1, output);
            }, "level1");
            
            // Set initial value
            input.addContent(2);
            await execute_all_tasks_sequential(() => {});
            
            // Verify all cells exist
            cellIds.forEach(id => {
                expect(find_cell_by_id(id)).toBeDefined();
            });
            
            // Dispose level1 (should cascade to all nested levels)
            level1.dispose();
            await execute_all_tasks_sequential(() => {});
            
            // Verify all cells are disposed
            cellIds.forEach(id => {
                expect(find_cell_by_id(id)).toBeUndefined();
            });
        });
    });

    describe("Input/Output Cell Handling", () => {
        it("should not dispose input and output cells of compound propagator", async () => {
            const input = construct_cell<number>("io_input");
            const output = construct_cell<number>("io_output");
            
            const inputId = cell_id(input);
            const outputId = cell_id(output);
            
            const compound = compound_propagator([input], [output], () => {
                const step = construct_cell<number>("io_step");
                
                const addOne = function_to_primitive_propagator("add_one_io", (x: number) => x + 1);
                addOne(input, step);
                
                const double = function_to_primitive_propagator("double_io", (x: number) => x * 2);
                double(step, output);
            }, "compound_io");
            
            // Set initial value
            input.addContent(10);
            await execute_all_tasks_sequential(() => {});
            
            // Dispose compound
            compound.dispose();
            await execute_all_tasks_sequential(() => {});
            
            // Input and output should still exist
            expect(find_cell_by_id(inputId)).toBeDefined();
            expect(find_cell_by_id(outputId)).toBeDefined();
            
            // But they should not be disposed
            expect(is_disposed(cell_strongest(input))).toBe(false);
            expect(is_disposed(cell_strongest(output))).toBe(false);
        });
    });

    describe("Complex Network Disposal", () => {
        it("should dispose compound propagator with branching internal network", async () => {
            const input = construct_cell<number>("branch_input");
            const output1 = construct_cell<number>("branch_output1");
            const output2 = construct_cell<number>("branch_output2");
            
            const internalCellIds: string[] = [];
            
            const compound = compound_propagator([input], [output1, output2], () => {
                const branch1 = construct_cell<number>("branch1");
                const branch2 = construct_cell<number>("branch2");
                
                internalCellIds.push(cell_id(branch1), cell_id(branch2));
                
                // Branch 1: input -> double -> output1
                const double = function_to_primitive_propagator("double_branch", (x: number) => x * 2);
                double(input, branch1);
                double(branch1, output1);
                
                // Branch 2: input -> triple -> output2
                const triple = function_to_primitive_propagator("triple_branch", (x: number) => x * 3);
                triple(input, branch2);
                triple(branch2, output2);
            }, "branching_compound");
            
            // Set initial value
            input.addContent(5);
            await execute_all_tasks_sequential(() => {});
            
            // Verify computation
            expect(cell_strongest_base_value(output1)).toBe(20); // 5 * 2 * 2
            expect(cell_strongest_base_value(output2)).toBe(45); // 5 * 3 * 3
            
            // Dispose compound
            compound.dispose();
            await execute_all_tasks_sequential(() => {});
            
            // Verify internal cells are disposed
            internalCellIds.forEach(id => {
                expect(find_cell_by_id(id)).toBeUndefined();
            });
        });

        it("should handle disposal with shared internal cells", async () => {
            const input = construct_cell<number>("shared_input");
            const output = construct_cell<number>("shared_output");
            
            let sharedCellId: string;
            
            const compound = compound_propagator([input], [output], () => {
                const shared = construct_cell<number>("shared_cell");
                sharedCellId = cell_id(shared);
                
                // Multiple propagators using the same cell
                const addOne = function_to_primitive_propagator("add_one_shared", (x: number) => x + 1);
                const double = function_to_primitive_propagator("double_shared", (x: number) => x * 2);
                const triple = function_to_primitive_propagator("triple_shared", (x: number) => x * 3);
                
                addOne(input, shared);
                const temp = construct_cell<number>("temp_shared");
                double(shared, temp);
                triple(temp, output);
            }, "shared_compound");
            
            // Set initial value
            input.addContent(7);
            await execute_all_tasks_sequential(() => {});
            
            // Dispose compound
            compound.dispose();
            await execute_all_tasks_sequential(() => {});
            
            // Verify shared cell is disposed
            expect(find_cell_by_id(sharedCellId!)).toBeUndefined();
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty compound propagator", async () => {
            const input = construct_cell<number>("empty_input");
            const output = construct_cell<number>("empty_output");
            
            const compound = compound_propagator([input], [output], () => {
                // No internal structure
            }, "empty_compound");
            
            // Should not throw
            expect(() => compound.dispose()).not.toThrow();
            await execute_all_tasks_sequential(() => {});
        });

        it("should handle compound propagator with only cells", async () => {
            const input = construct_cell<number>("cells_only_input");
            const output = construct_cell<number>("cells_only_output");
            
            let internalCellId: string;
            
            const compound = compound_propagator([input], [output], () => {
                const internal = construct_cell<number>("cells_only_internal");
                internalCellId = cell_id(internal);
                // No propagators connecting them
            }, "cells_only_compound");
            
            // Dispose
            compound.dispose();
            await execute_all_tasks_sequential(() => {});
            
            // Internal cell should be disposed
            expect(find_cell_by_id(internalCellId!)).toBeUndefined();
        });

        it("should handle compound propagator with only propagators", async () => {
            const input = construct_cell<number>("props_only_input");
            const output = construct_cell<number>("props_only_output");
            
            let propId: string;
            
            const compound = compound_propagator([input], [output], () => {
                const addOne = function_to_primitive_propagator("add_one_props_only", (x: number) => x + 1);
                const prop = addOne(input, output);
                propId = propagator_id(prop);
            }, "props_only_compound");
            
            // Set value
            input.addContent(15);
            await execute_all_tasks_sequential(() => {});
            
            // Dispose
            compound.dispose();
            await execute_all_tasks_sequential(() => {});
            
            // Propagator should be disposed
            expect(find_propagator_by_id(propId!)).toBeUndefined();
        });

        it("should handle double disposal gracefully", async () => {
            const input = construct_cell<number>("double_disposal_input");
            const output = construct_cell<number>("double_disposal_output");
            
            const compound = compound_propagator([input], [output], () => {
                const step = construct_cell<number>("double_disposal_step");
                const addOne = function_to_primitive_propagator("add_one_double", (x: number) => x + 1);
                addOne(input, step);
                addOne(step, output);
            }, "double_disposal_compound");
            
            // First disposal
            compound.dispose();
            await execute_all_tasks_sequential(() => {});
            
            // Second disposal should not throw
            expect(() => compound.dispose()).not.toThrow();
            await execute_all_tasks_sequential(() => {});
        });
    });
});

