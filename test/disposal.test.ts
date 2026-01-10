/**
 * @fileoverview Comprehensive Disposal Tests
 * 
 * Tests for cell and propagator disposal mechanisms including:
 * 1. Basic cell disposal and propagator garbage collection
 * 2. Bi-directional propagation disposal handling
 * 3. Compound propagator disposal with child cleanup
 * 4. Memory cleanup verification through scheduler
 */

import { describe, test, expect, beforeEach } from "bun:test";
// Initialize all generic procedure handlers before importing modules

import {
    construct_cell,
    cell_strongest_base_value,
    primitive_construct_cell,
    update_cell,
    internal_cell_dispose,
    type Cell,
    dispose_cell
} from "../Cell/Cell";
import {
    p_add,
    p_multiply,
    p_subtract,
    com_celsius_to_fahrenheit,
    p_sync,
    p_constant,
    ce_constant
} from "../Propagator/BuiltInProps";
import {
    compound_propagator,
    primitive_propagator,
    dispose_propagator,
    internal_propagator_dispose
} from "../Propagator/Propagator";
import {
    execute_all_tasks_sequential,
    Current_Scheduler,
    disposal_queue_size
} from "../Shared/Scheduler/Scheduler";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { the_nothing, is_disposed } from "../Cell/CellValue";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";
import { set_scheduler } from "../Shared/Scheduler/Scheduler";
import { set_merge } from "../Cell/Merge";
import { merge_value_sets } from "../DataTypes/ValueSet";
import { find_cell_by_id, find_propagator_by_id } from "../Shared/GraphTraversal";
import { cell_id } from "../Cell/Cell";
import { propagator_id } from "../Propagator/Propagator";
import { get_children } from "../Shared/Generics";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { compound_tell } from "../Helper/UI";
import { vector_clock_layer } from "../AdvanceReactivity/vector_clock";
import { merge_patched_set } from "../DataTypes/PatchedValueSet";
import { merge_temporary_value_set } from "../DataTypes/TemporaryValueSet";
import { p_reactive_dispatch, source_cell, update_source_cell } from "../DataTypes/PremisesSource";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";

// Alias to match the public API names
const cell_dispose = dispose_cell;
const propagator_dispose = dispose_propagator;

beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP);
    set_merge(merge_value_sets);
    set_scheduler(simple_scheduler());
});

describe("Cell Disposal Tests", () => {
    test("disposing a cell should mark it as disposed", async () => {
        const cell = construct_cell("test_cell");
        
        // Verify cell is not disposed initially
        expect(is_disposed(cell.getStrongest())).toBe(false);
        
        // Dispose the cell
        cell_dispose(cell);
        await execute_all_tasks_sequential(() => {});
        
        // Verify cell is now disposed
        expect(is_disposed(cell.getStrongest())).toBe(true);
        expect(is_disposed(cell.getContent())).toBe(true);
    });

    test("disposing a cell should trigger disposal of connected propagators", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const result = construct_cell("result");
        
        const prop = p_add(a, b, result);
        const propId = propagator_id(prop);
        
        // Initial propagation should work
        update_cell(a, 10);
        update_cell(b, 5);
        await execute_all_tasks_sequential(() => {});
        expect(cell_strongest_base_value(result)).toBe(15);
        
        // Verify propagator exists
        expect(find_propagator_by_id(propId)).toBeDefined();
        
        // Dispose the cell
        cell_dispose(a);
        
        // Execute tasks to trigger propagator disposal
        await execute_all_tasks_sequential(() => {});
        
        // Verify propagator was cleaned up from global state
        expect(find_propagator_by_id(propId)).toBeUndefined();
        
        // Verify cell was cleaned up
        expect(find_cell_by_id(cell_id(a))).toBeUndefined();
    });

    test("disposing input cell should dispose both upstream and downstream propagators", async () => {
        // Create a chain: a -> [prop1] -> b -> [prop2] -> c
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        
        const prop1 = p_add(a, construct_cell("const"), b);
        const prop2 = p_multiply(b, construct_cell("const2"), c);
        
        const prop1Id = propagator_id(prop1);
        const prop2Id = propagator_id(prop2);
        
        // Verify both propagators exist
        expect(find_propagator_by_id(prop1Id)).toBeDefined();
        expect(find_propagator_by_id(prop2Id)).toBeDefined();
        
        // Dispose middle cell
        cell_dispose(b);
        await execute_all_tasks_sequential(() => {});
        
        // Both propagators should be disposed
        expect(find_propagator_by_id(prop1Id)).toBeUndefined();
        expect(find_propagator_by_id(prop2Id)).toBeUndefined();
    });

    test("disposing a cell in bi-directional propagation should cleanup both directions", async () => {
        const celsius = construct_cell<number>("celsius");
        const fahrenheit = construct_cell<number>("fahrenheit");
        
        // Create bi-directional propagator
        const biProp = com_celsius_to_fahrenheit(celsius, fahrenheit);
        const biPropId = propagator_id(biProp);
        
        // Test initial propagation
        update_cell(celsius, 0);
        await execute_all_tasks_sequential(() => {});
        expect(cell_strongest_base_value(fahrenheit)).toBe(32);
        
        // Verify propagator exists
        expect(find_propagator_by_id(biPropId)).toBeDefined();
        
        // Dispose one cell
        cell_dispose(celsius);
        await execute_all_tasks_sequential(() => {});
        
        // Propagator should be cleaned up
        expect(find_propagator_by_id(biPropId)).toBeUndefined();
        
        // Cell should be cleaned up
        expect(find_cell_by_id(cell_id(celsius))).toBeUndefined();
    });

    test("disposing a cell should not affect unrelated propagators", async () => {
        set_merge(merge_temporary_value_set)

        const source = source_cell("source");
       
 
        
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        const d = construct_cell("d");
        const result1 = construct_cell("result1");
        const result2 = construct_cell("result2");
        p_reactive_dispatch(source as Cell<LayeredObject<Map<Cell<any>, any>>>, a);
        p_reactive_dispatch(source as Cell<LayeredObject<Map<Cell<any>, any>>>, b);
        p_reactive_dispatch(source as Cell<LayeredObject<Map<Cell<any>, any>>>, c);
        p_reactive_dispatch(source as Cell<LayeredObject<Map<Cell<any>, any>>>, d);
        // Create two independent propagator networks
        const prop1 = p_add(a, b, result1);
        const prop2 = p_add(c, d, result2);
        
        const prop1Id = propagator_id(prop1);
        const prop2Id = propagator_id(prop2);
        
        // Test both work
        update_source_cell(source, new Map([[a, 10], [b, 5], [c, 20], [d, 8]]));
        await execute_all_tasks_sequential(() => {});

        expect(cell_strongest_base_value(result1)).toBe(15);
        expect(cell_strongest_base_value(result2)).toBe(28);
        
        // Dispose cell from first network
        cell_dispose(a);
        await execute_all_tasks_sequential(() => {});
        
        // First propagator should be disposed
        expect(find_propagator_by_id(prop1Id)).toBeUndefined();
        
        // Second propagator should still exist
        expect(find_propagator_by_id(prop2Id)).toBeDefined();
        
        // Second network should still work
        update_source_cell(source, new Map([[c, 20], [d, 10]]));
        await execute_all_tasks_sequential(() => {});
        expect(cell_strongest_base_value(result2)).toBe(30);
    });

    test("disposal queue should be cleared after cleanup", async () => {
        const cell = construct_cell("test_cell");
        const prop = p_add(cell, construct_cell("other"), construct_cell("result"));
        
        // Get initial disposal queue size
        const initialQueueSize = disposal_queue_size();
        
        // Dispose cell
        cell_dispose(cell);
        
        // Queue should have items before cleanup
        expect(disposal_queue_size()).toBeGreaterThan(initialQueueSize);
        
        // Execute cleanup
        await execute_all_tasks_sequential(() => {});
        
        // Queue should be cleared
        expect(disposal_queue_size()).toBe(0);
    });
});

describe("Propagator Disposal Tests", () => {
    test("disposing a primitive propagator should remove it from neighbors", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const result = construct_cell("result");
        
        const prop = p_add(a, b, result);
        
        // Verify propagator is in neighbors
        expect(a.getNeighbors().size).toBeGreaterThan(0);
        expect(b.getNeighbors().size).toBeGreaterThan(0);
        
        // Dispose propagator
        propagator_dispose(prop);
        
        // Execute cleanup
        await execute_all_tasks_sequential(() => {});
        
        // Propagator should be removed from all neighbors
        expect(a.getNeighbors().has(propagator_id(prop))).toBe(false);
        expect(b.getNeighbors().has(propagator_id(prop))).toBe(false);
        
        // Propagator should be removed from global state
        expect(find_propagator_by_id(propagator_id(prop))).toBeUndefined();
    });

    test("disposing propagator should stop further propagations", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const result = construct_cell("result");
        
        const prop = p_add(a, b, result);
        
        // Initial propagation
        update_cell(a, 10);
        update_cell(b, 5);
        await execute_all_tasks_sequential(() => {});
        expect(cell_strongest_base_value(result)).toBe(15);
        
        // Dispose propagator
        propagator_dispose(prop);
        await execute_all_tasks_sequential(() => {});
        
        // Further updates should not propagate
        update_cell(a, 20);
        update_cell(b, 10);
        await execute_all_tasks_sequential(() => {});
        
        // Result should remain unchanged
        expect(cell_strongest_base_value(result)).toBe(15);
    });

    test("disposing propagator in chain should not affect other propagators", async () => {
        // Create chain: a -> [prop1] -> b -> [prop2] -> c
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        
        const prop1 = p_add(a, construct_cell("const1"), b);
        const prop2 = p_multiply(b,  ce_constant(2), c);
        
        // Test initial propagation
        update_cell(a, 10);
        await execute_all_tasks_sequential(() => {});
        
        // Dispose only prop1
        propagator_dispose(prop1);
        await execute_all_tasks_sequential(() => {});
        
        // Verify prop1 is disposed but prop2 still exists
        expect(find_propagator_by_id(propagator_id(prop1))).toBeUndefined();
        expect(find_propagator_by_id(propagator_id(prop2))).toBeDefined();
        
        // Manually update b should still propagate to c via prop2
        update_cell(b, 5);
        await execute_all_tasks_sequential(() => {});
        expect(cell_strongest_base_value(c)).not.toBe(the_nothing);
    });
});

describe("Compound Propagator Disposal Tests", () => {
    test("disposing compound propagator should dispose all child cells", async () => {
        set_merge(merge_temporary_value_set)
        const source = source_cell("source");

       

        const input = construct_cell<number>("input");
        const output = construct_cell<number>("output");
        
        p_reactive_dispatch(source as Cell<LayeredObject<Map<Cell<any>, any>>>, input);
        p_reactive_dispatch(source as Cell<LayeredObject<Map<Cell<any>, any>>>, output);


        let internalCellId: string;
        let internalPropId: string;
        
        const test_compound = (input: Cell<number>, output: Cell<number>) => compound_propagator(
            [input],
            [output],
            () => {
                // Create internal cell
                const internal = construct_cell<number>("internal");
                internalCellId = cell_id(internal);
                
                // Create internal propagators
                const prop = p_add(input, ce_constant(1), internal);
                
                p_multiply(internal, ce_constant(2), output);
            },
            "compound_test"
        );
        
        const compoundProp = test_compound(input, output);

        // Trigger building
        update_source_cell(source, new Map([[input, 10]]));
        await execute_all_tasks_sequential(() => {});

        expect(find_cell_by_id(internalCellId!)).toBeDefined();

        expect(cell_strongest_base_value(output)).toBe(22);

        compoundProp.dispose();
        await execute_all_tasks_sequential(() => {});
            
        // Verify internal cell exists
        
        // Verify compound propagator has children
        const children = get_children(compoundProp.getRelation());
        expect(children.length).toBeGreaterThan(0);
        
        // Dispose compound propagator
        dispose_propagator(compoundProp);
        await execute_all_tasks_sequential(() => {});

        update_source_cell(source, new Map([[input, 12]]));
        await execute_all_tasks_sequential(() => {});

       // Verify compound propagator is disposed
        expect(find_propagator_by_id(propagator_id(compoundProp))).toBeUndefined();
        
        // Verify internal cell is disposed
        expect(find_cell_by_id(internalCellId!)).toBeUndefined();

        // verify internal propagator is disposed 
        expect(cell_strongest_base_value(output)).toBe(22);
        
     
    });

    test("disposing compound propagator should dispose all child propagators", async () => {
        const input = construct_cell<number>("input");
        const output = construct_cell<number>("output");
        
        const childPropIds: string[] = [];
        
        const compoundProp = compound_propagator(
            [input],
            [output],
            () => {
                const temp1 = construct_cell<number>("temp1");
                const temp2 = construct_cell<number>("temp2");
                
                const prop1 = p_add(input, construct_cell<number>("c1"), temp1);
                const prop2 = p_multiply(temp1, construct_cell<number>("c2"), temp2);
                const prop3 = p_subtract(temp2, construct_cell<number>("c3"), output);
                
                childPropIds.push(propagator_id(prop1));
                childPropIds.push(propagator_id(prop2));
                childPropIds.push(propagator_id(prop3));
            },
            "compound_with_multiple_children"
        );
        
        // Trigger building
        update_cell(input, 10);
        await execute_all_tasks_sequential(() => {});
        
        // Verify all child propagators exist
        childPropIds.forEach(id => {
            expect(find_propagator_by_id(id)).toBeDefined();
        });
        
        // Dispose compound propagator
        propagator_dispose(compoundProp);
        await execute_all_tasks_sequential(() => {});
        
        // Verify all child propagators are disposed
        childPropIds.forEach(id => {
            expect(find_propagator_by_id(id)).toBeUndefined();
        });
    });

    test("disposing nested compound propagators should dispose all descendants", async () => {
        const input = construct_cell<number>("input");
        const output = construct_cell<number>("output");
        
        const allChildIds: string[] = [];
        
        const outerCompound = compound_propagator(
            [input],
            [output],
            () => {
                const middle = construct_cell<number>("middle");
                allChildIds.push(cell_id(middle));
                
                // Create inner compound propagator
                const innerCompound = compound_propagator(
                    [input],
                    [middle],
                    () => {
                        const inner = construct_cell<number>("inner");
                        allChildIds.push(cell_id(inner));
                        
                        const innerProp = p_add(input, construct_cell<number>("c"), inner);
                        allChildIds.push(propagator_id(innerProp));
                        
                        p_sync(inner, middle);
                    },
                    "inner_compound"
                );
                
                allChildIds.push(propagator_id(innerCompound));
                
                // Connect to output
                p_multiply(middle, construct_cell<number>("mult"), output);
            },
            "outer_compound"
        );
        
        // Trigger building
        update_cell(input, 10);
        await execute_all_tasks_sequential(() => {});
        
        // Verify all descendants exist
        allChildIds.forEach(id => {
            const cell = find_cell_by_id(id);
            const prop = find_propagator_by_id(id);
            expect(cell !== undefined || prop !== undefined).toBe(true);
        });
        
        // Dispose outer compound
        propagator_dispose(outerCompound);
        await execute_all_tasks_sequential(() => {});
        
        // Verify all descendants are disposed
        allChildIds.forEach(id => {
            expect(find_cell_by_id(id)).toBeUndefined();
            expect(find_propagator_by_id(id)).toBeUndefined();
        });
    });

    test("compound propagator with bi-directional constraint disposal", async () => {
        const celsius = construct_cell<number>("celsius");
        const fahrenheit = construct_cell<number>("fahrenheit");
        
        const biCompound = com_celsius_to_fahrenheit(celsius, fahrenheit);
        
        // Test initial propagation
        update_cell(celsius, 0);
        await execute_all_tasks_sequential(() => {});
        expect(cell_strongest_base_value(fahrenheit)).toBe(32);
        
        // Verify propagator exists and has children
        expect(find_propagator_by_id(propagator_id(biCompound))).toBeDefined();
        const children = get_children(biCompound.getRelation());
        expect(children.length).toBeGreaterThan(0);
        
        // Dispose compound propagator
        propagator_dispose(biCompound);
        await execute_all_tasks_sequential(() => {});
        
        // Verify compound and all children are disposed
        expect(find_propagator_by_id(propagator_id(biCompound))).toBeUndefined();
        
        // Verify bi-directional propagation is stopped
        const oldValue = cell_strongest_base_value(fahrenheit);
        update_cell(celsius, 100);
        await execute_all_tasks_sequential(() => {});
        expect(cell_strongest_base_value(fahrenheit)).toBe(oldValue);
    });

    test("disposing compound propagator should not affect external cells", async () => {
        const externalInput = construct_cell<number>("external_input");
        const externalOutput = construct_cell<number>("external_output");
        const unrelatedCell = construct_cell<number>("unrelated");
        
        const compoundProp = compound_propagator(
            [externalInput],
            [externalOutput],
            () => {
                const internal = construct_cell<number>("internal");
                p_add(externalInput, construct_cell<number>("c"), internal);
                p_multiply(internal, construct_cell<number>("c2"), externalOutput);
            },
            "compound_with_external"
        );
        
        // Create unrelated propagator
        const unrelatedProp = p_add(
            unrelatedCell,
            construct_cell<number>("uc"),
            construct_cell<number>("ur")
        );
        
        // Trigger building
        update_cell(externalInput, 10);
        await execute_all_tasks_sequential(() => {});
        
        // Dispose compound propagator
        propagator_dispose(compoundProp);
        await execute_all_tasks_sequential(() => {});
        
        // External cells should still exist
        expect(find_cell_by_id(cell_id(externalInput))).toBeDefined();
        expect(find_cell_by_id(cell_id(externalOutput))).toBeDefined();
        expect(find_cell_by_id(cell_id(unrelatedCell))).toBeDefined();
        
        // Unrelated propagator should still exist and work
        expect(find_propagator_by_id(propagator_id(unrelatedProp))).toBeDefined();
        update_cell(unrelatedCell, 5);
        await execute_all_tasks_sequential(() => {});
    });
});

describe("Complex Disposal Scenarios", () => {
    test("disposing shared cell in multiple propagator networks", async () => {
        const shared = construct_cell("shared");
        const a = construct_cell("a");
        const b = construct_cell("b");
        const result1 = construct_cell("result1");
        const result2 = construct_cell("result2");
        
        // Shared cell is input to multiple propagators
        const prop1 = p_add(shared, a, result1);
        const prop2 = p_multiply(shared, b, result2);
        
        const prop1Id = propagator_id(prop1);
        const prop2Id = propagator_id(prop2);
        
        // Test both propagators work
        update_cell(shared, 10);
        update_cell(a, 5);
        update_cell(b, 3);
        await execute_all_tasks_sequential(() => {});
        expect(cell_strongest_base_value(result1)).toBe(15);
        expect(cell_strongest_base_value(result2)).toBe(30);
        
        // Dispose shared cell
        cell_dispose(shared);
        await execute_all_tasks_sequential(() => {});
        
        // Both propagators should be disposed
        expect(find_propagator_by_id(prop1Id)).toBeUndefined();
        expect(find_propagator_by_id(prop2Id)).toBeUndefined();
    });

    test("disposal in cyclic propagator network", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        
        // Create cycle: a -> b -> c -> a (through different operations)
        const prop1 = p_add(a, construct_cell("c1"), b);
        const prop2 = p_multiply(b, construct_cell("c2"), c);
        const prop3 = p_subtract(c, construct_cell("c3"), a);
        
        const prop1Id = propagator_id(prop1);
        const prop2Id = propagator_id(prop2);
        const prop3Id = propagator_id(prop3);
        
        // Dispose one cell in the cycle
        cell_dispose(b);
        await execute_all_tasks_sequential(() => {});
        
        // All connected propagators should be disposed
        expect(find_propagator_by_id(prop1Id)).toBeUndefined();
        expect(find_propagator_by_id(prop2Id)).toBeUndefined();
    });

    test("memory cleanup verification after mass disposal", async () => {
        const cells = [];
        const propagators = [];
        
        // Create a large network
        for (let i = 0; i < 10; i++) {
            const a = construct_cell(`a_${i}`);
            const b = construct_cell(`b_${i}`);
            const result = construct_cell(`result_${i}`);
            
            cells.push(a, b, result);
            propagators.push(p_add(a, b, result));
        }
        
        // Verify all exist
        const initialQueueSize = disposal_queue_size();
        
        // Dispose all cells
        cells.forEach(cell => cell_dispose(cell));
        
        // Queue should have many items
        expect(disposal_queue_size()).toBeGreaterThan(initialQueueSize);
        
        // Execute cleanup
        await execute_all_tasks_sequential(() => {});
        
        // All should be cleaned up
        cells.forEach(cell => {
            expect(find_cell_by_id(cell_id(cell))).toBeUndefined();
        });
        
        propagators.forEach(prop => {
            expect(find_propagator_by_id(propagator_id(prop))).toBeUndefined();
        });
        
        // Queue should be empty
        expect(disposal_queue_size()).toBe(0);
    });

    test("partial disposal in complex compound propagator network", async () => {
        set_merge(merge_patched_set)
        const input = construct_cell<number>("input");
        const output1 = construct_cell<number>("output1");
        const output2 = construct_cell<number>("output2");
        
        let internalCellIds: string[] = [];
        
        const compound1 = compound_propagator(
            [input],
            [output1],
            () => {
                const temp = construct_cell<number>("temp1");
                internalCellIds.push(cell_id(temp));
                p_add(input, construct_cell<number>("c1"), temp);
                p_multiply(temp, construct_cell<number>("c2"), output1);
            },
            "compound1"
        );
        
        const compound2 = compound_propagator(
            [input],
            [output2],
            () => {
                const temp = construct_cell<number>("temp2");
                internalCellIds.push(cell_id(temp));
                const constant = ce_constant(2);
                p_subtract(input, constant, temp);
                p_multiply(temp, constant, output2);
            },
            "compound2"
        );
        
        // Trigger building
        compound_tell(input, 10, vector_clock_layer, new Map([["source", 1]]));
        await execute_all_tasks_sequential(() => {});
        
        // Dispose only first compound
        propagator_dispose(compound1);
        await execute_all_tasks_sequential(() => {});
        
        // First compound and its children should be disposed
        expect(find_propagator_by_id(propagator_id(compound1))).toBeUndefined();
        expect(find_cell_by_id(internalCellIds[1])).toBeUndefined();
        
        // Second compound should still exist and work
        expect(find_propagator_by_id(propagator_id(compound2))).toBeDefined();
        expect(find_cell_by_id(internalCellIds[0])).toBeDefined();
        
        // Second compound should still propagate
        const oldOutput2 = cell_strongest_base_value(output2);
        compound_tell(input, 20, vector_clock_layer, new Map([["source", 2]]));
        await execute_all_tasks_sequential(() => {});
        expect(cell_strongest_base_value(output2)).not.toBe(oldOutput2);
    });
});

describe("Edge Cases and Stress Tests", () => {
    test("disposing already disposed cell should be safe", async () => {
        const cell = construct_cell("test");
        
        cell_dispose(cell);
        await execute_all_tasks_sequential(() => {});
        
        // Disposing again should not throw
        expect(() => {
            cell_dispose(cell);
        }).not.toThrow();
        
        await execute_all_tasks_sequential(() => {});
    });

    test("disposing propagator after one of its cells is disposed", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const result = construct_cell("result");
        
        const prop = p_add(a, b, result);
        
        // Dispose cell first
        cell_dispose(a);
        await execute_all_tasks_sequential(() => {});
        
        // Propagator should already be disposed
        expect(find_propagator_by_id(propagator_id(prop))).toBeUndefined();
        
        // Disposing propagator again should be safe
        expect(() => {
            propagator_dispose(prop);
        }).not.toThrow();
    });

    test("rapid disposal and creation should maintain consistency", async () => {
        for (let i = 0; i < 20; i++) {
            const a = construct_cell(`a_${i}`);
            const b = construct_cell(`b_${i}`);
            const result = construct_cell(`result_${i}`);
            
            const prop = p_add(a, b, result);
            
            // Immediately dispose
            cell_dispose(a);
            await execute_all_tasks_sequential(() => {});
            
            // Verify cleanup
            expect(find_cell_by_id(cell_id(a))).toBeUndefined();
            expect(find_propagator_by_id(propagator_id(prop))).toBeUndefined();
        }
        
        // Queue should be empty
        expect(disposal_queue_size()).toBe(0);
    });

    test("disposing output cell should dispose upstream propagator", async () => {
        const input = construct_cell("input");
        const output = construct_cell("output");
        
        const prop = p_add(
            input,
            construct_cell("const"),
            output
        );
        
        const propId = propagator_id(prop);
        
        // Dispose output cell
        cell_dispose(output);
        await execute_all_tasks_sequential(() => {});

        // Propagator should be disposed
        expect(find_propagator_by_id(propId)).toBeUndefined();
        
        // Input cell should still exist (it wasn't disposed)
        expect(find_cell_by_id(cell_id(input))).toBeDefined();
    });
});

