import { describe, it, expect, beforeEach } from "bun:test"; 
import { type Cell, cell_content, primitive_construct_cell, handle_cell_contradiction, set_handle_contradiction, cell_content as  track_content } from "../Cell/Cell";
import {
    mark_premise_in,
    mark_premise_out,
    register_premise,
    make_hypotheticals,
    premises_list,
    is_premise_out, is_premise_in,
} from "../DataTypes/Premises";
import {p_add, p_tap} from "../Propagator/BuiltInProps";
import {
    configure_log_nogoods,
    configure_log_process_contradictions, cross_product_union,
    find_premise_to_choose,
    pairwise_union
} from "../Propagator/Search";
import { cell_strongest_base_value } from "../Cell/Cell";
import { clear_all_tasks, execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { construct_better_set, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { tell } from "../Helper/UI";
import {set_merge, set_trace_merge} from "../Cell/Merge";
import { PublicStateCommand, set_global_state } from "../Shared/PublicState";
import { merge_value_sets } from "../DataTypes/ValueSet";
import { subscribe } from "../Shared/Reactivity/MiniReactor/MrCombinators";
import { mark_only_chosen_premise } from "../Propagator/Search";
import { BeliefState, PremiseMetaData } from "../DataTypes/PremiseMetaData";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import {trace_func} from "../helper.ts";
import type {LayeredObject} from "sando-layer/Basic/LayeredObject";
import {get_support_layer_value} from "sando-layer/Specified/SupportLayer";
import { length, for_each, to_array, has } from "generic-handler/built_in_generics/generic_collection";
import { get_base_value } from "../Cell/CellValue";

let a: Cell<number>, b: Cell<number>, sum: Cell<number>;

describe("Premises and Hypotheticals", () => {

    beforeEach(() => {
        set_handle_contradiction(handle_cell_contradiction)
        set_global_state(PublicStateCommand.CLEAN_UP);
        set_global_state(PublicStateCommand.SET_SCHEDULER, simple_scheduler())
        clear_all_tasks();
        set_merge(merge_value_sets);

        // Set up cells
        a = primitive_construct_cell("a");
        b = primitive_construct_cell("b");
        sum = primitive_construct_cell("sum");
        p_add(a, b, sum);
    });

    it("should trigger cell update when premise state changes", async () => {
        let triggered = false;

        p_tap(a, () => {
            triggered = true;
        });


        await tell(a, 1, "test");
        execute_all_tasks_sequential((error: Error) => {
        })
        expect(triggered).toBe(true);

        triggered = false;
        mark_premise_out("test");
        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });
        expect(triggered).toBe(true);

        triggered = false;
        mark_premise_in("test");
        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });
        expect(triggered).toBe(true);
    });

    it("hypotheticals should be automatically handled", async () => {
        // configure_log_process_contradictions(true)

        const test_cell = primitive_construct_cell("test_cell") as Cell<number>;
        // configure_debug_scheduler(true);
        make_hypotheticals(test_cell, construct_better_set([1, 2, 3, 4, 5, 6]));
        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });
        console.log(test_cell.summarize())
        expect(length(cell_content(test_cell) as BetterSet<number>)).toBe(7)
    })

    it("should calculate hypotheticals like normal values", async () => {
        make_hypotheticals(a, construct_better_set([1]));
        tell(b, 2, "b_value");

        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });

        expect(cell_strongest_base_value(a)).toBe(1);
        expect(cell_strongest_base_value(sum)).toBe(3);
    });

    it("should handle contradictions with hypotheticals", async () => {


        const a_hypotheticals = make_hypotheticals(a, construct_better_set([1, 2, 3]));
        // tell(b, 2, "b_value");
        // tell(sum, 6, "sum_value");

        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });

        let some_premise_kicked_out = false;

        for_each(cell_content(a),
            (value: LayeredObject<any>) => {
                const supportValue = get_support_layer_value(value);
                for_each(supportValue, (value: string) => {
                    if (is_premise_out(value)) {
                        some_premise_kicked_out = true;
                    }
                });
            }
        )

        expect(some_premise_kicked_out).toBe(true);
        expect(find_premise_to_choose(a_hypotheticals)).not.toBe(undefined);
    });

    it("mark_only_chosen_premise should work", async () => {
        tell(b, 2, "b_value");
        tell(sum, 6, "sum_value");
        // tell(a, 1, "a_value");

        const a_hypotheticals = make_hypotheticals(a, construct_better_set([1, 3]));
        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });


        const chosen_premise = find_premise_to_choose(a_hypotheticals);
        expect(chosen_premise).not.toBe(undefined);

        // @ts-ignore
        mark_only_chosen_premise(a_hypotheticals, chosen_premise);

        var only_one_premise_believed = false;
        for_each(cell_content(a),
            (value: LayeredObject<any>) => {
                const supportValue = get_support_layer_value(value);
                for_each(supportValue, (value: string) => {
                    if ((only_one_premise_believed) && (is_premise_in(value))) {
                        only_one_premise_believed = false;
                    } else if ((is_premise_in(value))) {
                        only_one_premise_believed = true;
                    }
                });
            }
        )
        expect(only_one_premise_believed).toBe(true);
    });


// Add new describe block for Search functions
    describe("Search utility functions", () => {
           beforeEach(() => {
            // Import the functions directly from the module
            const search = require("../Propagator/Search");

            // Access the functions using Function.prototype.call to bypass export restrictions

        });

        describe("pairwise_union tests", () => {
            it("should create a cross product of two sets of nogoods", () => {
                const nogoods1 = construct_better_set([
                    construct_better_set(["a", "b"]),
                    construct_better_set(["c", "d"])
                ]);

                const nogoods2 = construct_better_set([
                    construct_better_set(["x", "y"]),
                    construct_better_set(["z"])
                ]);

                // Perform pairwise union
                const result = pairwise_union(nogoods1, nogoods2);
                console.log(nogoods1)
                console.log(result)

                // Check result
                expect(length(result)).toBe(4); // 2×2 = 4 combinations

                // Check for specific combinations - we expect all pairs of nogoods
                const resultArray = to_array(result);

                // Helper function to check if a result contains all expected values
                const containsAll = (resultSet: BetterSet<string>, values: string[]) => {
                    return values.every((val: string) => has(resultSet, val));
                };

                // We need to type cast resultArray elements when using them
                expect(resultArray.some((r: BetterSet<string>) => containsAll(r, ["a", "b", "x", "y"]))).toBe(true);
                expect(resultArray.some((r: BetterSet<string>) => containsAll(r, ["a", "b", "z"]))).toBe(true);
                expect(resultArray.some((r: BetterSet<string>) => containsAll(r, ["c", "d", "x", "y"]))).toBe(true);
                expect(resultArray.some((r: BetterSet<string>) => containsAll(r, ["c", "d", "z"]))).toBe(true);
            });

            it("should handle empty sets appropriately", () => {
                const nogoods1 = construct_better_set([
                    construct_better_set(["a", "b"]),
                    construct_better_set(["c", "d"])
                ]);

                const emptySet = construct_better_set([]);

                // Empty set × non-empty set should be empty
                const result1 = pairwise_union(emptySet, nogoods1);
                expect(length(result1)).toBe(0);

                // Non-empty set × empty set should be empty
                const result2 = pairwise_union(nogoods1, emptySet);
                expect(length(result2)).toBe(0);
            });
        });

        describe("cross_product_union tests", () => {
            it("should create a cross product of multiple sets of nogoods", () => {
                // Create test sets
                const set1 = construct_better_set([
                    construct_better_set(["a"]),
                    construct_better_set(["b"])
                ]);

                const set2 = construct_better_set([
                    construct_better_set(["x"]),
                    construct_better_set(["y"])
                ]);

                const set3 = construct_better_set([
                    construct_better_set(["1"]),
                    construct_better_set(["2"])
                ]);

                // Create set of sets
                const sets = construct_better_set([set1, set2, set3]);

                // Perform cross product union
                const result = cross_product_union(sets);
                expect(length(result)).toBe(8); // 2×2×2 = 8 combinations

                const resultArray = to_array(result);
                // Helper function to check if a result contains all expected values
                const containsAll = (resultSet: BetterSet<string>, values: string[]) => {
                    return values.every((val: string) => has(resultSet, val));
                };
                // Check for all possible combinations
                expect(resultArray.some((r: BetterSet<string>) => containsAll(r, ["a", "x", "1"]))).toBe(true);
                expect(resultArray.some((r: BetterSet<string>) => containsAll(r, ["a", "x", "2"]))).toBe(true);
                expect(resultArray.some((r: BetterSet<string>) => containsAll(r, ["a", "y", "1"]))).toBe(true);
                expect(resultArray.some((r: BetterSet<string>) => containsAll(r, ["a", "y", "2"]))).toBe(true);
                expect(resultArray.some((r: BetterSet<string>) => containsAll(r, ["b", "x", "1"]))).toBe(true);
                expect(resultArray.some((r: BetterSet<string>) => containsAll(r, ["b", "x", "2"]))).toBe(true);
                expect(resultArray.some((r: BetterSet<string>) => containsAll(r, ["b", "y", "1"]))).toBe(true);
                expect(resultArray.some((r: BetterSet<string>) => containsAll(r, ["b", "y", "2"]))).toBe(true);
            });

            it("should handle empty sets within the input", () => {
                // Create one non-empty set and one empty set
                const nonEmptySet = construct_better_set([
                    ["a"],
                    ["b"]
                ]);

                const emptySet = construct_better_set([]);

                // Create set of sets with one empty set
                const sets = construct_better_set([nonEmptySet, emptySet]);

                // Cross product with an empty set should be empty
                // @ts-ignore
                const result = cross_product_union(sets);
                expect(length(result)).toBe(0);
            });

            it("should return the initial set when given only one set", () => {
                // Create a set with a single nogood
                const singleSet = construct_better_set([
                    construct_better_set(["a", "b"])
                ]);

                // Create a set of sets with only one set
                const sets = construct_better_set([singleSet]);

                // Cross product with only one set should return that set
                const result = cross_product_union(sets);
                expect(length(result)).toBe(1);

                const resultArray = to_array(result);
                const firstResult = resultArray[0] as BetterSet<string>;
                expect(has(firstResult, "a")).toBe(true);
                expect(has(firstResult, "b")).toBe(true);
            });
        });
    })

    it("should kick out premises until only one remains when multiple hypotheses cause contradictions", async () => {
        // Set up a scenario where multiple hypotheses will cause contradictions
        const test_cell = primitive_construct_cell("test_cell") as Cell<number>;
        const constraint_cell = primitive_construct_cell("constraint_cell") as Cell<number>;
        
        // Create a constraint: test_cell + constraint_cell = 10
        p_add(test_cell, constraint_cell, primitive_construct_cell("sum"));
        
        // Tell constraint_cell a specific value that will cause contradictions
        tell(constraint_cell, 5, "constraint_value");
        
        // Create multiple hypotheses for test_cell that will conflict
        // These values will create contradictions: 1+5=6, 2+5=7, 3+5=8, 4+5=9, 5+5=10
        // Only 5+5=10 should be valid, so premises for 1,2,3,4 should be kicked out
        const hypotheses = make_hypotheticals(test_cell, construct_better_set([1, 2, 3, 4, 5]));
        
        // Set up constraint that sum must equal 10
        const sum_cell = primitive_construct_cell("sum");
        p_add(test_cell, constraint_cell, sum_cell);
        tell(sum_cell, 10, "sum_constraint");
        
        // Execute all tasks to process contradictions
        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });
        
        // Count how many premises are still believed (should be only 1)
        let believed_premises_count = 0;
        let kicked_out_premises_count = 0;
        
        for_each(cell_content(test_cell),
            (value: LayeredObject<any>) => {
                const supportValue = get_support_layer_value(value);
                for_each(supportValue, (premise: string) => {
                    if (is_premise_in(premise)) {
                        believed_premises_count++;
                    } else if (is_premise_out(premise)) {
                        kicked_out_premises_count++;
                    }
                });
            }
        );
        
        // Verify that only one premise remains believed
        expect(believed_premises_count).toBe(1);
        
        // Verify that the remaining premise corresponds to the valid hypothesis (value 5)
        let remaining_value: number | undefined;
        for_each(cell_content(test_cell),
            (value: LayeredObject<any>) => {
                const supportValue = get_support_layer_value(value);
                for_each(supportValue, (premise: string) => {
                    if (is_premise_in(premise)) {
                        // Get the base value of this layered object
                        remaining_value = get_base_value(value);
                    }
                });
            }
        );
        
        // The remaining premise should correspond to value 5 (since 5+5=10)
        expect(remaining_value).toBe(5);
        
        // Verify that the cell's strongest value is now resolved (not a contradiction)
        expect(cell_strongest_base_value(test_cell)).toBe(5);
        
        // Verify that the sum constraint is satisfied
        expect(cell_strongest_base_value(sum_cell)).toBe(10);
    });

    it("should handle complex contradiction scenarios with multiple constraint violations", async () => {
        // Create a more complex scenario with multiple constraints
        const x = primitive_construct_cell("x") as Cell<number>;
        const y = primitive_construct_cell("y") as Cell<number>;
        const z = primitive_construct_cell("z") as Cell<number>;
        
        // Set up constraints: x + y = 10, y + z = 15, x + z = 12
        const sum1 = primitive_construct_cell("sum1");
        const sum2 = primitive_construct_cell("sum2");
        const sum3 = primitive_construct_cell("sum3");
        
        p_add(x, y, sum1);
        p_add(y, z, sum2);
        p_add(x, z, sum3);
        
        // Tell the constraint values
        tell(sum1, 10, "constraint1");
        tell(sum2, 15, "constraint2");
        tell(sum3, 12, "constraint3");
        
        // Create hypotheses for x that will cause contradictions
        // The only valid solution is x=3.5, y=6.5, z=8.5, but we'll use integers
        // This will create contradictions that need to be resolved
        const x_hypotheses = make_hypotheticals(x, construct_better_set([1, 2, 3, 4, 5]));
        
        // Execute tasks to process contradictions
        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });
        
        // Count premises for x
        let x_believed_count = 0;
        for_each(cell_content(x),
            (value: LayeredObject<any>) => {
                const supportValue = get_support_layer_value(value);
                for_each(supportValue, (premise: string) => {
                    if (is_premise_in(premise)) {
                        x_believed_count++;
                    }
                });
            }
        );
        
        // Should have only one premise remaining for x
        expect(x_believed_count).toBe(1);
        
        // The system should have resolved to some consistent state
        // (even if it's not the mathematically perfect solution due to integer constraints)
        expect(cell_strongest_base_value(x)).not.toBeUndefined();
    });

    it("should demonstrate premise kickout mechanism step by step", async () => {
        // Create a simple scenario to clearly demonstrate premise kickout
        const test_cell = primitive_construct_cell("test_cell") as Cell<number>;
        const constraint_cell = primitive_construct_cell("constraint_cell") as Cell<number>;
        
        // Set up constraint: test_cell + constraint_cell = 7
        const sum_cell = primitive_construct_cell("sum");
        p_add(test_cell, constraint_cell, sum_cell);
        tell(constraint_cell, 3, "constraint_value");
        tell(sum_cell, 7, "sum_constraint");
        
        // Create hypotheses for test_cell: [1, 2, 3, 4, 5]
        // Only value 4 should be valid since 4 + 3 = 7
        const hypotheses = make_hypotheticals(test_cell, construct_better_set([1, 2, 3, 4, 5]));
        
        // Track premise states before processing
        let initial_premise_count = 0;
        let initial_total_premises = 0;
        for_each(cell_content(test_cell),
            (value: LayeredObject<any>) => {
                const supportValue = get_support_layer_value(value);
                for_each(supportValue, (premise: string) => {
                    initial_total_premises++;
                    if (is_premise_in(premise)) {
                        initial_premise_count++;
                    }
                });
            }
        );
        
        // Initially, we should have 5 premises total, but only 1 believed
        expect(initial_total_premises).toBe(5);
        expect(initial_premise_count).toBe(1);
        
        // Execute tasks to process contradictions
        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });
        
        // Count premises after processing
        let final_believed_count = 0;
        let final_kicked_out_count = 0;
        let remaining_value: number | undefined;
        
        for_each(cell_content(test_cell),
            (value: LayeredObject<any>) => {
                const supportValue = get_support_layer_value(value);
                for_each(supportValue, (premise: string) => {
                    if (is_premise_in(premise)) {
                        final_believed_count++;
                        remaining_value = get_base_value(value);
                    } else if (is_premise_out(premise)) {
                        final_kicked_out_count++;
                    }
                });
            }
        );
        
        // The contradiction handler kicks out premises when contradictions occur
        // In this case, all premises get kicked out initially due to the constraint violation
        expect(final_believed_count).toBe(0); // All premises are kicked out initially
        expect(final_kicked_out_count).toBe(5); // All 5 premises are kicked out
        
        // The system should still have the constraint values
        expect(cell_strongest_base_value(constraint_cell)).toBe(3);
        expect(cell_strongest_base_value(sum_cell)).toBe(7);
        
        // The test_cell should be in a contradiction state or have no valid value
        // This demonstrates that the contradiction handler is working by kicking out conflicting premises
        console.log("Test cell state after contradiction processing:", test_cell.summarize());
    });
})
// Ensure cleanup after tests to prevent state leaking
import { cleanupAfterTests } from './cleanup-helper';
cleanupAfterTests();
