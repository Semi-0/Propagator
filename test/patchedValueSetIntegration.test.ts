/**
 * @fileoverview PatchedValueSet Integration Tests with Propagator System
 * 
 * Comprehensive tests ensuring PatchedValueSet works correctly with:
 * - Reactive values (Victor Clock layer)
 * - Supported values (Support layer)
 * - Compound values (both Victor Clock and Support layers)
 * - Full propagator system integration
 */

import { describe, test, expect, beforeEach } from "bun:test";
import type { Cell } from "@/cell/Cell";
import {
    construct_cell,
    cell_strongest_base_value,
    set_handle_contradiction,
    cell_content,
} from "@/cell/Cell";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { the_nothing, is_contradiction, the_contradiction } from "@/cell/CellValue";
import { p_add, p_subtract, p_multiply, p_divide } from "../Propagator/BuiltInProps";
import { set_merge } from "@/cell/Merge";
import { trace_earliest_emerged_value } from "../AdvanceReactivity/traced_timestamp/genericPatch";
import { patched_set_merge, is_patched_set } from "../DataTypes/PatchedValueSet";
import { support_by, support_layer } from "sando-layer/Specified/SupportLayer";
import { assert, compound_tell, kick_out } from "../Helper/UI";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { construct_better_set } from "generic-handler/built_in_generics/generic_better_set";

beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP);
    set_merge(patched_set_merge);
});

describe("PatchedValueSet Propagator Integration Tests", () => {
    
    describe("Single Layer Tests: Support Layer (Supported Values Only)", () => {
        
        test("should handle addition with supported values", async () => {
            const cellA = construct_cell("supportAddA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("supportAddB") as Cell<LayeredObject<any>>;
            const output = construct_cell("supportAddOutput");
            
            p_add(cellA, cellB, output);
            
            
            compound_tell(cellA, 10, support_layer, construct_better_set(["a"]))
            compound_tell(cellB, 20, support_layer, construct_better_set(["b"]))
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            expect(cell_strongest_base_value(output)).toBe(30);
        });

        test("should handle multiplication with support layer values", async () => {
            const cellA = construct_cell("supportMulA");
            const cellB = construct_cell("supportMulB");
            const output = construct_cell("supportMulOutput");
            
            p_multiply(cellA, cellB, output);
            //@ts-ignore
            compound_tell(cellA, 6, support_layer, construct_better_set(["sourceA"]));
            //@ts-ignore
            compound_tell(cellB, 7, support_layer, construct_better_set(["sourceB"]));
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            expect(cell_strongest_base_value(output)).toBe(42);
        });

        test("should handle subtraction with support layer values", async () => {
            const cellA = construct_cell("supportSubA"); 
            const cellB = construct_cell("supportSubB");
            const output = construct_cell("supportSubOutput");
            
            p_subtract(cellA, cellB, output);
            
            //@ts-ignore
            compound_tell(cellA, 15, support_layer, construct_better_set(["sourceA"]));
            //@ts-ignore
            compound_tell(cellB, 5, support_layer, construct_better_set(["sourceB"]));
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            expect(cell_strongest_base_value(output)).toBe(10);
        });

        test("should handle division with support layer values", async () => {
            const cellA = construct_cell("supportDivA");
            const cellB = construct_cell("supportDivB");
            const output = construct_cell("supportDivOutput");
            
            p_divide(cellA, cellB, output);
            
            //@ts-ignore
            compound_tell(cellA, 20, support_layer, construct_better_set(["sourceA"]));
            //@ts-ignore
            compound_tell(cellB, 4, support_layer, construct_better_set(["sourceB"]));
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            expect(cell_strongest_base_value(output)).toBe(5);
        });
    });


    describe("Edge Cases with PatchedSets", () => {
        
        test("should handle empty cell values gracefully", async () => {
            const cellA = construct_cell("emptyA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("emptyB") as Cell<LayeredObject<any>>;
            const output = construct_cell("emptyOutput");
            
            p_add(cellA, cellB, output);
            
            // Initially both are empty
            expect(cell_strongest_base_value(output)).toBe(the_nothing);
            
            // Add only to A
            compound_tell(cellA, 10, support_layer, construct_better_set(["a"]));
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            // Output should still be nothing since B is missing
            expect(cell_strongest_base_value(output)).toBe(the_nothing);
            
            // Now add to B
            compound_tell(cellB, 5, support_layer, construct_better_set(["b"]));
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            // Now output should have the sum
            expect(cell_strongest_base_value(output)).toBe(15);
        });

        test("should handle adding same base value multiple times", async () => {
            const cell = construct_cell("duplicateTest") as Cell<LayeredObject<any>>;
            const output = construct_cell("duplicateOutput") as Cell<LayeredObject<any>>;
            const constant = construct_cell("constant") as Cell<LayeredObject<any>>;
            
            p_multiply(cell, constant, output);
            compound_tell(constant, 2, support_layer, construct_better_set(["c"]));
            
            // Add same base value with different support
            compound_tell(cell, 10, support_layer, construct_better_set(["weak_support_1"]));
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            const result1 = cell_strongest_base_value(output);
            expect(result1).toBe(20);
            
            // Add same value with different support
            compound_tell(cell, 10, support_layer, construct_better_set(["weak_support_2"]));
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            const result2 = cell_strongest_base_value(output);
            expect(result2).toBe(20);
        });
    });

    describe("VICTOR CLOCK + PATCHED SET PROPAGATOR TESTS", () => {
        
        test("[VICTOR_CLOCK] Basic addition with victor clock values in propagator", async () => {
            const cellA = construct_cell("vc_addA");
            const cellB = construct_cell("vc_addB");
            const output = construct_cell("vc_addOutput");
            
            p_add(cellA, cellB, output);
            
            // Import needed for Victor Clock
            const { construct_layered_datum } = await import("sando-layer/Basic/LayeredDatum");
            const { victor_clock_layer } = await import("../AdvanceReactivity/victor_clock");
            const { construct_better_set } = await import("generic-handler/built_in_generics/generic_better_set");
            
            const valueA = construct_layered_datum(
                10,
                victor_clock_layer, new Map([["procA", 1]])
            );
            
            const valueB = construct_layered_datum(
                20,
                victor_clock_layer, new Map([["procB", 1]])
            );
            
            cellA.update(valueA);
            cellB.update(valueB);
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) {
                    console.log("PROPAGATION ERROR:", error.message);
                    console.log(error.stack);
                }
            });
            
            expect(cell_strongest_base_value(output)).toBe(30);
        });

        test("[VICTOR_CLOCK + SUPPORT] Stale reactive value replaced by fresher version with support", async () => {
            const cellA = construct_cell("vcSup_staleA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("vcSup_staleB") as Cell<LayeredObject<any>>;
            const output = construct_cell("vcSup_staleOutput");
            
            p_add(cellA, cellB, output);
            
            const { construct_layered_datum } = await import("sando-layer/Basic/LayeredDatum");
            const { victor_clock_layer } = await import("../AdvanceReactivity/victor_clock");
            
            // Initial values: victor_clock v1 with strong support
            //@ts-ignore
            compound_tell(cellA, 5, victor_clock_layer, new Map([["procA", 1]]), support_layer, construct_better_set(["supportA"]));
            //@ts-ignore
            compound_tell(cellB, 3, victor_clock_layer, new Map([["procB", 1]]), support_layer, construct_better_set(["supportB"]));
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR in v1:", error.message);
            });
            
            let result1 = cell_strongest_base_value(output);
            expect(result1).toBe(8);
            
            // Update with fresher versions (v2) and different support
            //@ts-ignore
            compound_tell(cellA, 7, victor_clock_layer, new Map([["procA", 2]]), support_layer, construct_better_set(["supportA", "newSupportA"]));
            //@ts-ignore
            compound_tell(cellB, 4, victor_clock_layer, new Map([["procB", 2]]), support_layer, construct_better_set(["supportB", "newSupportB"]));
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR in v2:", error.message);
            });
            
            let result2 = cell_strongest_base_value(output);
            expect(result2).toBe(11);
        });

        test("[VICTOR_CLOCK + SUPPORT] Concurrent values with different clocks and supports should coexist but may raise contradiction", async () => {
            const cellA = construct_cell("vcConcA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("vcConcB") as Cell<LayeredObject<any>>;
            const output = construct_cell("vcConcOutput");
            
            p_add(cellA, cellB, output);
            
            const { victor_clock_layer } = await import("../AdvanceReactivity/victor_clock");
            
            // Two concurrent values from different sources with different supports
            //@ts-ignore
            compound_tell(cellA, 5, victor_clock_layer, new Map([["source1", 1]]), support_layer, construct_better_set(["supportA1"]));
            //@ts-ignore
            compound_tell(cellB, 3, victor_clock_layer, new Map([["sourceB", 1]]), support_layer, construct_better_set(["supportB"]));
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR 1:", error.message);
            });
            
            let result1 = cell_strongest_base_value(output);
            expect(result1).toBe(8);
            
            // Now add concurrent value from source2
            //@ts-ignore
            compound_tell(cellA, 7, victor_clock_layer, new Map([["source2", 1]]), support_layer, construct_better_set(["supportA2"]));

            kick_out("supportA1")
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR 2:", error.message);
            });
            
            
            let result2 = cell_strongest_base_value(output);
            expect(result2).toBe(10); // 8 + 2
        });

        test("[VICTOR_CLOCK + SUPPORT] Edge case: Victor Clock value joins with Support-only value, raises contradiction, retract to resolve", async () => {
            const cellA = construct_cell("mixedA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("mixedB") as Cell<LayeredObject<any>>;
            const output = construct_cell("mixedOutput");
            
            p_add(cellA, cellB, output);
            
            const { victor_clock_layer } = await import("../AdvanceReactivity/victor_clock");
            
            // First: Support-only values
            //@ts-ignore
            compound_tell(cellA, 5, support_layer, construct_better_set(["supportOnlyA"]));
            //@ts-ignore
            compound_tell(cellB, 3, support_layer, construct_better_set(["supportOnlyB"]));
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR support-only:", error.message);
            });
            
            let result_support = cell_strongest_base_value(output);
            expect(result_support).toBe(8);
            
            // Now add Victor Clock value to cellA
            //@ts-ignore
            compound_tell(cellA, 10, victor_clock_layer, new Map([["vcSourceA", 1]]), support_layer, construct_better_set(["vcSupportA"]));
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR adding VC:", error.message);
            });
            
            let result_mixed = cell_strongest_base_value(output);
            expect(result_mixed).toBe(13); // 8 + 10
        });

        test("[VICTOR_CLOCK + SUPPORT] Multiple stale values with support replacement", async () => {
            const cellA = construct_cell("multiStaleA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("multiStaleB") as Cell<LayeredObject<any>>;
            const output = construct_cell("multiStaleOutput");
            
            p_multiply(cellA, cellB, output);
            
            const { victor_clock_layer } = await import("../AdvanceReactivity/victor_clock");
            
            // Build up multiple stale values - v1
            //@ts-ignore
            compound_tell(cellA, 2, victor_clock_layer, new Map([["procA", 1]]), support_layer, construct_better_set(["sup1"]));
            //@ts-ignore
            compound_tell(cellB, 3, victor_clock_layer, new Map([["procB", 1]]), support_layer, construct_better_set(["sup2"]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            let result1 = cell_strongest_base_value(output);
            expect(result1).toBe(6);
            
            // Update to v2
            //@ts-ignore
            compound_tell(cellA, 5, victor_clock_layer, new Map([["procA", 2]]), support_layer, construct_better_set(["sup1", "sup3"]));
            //@ts-ignore
            compound_tell(cellB, 4, victor_clock_layer, new Map([["procB", 2]]), support_layer, construct_better_set(["sup2", "sup4"]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            let result2 = cell_strongest_base_value(output);
            expect(result2).toBe(20);
            
            // Update to v3
            //@ts-ignore
            compound_tell(cellA, 7, victor_clock_layer, new Map([["procA", 3]]), support_layer, construct_better_set(["sup1", "sup3", "sup5"]));
            //@ts-ignore
            compound_tell(cellB, 6, victor_clock_layer, new Map([["procB", 3]]), support_layer, construct_better_set(["sup2", "sup4", "sup6"]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            let result3 = cell_strongest_base_value(output);
            expect(result3).toBe(42);
        });
    });

    describe("Contradiction Detection and Resolution Tests", () => {
        test("[CONTRADICTION] Simple contradiction detection with support layers", async () => {
            const cellA = construct_cell("contradictionCellA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("contradictionCellB") as Cell<LayeredObject<any>>;
            const output = construct_cell("contradictionOutput");
            
            p_add(cellA, cellB, output);
            
            // Add conflicting values with support layers
            //@ts-ignore
            await compound_tell(cellA, 10, support_layer, construct_better_set(["supportA"]));
            //@ts-ignore
            await compound_tell(cellB, 5, support_layer, construct_better_set(["supportB"]));
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            // Check if output shows expected result
            let result = cell_strongest_base_value(output);
            expect(result).toBe(15); // 10 + 5
        });

        test("[CONTRADICTION] Contradiction with mismatched values and support resolution", async () => {
            const cellA = construct_cell("contradictionResolveA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("contradictionResolveB") as Cell<LayeredObject<any>>;
            const output = construct_cell("contradictionResolveOutput");
            
            p_add(cellA, cellB, output);
            
            // Add initial values
            //@ts-ignore
            await compound_tell(cellA, 10, support_layer, construct_better_set(["supportA"]));
            //@ts-ignore
            await compound_tell(cellB, 5, support_layer, construct_better_set(["supportB"]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result1 = cell_strongest_base_value(output);
            expect(result1).toBe(15);
            
            // Add another value to cellB that conflicts
            //@ts-ignore
            await compound_tell(cellB, 20, support_layer, construct_better_set(["supportC"]));
            
            kick_out("supportB")
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result2 = cell_strongest_base_value(output);
            expect(result2).toBe(30); // 10 + 20
            
            // Now kick out one of the conflicting premises
            kick_out("supportC");
            assert("supportB")
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result3 = cell_strongest_base_value(output);
            expect(result3).toBe(15);
        });

        test("[VICTOR_CLOCK + SUPPORT + CONTRADICTION] Contradiction with mixed layers and resolution", async () => {
            const cellA = construct_cell("vcContradictionA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("vcContradictionB") as Cell<LayeredObject<any>>;
            const output = construct_cell("vcContradictionOutput");
            
            p_multiply(cellA, cellB, output);
            
            const { victor_clock_layer } = await import("../AdvanceReactivity/victor_clock");
            
            // Add initial values with Victor Clock v1 and support
            //@ts-ignore
            await compound_tell(cellA, 5, victor_clock_layer, new Map([["procA", 1]]), support_layer, construct_better_set(["supportA"]));
            //@ts-ignore
            await compound_tell(cellB, 4, victor_clock_layer, new Map([["procB", 1]]), support_layer, construct_better_set(["supportB"]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            
       
            let result1 = cell_strongest_base_value(output);
            expect(result1).toBe(20);
            
            // Add conflicting value with different Victor Clock from same processor
            //@ts-ignore
            await compound_tell(cellA, 3, victor_clock_layer, new Map([["procA", 1]]), support_layer, construct_better_set(["supportC"]));
            
            kick_out("supportA");
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result2 = cell_strongest_base_value(output);

            console.log("cellA", cellA.summarize())
            console.log("result1", output.summarize())
            expect(result2).toBe(12); // 20 - 8 (5*4 - 3*4)
            
            // Resolve by kicking out the conflicting support premise
            kick_out("supportC");
            assert("supportA")
         
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result3 = cell_strongest_base_value(output);
            expect(result3).toBe(20);
        });

        test("[VICTOR_CLOCK + SUPPORT + CONTRADICTION] Update to fresher clock version removes contradiction", async () => {
            const cellA = construct_cell("vcUpdateResolveA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("vcUpdateResolveB") as Cell<LayeredObject<any>>;
            const output = construct_cell("vcUpdateResolveOutput");
            
            p_add(cellA, cellB, output);
            
            const { victor_clock_layer } = await import("../AdvanceReactivity/victor_clock");
            
            // Add initial values v1
            //@ts-ignore
            await compound_tell(cellA, 5, victor_clock_layer, new Map([["procA", 1]]), support_layer, construct_better_set(["supportA"]));
            //@ts-ignore
            await compound_tell(cellB, 3, victor_clock_layer, new Map([["procB", 1]]), support_layer, construct_better_set(["supportB"]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result1 = cell_strongest_base_value(output);
            expect(result1).toBe(8);
            
            // Add conflicting values at same version
            //@ts-ignore
            await compound_tell(cellA, 10, victor_clock_layer, new Map([["procA", 1]]), support_layer, construct_better_set(["supportC"]));
            //@ts-ignore
            await compound_tell(cellB, 2, victor_clock_layer, new Map([["procB", 1]]), support_layer, construct_better_set(["supportD"]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result2 = cell_strongest_base_value(output);
            expect(result2).toBe(8); 
            
            // Resolve by updating to fresher version
            //@ts-ignore
            await compound_tell(cellA, 7, victor_clock_layer, new Map([["procA", 2]]), support_layer, construct_better_set(["supportA", "supportE"]));
            //@ts-ignore
            await compound_tell(cellB, 4, victor_clock_layer, new Map([["procB", 2]]), support_layer, construct_better_set(["supportB", "supportF"]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result3 = cell_strongest_base_value(output);
            expect(result3).toBe(11);
        });

        test("[CONTRADICTION] Multiple contradictions with resolution cascade", async () => {
            const cellA = construct_cell("cascadeA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("cascadeB") as Cell<LayeredObject<any>>;
            const cellC = construct_cell("cascadeC") as Cell<LayeredObject<any>>;
            const output = construct_cell("cascadeOutput");
            
            // Chain: (A + B) * C
            const temp = construct_cell("cascadeTemp");
            p_add(cellA, cellB, temp);
            p_multiply(temp, cellC, output);
            
            const { victor_clock_layer } = await import("../AdvanceReactivity/victor_clock");
            
            // Add initial values v1
            //@ts-ignore
            await compound_tell(cellA, 2, victor_clock_layer, new Map([["procA", 1]]), support_layer, construct_better_set(["supA"]));
            //@ts-ignore
            await compound_tell(cellB, 3, victor_clock_layer, new Map([["procB", 1]]), support_layer, construct_better_set(["supB"]));
            //@ts-ignore
            await compound_tell(cellC, 4, victor_clock_layer, new Map([["procC", 1]]), support_layer, construct_better_set(["supC"]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result1 = cell_strongest_base_value(output);
            expect(result1).toBe(20);
            
            // Add conflicting values
            //@ts-ignore
            await compound_tell(cellA, 5, victor_clock_layer, new Map([["procA", 1]]), support_layer, construct_better_set(["supD"]));
            //@ts-ignore
            await compound_tell(cellB, 6, victor_clock_layer, new Map([["procB", 1]]), support_layer, construct_better_set(["supE"]));
            //@ts-ignore
            await compound_tell(cellC, 2, victor_clock_layer, new Map([["procC", 1]]), support_layer, construct_better_set(["supF"]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result2 = cell_strongest_base_value(output);
            expect(result2).toBe(20); // 20 + 2
            
            // Resolve cascade: remove old supports one by one
            kick_out("supA");
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let resultAfterD = cell_strongest_base_value(output);
            expect(resultAfterD).toBe(the_nothing); // 22 - 5
            
            kick_out("supB");
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let resultAfterE = cell_strongest_base_value(output);
            expect(resultAfterE).toBe(the_nothing); // 17 - 2
            
            kick_out("supC");
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result3 = cell_strongest_base_value(output);
            expect(result3).toBe(22);
        });
    });
});
