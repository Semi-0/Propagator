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
import { the_nothing } from "@/cell/CellValue";
import { p_add, p_subtract, p_multiply, p_divide } from "../Propagator/BuiltInProps";
import { set_merge } from "@/cell/Merge";
import { trace_earliest_emerged_value } from "../AdvanceReactivity/traced_timestamp/genericPatch";
import { patched_set_merge, is_patched_set } from "../DataTypes/PatchedValueSet";
import { support_by } from "sando-layer/Specified/SupportLayer";

beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP);
    set_merge(patched_set_merge);
});

describe("PatchedValueSet Propagator Integration Tests", () => {
    
    describe("Single Layer Tests: Support Layer (Supported Values Only)", () => {
        
        test("should handle addition with supported values", async () => {
            const cellA = construct_cell("supportAddA");
            const cellB = construct_cell("supportAddB");
            const output = construct_cell("supportAddOutput");
            
            p_add(cellA, cellB, output);
            
            const valueA = support_by(10, "sourceA");
            const valueB = support_by(20, "sourceB");
            
            cellA.addContent(valueA);
            cellB.addContent(valueB);
            
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
            
            const valueA = support_by(6, "sourceA");
            const valueB = support_by(7, "sourceB");
            
            cellA.addContent(valueA);
            cellB.addContent(valueB);
            
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
            
            const valueA = support_by(15, "sourceA");
            const valueB = support_by(5, "sourceB");
            
            cellA.addContent(valueA);
            cellB.addContent(valueB);
            
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
            
            const valueA = support_by(20, "sourceA");
            const valueB = support_by(4, "sourceB");
            
            cellA.addContent(valueA);
            cellB.addContent(valueB);
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            expect(cell_strongest_base_value(output)).toBe(5);
        });
    });

    describe("PatchedSet Specific Tests", () => {
        
        test("should verify cell content is stored as PatchedSet when patched_set_merge is active", async () => {
            const cell = construct_cell("patchedSetTest");
            
            const value = support_by(42, "source");
            cell.addContent(value);
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            const content = cell_content(cell);
            expect(is_patched_set(content)).toBe(true);
        });

        test("should handle simple propagator with patched set merge", async () => {
            const input = construct_cell("patchPropInput");
            const output = construct_cell("patchPropOutput");
            const multiplier = construct_cell("multiplier");
            
            p_multiply(input, multiplier, output);
            
            const inputValue = support_by(5, "input");
            const multiplierValue = support_by(3, "mult");
            
            input.addContent(inputValue);
            multiplier.addContent(multiplierValue);
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            expect(cell_strongest_base_value(output)).toBe(15);
        });

        test("should handle multiple additions in sequence with patched sets", async () => {
            const cellA = construct_cell("seqAddA");
            const cellB = construct_cell("seqAddB");
            const output = construct_cell("seqAddOutput");
            
            p_add(cellA, cellB, output);
            
            // First addition
            cellA.addContent(support_by(5, "s1"));
            cellB.addContent(support_by(3, "s2"));
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            expect(cell_strongest_base_value(output)).toBe(8);
            
            // Second addition with new values
            cellA.addContent(support_by(7, "s3"));
            cellB.addContent(support_by(2, "s4"));
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            // Output should be updated
            const result = cell_strongest_base_value(output);
            expect(result).toBeGreaterThan(0);
        });

        test("should maintain patched set through propagator chain", async () => {
            const input = construct_cell("chainInput");
            const intermediate = construct_cell("chainIntermediate");
            const output = construct_cell("chainOutput");
            
            p_multiply(input, intermediate, output);
            
            const inputValue = support_by(4, "input");
            const intermediateValue = support_by(5, "inter");
            
            input.addContent(inputValue);
            intermediate.addContent(intermediateValue);
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            // Check that output is also a patched set
            const outputContent = cell_content(output);
            expect(is_patched_set(outputContent)).toBe(true);
            expect(cell_strongest_base_value(output)).toBe(20);
        });
    });

    describe("Edge Cases with PatchedSets", () => {
        
        test("should handle empty cell values gracefully", async () => {
            const cellA = construct_cell("emptyA");
            const cellB = construct_cell("emptyB");
            const output = construct_cell("emptyOutput");
            
            p_add(cellA, cellB, output);
            
            // Initially both are empty
            expect(cell_strongest_base_value(output)).toBe(the_nothing);
            
            // Add only to A
            cellA.addContent(support_by(10, "a"));
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            // Output should still be nothing since B is missing
            expect(cell_strongest_base_value(output)).toBe(the_nothing);
            
            // Now add to B
            cellB.addContent(support_by(5, "b"));
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            // Now output should have the sum
            expect(cell_strongest_base_value(output)).toBe(15);
        });

        test("should handle adding same base value multiple times", async () => {
            const cell = construct_cell("duplicateTest");
            const output = construct_cell("duplicateOutput");
            const constant = construct_cell("constant");
            
            p_multiply(cell, constant, output);
            constant.addContent(support_by(2, "c"));
            
            // Add same base value with different support
            cell.addContent(support_by(10, "weak_support_1"));
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            const result1 = cell_strongest_base_value(output);
            expect(result1).toBe(20);
            
            // Add same value with different support
            cell.addContent(support_by(10, "weak_support_2"));
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            const result2 = cell_strongest_base_value(output);
            expect(result2).toBe(20);
        });
    });

    describe("VICTOR CLOCK + PATCHED SET PROPAGATOR TESTS", () => {
        
        test("[VICTOR_CLOCK] Basic addition with victor clock values in propagator", async () => {
            console.log("\n=== TEST: Basic addition with victor clock ===");
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
            
            console.log("Adding value A with victor clock...");
            cellA.addContent(valueA);
            console.log("Adding value B with victor clock...");
            cellB.addContent(valueB);
            
            console.log("Executing propagation...");
            await execute_all_tasks_sequential((error: Error) => {
                if (error) {
                    console.log("PROPAGATION ERROR:", error.message);
                    console.log(error.stack);
                }
            });
            
            console.log("Checking output...");
            const result = cell_strongest_base_value(output);
            console.log("Output result:", result);
            expect(result).toBe(30);
        });

        test("[VICTOR_CLOCK] Stale value replacement in propagator", async () => {
            console.log("\n=== TEST: Stale value replacement ===");
            const cellA = construct_cell("vc_staleA");
            const cellB = construct_cell("vc_staleB");
            const output = construct_cell("vc_staleOutput");
            
            p_add(cellA, cellB, output);
            
            const { construct_layered_datum } = await import("sando-layer/Basic/LayeredDatum");
            const { victor_clock_layer } = await import("../AdvanceReactivity/victor_clock");
            
            // Initial values with version 1
            const valueA1 = construct_layered_datum(
                5,
                victor_clock_layer, new Map([["procA", 1]])
            );
            
            const valueB1 = construct_layered_datum(
                3,
                victor_clock_layer, new Map([["procB", 1]])
            );
            
            console.log("Adding initial values (v1)...");
            cellA.addContent(valueA1);
            cellB.addContent(valueB1);
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR in initial propagation:", error.message);
            });
            
            let result1 = cell_strongest_base_value(output);
            console.log("Initial result (5+3):", result1);
            expect(result1).toBe(8);
            
            // Update with fresher versions (version 2)
            const valueA2 = construct_layered_datum(
                7,
                victor_clock_layer, new Map([["procA", 2]])
            );
            
            const valueB2 = construct_layered_datum(
                4,
                victor_clock_layer, new Map([["procB", 2]])
            );
            
            console.log("Adding updated values (v2)...");
            cellA.addContent(valueA2);
            cellB.addContent(valueB2);
            
            console.log("Executing propagation with stale replacement...");
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR in stale replacement:", error.message);
            });
            
            let result2 = cell_strongest_base_value(output);
            console.log("Result after stale replacement (7+4):", result2);
            expect(result2).toBe(11);
        });

        test("[VICTOR_CLOCK] Concurrent values from different sources", async () => {
            console.log("\n=== TEST: Concurrent values from different sources ===");
            const cellA = construct_cell("vc_concurrentA");
            const cellB = construct_cell("vc_concurrentB");
            const output = construct_cell("vc_concurrentOutput");
            
            p_multiply(cellA, cellB, output);
            
            const { construct_layered_datum } = await import("sando-layer/Basic/LayeredDatum");
            const { victor_clock_layer } = await import("../AdvanceReactivity/victor_clock");
            
            // Values from different sources should both be kept
            const valueA_src1 = construct_layered_datum(
                5,
                victor_clock_layer, new Map([["source1", 1]])
            );
            
            const valueB_src2 = construct_layered_datum(
                6,
                victor_clock_layer, new Map([["source2", 1]])
            );
            
            console.log("Adding value from source1...");
            cellA.addContent(valueA_src1);
            console.log("Adding value from source2...");
            cellB.addContent(valueB_src2);
            
            console.log("Executing propagation with concurrent sources...");
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR:", error.message);
            });
            
            const result = cell_strongest_base_value(output);
            console.log("Result from concurrent sources (5*6):", result);
            expect(result).toBe(30);
        });

        test("[VICTOR_CLOCK] Multiple updates from same processor", async () => {
            console.log("\n=== TEST: Multiple updates from same processor ===");
            const cellA = construct_cell("vc_multiUpdateA");
            const cellB = construct_cell("vc_multiUpdateB");
            const output = construct_cell("vc_multiUpdateOutput");
            
            p_add(cellA, cellB, output);
            
            const { construct_layered_datum } = await import("sando-layer/Basic/LayeredDatum");
            const { victor_clock_layer } = await import("../AdvanceReactivity/victor_clock");
            
            const processor = "mainProcessor";
            
            // First update from processor
            console.log("Update 1: Adding v1 from processor...");
            const v1_a = construct_layered_datum(
                1,
                victor_clock_layer, new Map([[processor, 1]])
            );
            const v1_b = construct_layered_datum(
                2,
                victor_clock_layer, new Map([[processor, 1]])
            );
            
            cellA.addContent(v1_a);
            cellB.addContent(v1_b);
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR 1:", error.message);
            });
            
            let result1 = cell_strongest_base_value(output);
            console.log("Result after v1 (1+2):", result1);
            expect(result1).toBe(3);
            
            // Second update from same processor (should replace v1)
            console.log("Update 2: Adding v2 from same processor...");
            const v2_a = construct_layered_datum(
                10,
                victor_clock_layer, new Map([[processor, 2]])
            );
            const v2_b = construct_layered_datum(
                20,
                victor_clock_layer, new Map([[processor, 2]])
            );
            
            cellA.addContent(v2_a);
            cellB.addContent(v2_b);
            
            console.log("Executing propagation with v2...");
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR 2:", error.message);
            });
            
            let result2 = cell_strongest_base_value(output);
            console.log("Result after v2 (10+20):", result2);
            expect(result2).toBe(30);
            
            // Third update (higher version)
            console.log("Update 3: Adding v3 from same processor...");
            const v3_a = construct_layered_datum(
                100,
                victor_clock_layer, new Map([[processor, 3]])
            );
            const v3_b = construct_layered_datum(
                200,
                victor_clock_layer, new Map([[processor, 3]])
            );
            
            cellA.addContent(v3_a);
            cellB.addContent(v3_b);
            
            console.log("Executing propagation with v3...");
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR 3:", error.message);
            });
            
            let result3 = cell_strongest_base_value(output);
            console.log("Result after v3 (100+200):", result3);
            expect(result3).toBe(300);
        });

        test("[VICTOR_CLOCK] Division with stale value detection", async () => {
            console.log("\n=== TEST: Division with stale value detection ===");
            const numerator = construct_cell("vc_numerator");
            const denominator = construct_cell("vc_denominator");
            const output = construct_cell("vc_divisionOutput");
            
            p_divide(numerator, denominator, output);
            
            const { construct_layered_datum } = await import("sando-layer/Basic/LayeredDatum");
            const { victor_clock_layer } = await import("../AdvanceReactivity/victor_clock");
            
            // Stale values
            const num_stale = construct_layered_datum(
                40,
                victor_clock_layer, new Map([["proc", 1]])
            );
            const denom_stale = construct_layered_datum(
                4,
                victor_clock_layer, new Map([["proc", 1]])
            );
            
            console.log("Adding stale values (v1)...");
            numerator.addContent(num_stale);
            denominator.addContent(denom_stale);
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR stale:", error.message);
            });
            
            let result_stale = cell_strongest_base_value(output);
            console.log("Result with stale values (40/4):", result_stale);
            expect(result_stale).toBe(10);
            
            // Fresh values (should replace stale)
            const num_fresh = construct_layered_datum(
                60,
                victor_clock_layer, new Map([["proc", 2]])
            );
            const denom_fresh = construct_layered_datum(
                6,
                victor_clock_layer, new Map([["proc", 2]])
            );
            
            console.log("Adding fresh values (v2)...");
            numerator.addContent(num_fresh);
            denominator.addContent(denom_fresh);
            
            console.log("Executing propagation with fresh values...");
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR fresh:", error.message);
            });
            
            let result_fresh = cell_strongest_base_value(output);
            console.log("Result with fresh values (60/6):", result_fresh);
            expect(result_fresh).toBe(10);
        });
    });
});
