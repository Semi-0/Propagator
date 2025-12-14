/**
 * @fileoverview TemporaryValueSet Integration Tests with Propagator System
 * 
 * Comprehensive tests ensuring TemporaryValueSet (with unified Vector Clock + Support logic) works correctly with:
 * - Reactive values (Victor Clock layer)
 * - Supported values (Support layer - Treated as Vector Clock source)
 * - Compound values (both Victor Clock and Support layers)
 * - Full propagator system integration
 */

import { describe, test, expect, beforeEach } from "bun:test";
import type { Cell } from "@/cell/Cell";
import {
    construct_cell,
    cell_strongest_base_value,
} from "@/cell/Cell";
import { execute_all_tasks_sequential, run_scheduler_and_replay } from "../Shared/Scheduler/Scheduler";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { the_nothing } from "@/cell/CellValue";
import { p_add, p_subtract, p_multiply, p_divide } from "../Propagator/BuiltInProps";
import { set_merge } from "@/cell/Merge";
import { merge_temporary_value_set } from "../DataTypes/TemporaryValueSet";
import { support_layer } from "sando-layer/Specified/SupportLayer";
import { assert, compound_tell, kick_out as kick_out_premise, reactive_tell } from "../Helper/UI";
import { 
   source_cell as  construct_dependent_cell, 
    dependent_update, 
    kick_out_cell, 
    bring_in_cell, 
    clean_dependence_cells,
    get_dependence_cell,
    has_dependence_cell,
    kick_out,
    bring_in
} from "../DataTypes/PremisesSource";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { construct_better_set } from "generic-handler/built_in_generics/generic_better_set";
import "../DataTypes/register_vector_clock_patchedValueSet";
import { vector_clock_layer } from "../AdvanceReactivity/vector_clock";
import { log_tracer } from "generic-handler/built_in_generics/generic_debugger";

beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP);

    set_merge(merge_temporary_value_set);
});

describe("TemporaryValueSet Propagator Integration Tests", () => {
    
    describe("Single Layer Tests: Support Layer (Supported Values Only)", () => {
        
        test("should handle addition with supported values", async () => {
            const cellA = construct_cell("supportAddA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("supportAddB") as Cell<LayeredObject<any>>;
            const output = construct_cell("supportAddOutput");
            
            p_add(cellA, cellB, output);
            
            // Treating support sets as clock sources implicitly through unified subsumption logic
            compound_tell(cellA, 10, vector_clock_layer, new Map([["a", 1]]))
            compound_tell(cellB, 20, vector_clock_layer, new Map([["b", 1]]))
            
            run_scheduler_and_replay(console.log)
            
            expect(cell_strongest_base_value(output)).toBe(30);
        });

        test("should handle multiplication with support layer values", async () => {
            const cellA = construct_cell("supportMulA");
            const cellB = construct_cell("supportMulB");
            const output = construct_cell("supportMulOutput");
            
            p_multiply(cellA, cellB, output);
            //@ts-ignore
            compound_tell(cellA, 6, vector_clock_layer, new Map([["sourceA", 1]]));
            //@ts-ignore
            compound_tell(cellB, 7, vector_clock_layer, new Map([["sourceB", 1]]));
            
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
            compound_tell(cellA, 15, vector_clock_layer, new Map([["sourceA", 1]]));
            //@ts-ignore
            compound_tell(cellB, 5, vector_clock_layer, new Map([["sourceB", 1]]));
            
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
            compound_tell(cellA, 20, vector_clock_layer, new Map([["sourceA", 1]]));
            //@ts-ignore
            compound_tell(cellB, 4, vector_clock_layer, new Map([["sourceB", 1]]));
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            expect(cell_strongest_base_value(output)).toBe(5);
        });
    });


    describe("Edge Cases with TemporaryValueSets", () => {
        
        test("should handle empty cell values gracefully", async () => {
            const cellA = construct_cell("emptyA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("emptyB") as Cell<LayeredObject<any>>;
            const output = construct_cell("emptyOutput");
            
            p_add(cellA, cellB, output);
            
            // Initially both are empty
            expect(cell_strongest_base_value(output)).toBe(the_nothing);
            
            // Add only to A
            compound_tell(cellA, 10, vector_clock_layer, new Map([["a", 1]]));
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            // Output should still be nothing since B is missing
            expect(cell_strongest_base_value(output)).toBe(the_nothing);
            
            // Now add to B
            compound_tell(cellB, 5, vector_clock_layer, new Map([["b", 1]]));
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
            compound_tell(constant, 2, vector_clock_layer, new Map([["c", 1]]));
            
            // Add same base value with different support
            compound_tell(cell, 10, vector_clock_layer, new Map([["weak_support_1", 1]]));
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            const result1 = cell_strongest_base_value(output);
            expect(result1).toBe(20);
            
            // Add same value with different support
            compound_tell(cell, 10, vector_clock_layer, new Map([["weak_support_2", 1]]));
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("Error:", error.message);
            });
            
            const result2 = cell_strongest_base_value(output);
            expect(result2).toBe(20);
        });
    });

    describe("VECTOR CLOCK + TEMPORARY SET PROPAGATOR TESTS", () => {
        
        // test("[VECTOR_CLOCK] Basic addition with victor clock values in propagator", async () => {
        //     const cellA = construct_cell("vc_addA");
        //     const cellB = construct_cell("vc_addB");
        //     const output = construct_cell("vc_addOutput");
            
        //     p_add(cellA, cellB, output);
            
        //     reactive_tell(cellA, 10)
        //     reactive_tell(cellB, 20)

        //     await execute_all_tasks_sequential((error: Error) => {
        //         if (error) {
        //             console.log("PROPAGATION ERROR:", error.message);
        //             console.log(error.stack);
        //         }
        //     });
            
        //     expect(cell_strongest_base_value(output)).toBe(30);
        // });

        test("[VICTOR_CLOCK + SUPPORT] Stale reactive value replaced by fresher version with support", async () => {
            const cellA = construct_cell("vcSup_staleA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("vcSup_staleB") as Cell<LayeredObject<any>>;
            const output = construct_cell("vcSup_staleOutput");
            
            p_add(cellA, cellB, output);
            const update_sourceA = dependent_update("A")
            const update_sourceB = dependent_update("B")


            update_sourceA(new Map([[cellA, 5]]))
            update_sourceB(new Map([[cellB, 3]]))
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR in v1:", error.message);
            });
            
            let result1 = cell_strongest_base_value(output);
            expect(result1).toBe(8);
            
            // Update with fresher versions (v2) and different support
            // TemporaryValueSet should handle this as a new time frame/value
            const update_sourceA1 = dependent_update("A1")
            const update_sourceB1 = dependent_update("B1")

            update_sourceA1(new Map([[cellA, 7]]))
            update_sourceB1(new Map([[cellB, 4]]))

            kick_out("A")
            kick_out("B")
  
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR in v2:", error.message);
            });
            console.log("cellA", cellA.summarize())

            
            let result2 = cell_strongest_base_value(output);
            expect(result2).toBe(11);
        });

        test("[VICTOR_CLOCK + SUPPORT] Concurrent values with different clocks and supports should coexist but may raise contradiction", async () => {
            const cellA = construct_cell("vcConcA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("vcConcB") as Cell<LayeredObject<any>>;
            const output = construct_cell("vcConcOutput");
            
            p_add(cellA, cellB, output);
            
            // Two concurrent values from different sources with different supports
            const update_sourceA = dependent_update("sourceA");
            const update_sourceB = dependent_update("sourceB");
            
            update_sourceA(new Map([[cellA, 5]]));
            update_sourceB(new Map([[cellB, 3]]));
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR 1:", error.message);
            });
            
            let result1 = cell_strongest_base_value(output);
            expect(result1).toBe(8);
            
            // Now add concurrent value from source2
            const update_sourceA1 = dependent_update("sourceA1");
            update_sourceA1(new Map([[cellA, 7]]));

            kick_out("sourceA");
            
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
            
            // First: Support-only values
            const update_supportOnlyA = dependent_update("supportOnlyA");
            const update_supportOnlyB = dependent_update("supportOnlyB");
            
            update_supportOnlyA(new Map([[cellA, 5]]));
            update_supportOnlyB(new Map([[cellB, 3]]));
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR support-only:", error.message);
            });
            
            let result_support = cell_strongest_base_value(output);
            expect(result_support).toBe(8);
            
            // Now add Victor Clock value to cellA (fresher version)
            const update_supportOnlyA_v2 = dependent_update("supportOnlyA_v2");
            update_supportOnlyA_v2(new Map([[cellA, 10]]));
            
            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR adding VC:", error.message);
            });
            
            let result_mixed_2 = cell_strongest_base_value(output);
            expect(result_mixed_2).toBe(8); 

            kick_out("supportOnlyA")

            await execute_all_tasks_sequential((error: Error) => {
                if (error) console.log("ERROR adding VC:", error.message);
            });

            let result_mixed = cell_strongest_base_value(output);
            expect(result_mixed).toBe(13); 
        });

        test("[VICTOR_CLOCK + SUPPORT] Multiple stale values with support replacement", async () => {
            const cellA = construct_cell("multiStaleA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("multiStaleB") as Cell<LayeredObject<any>>;
            const output = construct_cell("multiStaleOutput");
            
            p_multiply(cellA, cellB, output);
            
            // Build up multiple stale values - v1
            const update_sourceA_v1 = dependent_update("sourceA_v1");
            const update_sourceB_v1 = dependent_update("sourceB_v1");
            
            update_sourceA_v1(new Map([[cellA, 2]]));
            update_sourceB_v1(new Map([[cellB, 3]]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            let result1 = cell_strongest_base_value(output);
            expect(result1).toBe(6);
            
            // Update to v2
            const update_sourceA_v2 = dependent_update("sourceA_v2");
            const update_sourceB_v2 = dependent_update("sourceB_v2");
            
            update_sourceA_v2(new Map([[cellA, 5]]));
            update_sourceB_v2(new Map([[cellB, 4]]));
            
            kick_out("sourceA_v1");
            kick_out("sourceB_v1");
            
            await execute_all_tasks_sequential((error: Error) => {});
            let result2 = cell_strongest_base_value(output);
            expect(result2).toBe(20);
            
            // Update to v3
            const update_sourceA_v3 = dependent_update("sourceA_v3");
            const update_sourceB_v3 = dependent_update("sourceB_v3");
            
            update_sourceA_v3(new Map([[cellA, 7]]));
            update_sourceB_v3(new Map([[cellB, 6]]));
            
            kick_out("sourceA_v2");
            kick_out("sourceB_v2");
            
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
            const update_supportA = dependent_update("supportA");
            const update_supportB = dependent_update("supportB");
            
            update_supportA(new Map([[cellA, 10]]));
            update_supportB(new Map([[cellB, 5]]));
            
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
            const update_supportA = dependent_update("supportA");
            const update_supportB = dependent_update("supportB");
            
            update_supportA(new Map([[cellA, 10]]));
            update_supportB(new Map([[cellB, 5]]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result1 = cell_strongest_base_value(output);
            expect(result1).toBe(15);
            
            // Add another value to cellB that conflicts
            const update_supportC = dependent_update("supportC");
            update_supportC(new Map([[cellB, 20]]));
            
            kick_out("supportB");
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result2 = cell_strongest_base_value(output);
            expect(result2).toBe(30); // 10 + 20
            
            // Now kick out one of the conflicting premises
            kick_out("supportC");
            bring_in("supportB");
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result3 = cell_strongest_base_value(output);
            expect(result3).toBe(15);
        });

        test("[VICTOR_CLOCK + SUPPORT + CONTRADICTION] Contradiction with mixed layers and resolution", async () => {
            const cellA = construct_cell("vcContradictionA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("vcContradictionB") as Cell<LayeredObject<any>>;
            const output = construct_cell("vcContradictionOutput");
            
            p_multiply(cellA, cellB, output);
            
            // Add initial values with Victor Clock v1 and support
            const update_supportA = dependent_update("supportA");
            const update_supportB = dependent_update("supportB");
            
            update_supportA(new Map([[cellA, 5]]));
            update_supportB(new Map([[cellB, 4]]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            
       
            let result1 = cell_strongest_base_value(output);
            expect(result1).toBe(20);
            
            // Add conflicting value with different Victor Clock from same processor
            const update_supportC = dependent_update("supportC");
            update_supportC(new Map([[cellA, 3]]));
            
            kick_out("supportA");
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result2 = cell_strongest_base_value(output);

        
    
            expect(result2).toBe(12); // 20 - 8 (5*4 - 3*4)
            
            // Resolve by kicking out the conflicting support premise
            kick_out("supportC");
            bring_in("supportA");
         
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result3 = cell_strongest_base_value(output);
            expect(result3).toBe(20);
        });

        test("[VICTOR_CLOCK + SUPPORT + CONTRADICTION] Update to fresher clock version removes contradiction", async () => {
            const cellA = construct_cell("vcUpdateResolveA") as Cell<LayeredObject<any>>;
            const cellB = construct_cell("vcUpdateResolveB") as Cell<LayeredObject<any>>;
            const output = construct_cell("vcUpdateResolveOutput");
            
            p_add(cellA, cellB, output);
            
            // Add initial values v1
            const update_supportA_v1 = dependent_update("supportA_v1");
            const update_supportB_v1 = dependent_update("supportB_v1");
            
            update_supportA_v1(new Map([[cellA, 5]]));
            update_supportB_v1(new Map([[cellB, 3]]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result1 = cell_strongest_base_value(output);
            expect(result1).toBe(8);
            
            // Add conflicting values at same version
            const update_supportC = dependent_update("supportC");
            const update_supportD = dependent_update("supportD");
            
            update_supportC(new Map([[cellA, 10]]));
            update_supportD(new Map([[cellB, 2]]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result2 = cell_strongest_base_value(output);
            expect(result2).toBe(8); 
            
            // Resolve by updating to fresher version
            const update_supportA_v2 = dependent_update("supportA_v2");
            const update_supportB_v2 = dependent_update("supportB_v2");
            
            update_supportA_v2(new Map([[cellA, 7]]));
            update_supportB_v2(new Map([[cellB, 4]]));
            
            kick_out("supportA_v1");
            kick_out("supportB_v1");
            kick_out("supportC");
            kick_out("supportD");
            
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
            
            // Add initial values v1
            const update_sourceA_v1 = dependent_update("sourceA_v1");
            const update_sourceB_v1 = dependent_update("sourceB_v1");
            const update_sourceC_v1 = dependent_update("sourceC_v1");
            
            update_sourceA_v1(new Map([[cellA, 2]]));
            update_sourceB_v1(new Map([[cellB, 3]]));
            update_sourceC_v1(new Map([[cellC, 4]]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result1 = cell_strongest_base_value(output);
            expect(result1).toBe(20);
            
            // Add conflicting values
            const update_sourceA1 = dependent_update("sourceA1");
            const update_sourceB1 = dependent_update("sourceB1");
            const update_sourceC1 = dependent_update("sourceC1");
            
            update_sourceA1(new Map([[cellA, 5]]));
            update_sourceB1(new Map([[cellB, 6]]));
            update_sourceC1(new Map([[cellC, 2]]));
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result2 = cell_strongest_base_value(output);
            expect(result2).toBe(20); // 20 + 2
            
            // Resolve cascade: remove old supports one by one
            kick_out("sourceA_v1");
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let resultAfterD = cell_strongest_base_value(output);
            expect(resultAfterD).toBe(20); // 22 - 5
            
            kick_out("sourceB_v1");
            
            await execute_all_tasks_sequential((error: Error) => {});
            
            let resultAfterE = cell_strongest_base_value(output);
            expect(resultAfterE).toBe(20); // 17 - 2
            
            kick_out("sourceC_v1");
            

            console.log("runned scheduler")
            await execute_all_tasks_sequential((error: Error) => {});
            
            let result3 = cell_strongest_base_value(output);

            console.log(cellA.summarize())
            console.log(cellB.summarize())
            console.log(cellC.summarize())
            console.log(output.summarize())
            expect(result3).toBe(22);
        });
    });
});
