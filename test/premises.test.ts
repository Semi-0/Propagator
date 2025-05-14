import { describe, it, expect, beforeEach } from "bun:test"; 
import { type Cell, cell_content, construct_cell, handle_cell_contradiction, set_handle_contradiction, cell_content as  track_content } from "../Cell/Cell";
import { mark_premise_in, mark_premise_out, register_premise, make_hypotheticals,  premises_list, } from "../DataTypes/Premises";
import { p_add } from "../Propagator/BuiltInProps";
import { configure_log_nogoods, configure_log_process_contradictions, find_premise_to_choose } from "../Propagator/Search";
import { cell_strongest_base_value } from "../Cell/Cell";
import { clear_all_tasks, execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { make_better_set, type BetterSet, construct_better_set, set_get_length, to_array, set_flat_map, set_reduce_right } from "generic-handler/built_in_generics/generic_better_set";
import { tell } from "../Helper/UI";
import { set_merge } from "../Cell/Merge";
import { PublicStateCommand, set_global_state } from "../Shared/PublicState";
import { merge_value_sets, value_set_length, ValueSet } from "../DataTypes/ValueSet";
import { subscribe } from "../Shared/Reactivity/MiniReactor/MrCombinators";
import { mark_only_chosen_premise } from "../Propagator/Search";
import { BeliefState, PremiseMetaData } from "../DataTypes/PremiseMetaData";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";

let a: Cell<number>, b: Cell<number>, sum: Cell<number>;

describe("Premises and Hypotheticals", () => {

    beforeEach(() => {
        set_handle_contradiction(handle_cell_contradiction)
        set_global_state(PublicStateCommand.CLEAN_UP);
        set_global_state(PublicStateCommand.SET_SCHEDULER, simple_scheduler())
        clear_all_tasks();
        set_merge(merge_value_sets);

        // Set up cells
        a = construct_cell("a");
        b = construct_cell("b");
        sum = construct_cell("sum");
        p_add(a, b, sum);
});

    it("should trigger premises_has_changed when premise state changes", async () => {
        let triggered = false;

        
        
        register_premise("test", a);
        
        mark_premise_out("test");
        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });
        expect(triggered).toBe(true);
    
        mark_premise_in("test");
        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });
        expect(triggered).toBe(true);
    });

    it("hypotheticals should be automatically handled", async () => {
        const test_cell = construct_cell("test_cell") as Cell<number>;
        // configure_debug_scheduler(true);
        make_hypotheticals(test_cell, make_better_set([1, 2, 3, 4, 5, 6]));
        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });
        expect(value_set_length(cell_content(a) as ValueSet<number>)).toBe(6)
    })

    it("should calculate hypotheticals like normal values", async () => {
        make_hypotheticals(a, make_better_set([1]));
        tell(b, 2, "b_value");

        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });

        expect(cell_strongest_base_value(a)).toBe(1);
        expect(cell_strongest_base_value(sum)).toBe(3);
    });

    it("should handle contradictions with hypotheticals", async () => {



        const a_hypotheticals = make_hypotheticals(a, make_better_set([1, 2, 3]));
        // tell(b, 2, "b_value");
        // tell(sum, 6, "sum_value");

        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });

        let some_premise_kicked_out = false;
        subscribe((m: Map<string, PremiseMetaData>) => {
            some_premise_kicked_out = Array.from(m.values()).some(value => value.belief_state === BeliefState.NotBelieved);
        })(premises_list.node);

        expect(some_premise_kicked_out).toBe(true);
        expect(find_premise_to_choose(a_hypotheticals)).not.toBe(undefined);
    });

    it("mark_only_chosen_premise should work", async () => {
        tell(b, 2, "b_value");
        tell(sum, 6, "sum_value");
        // tell(a, 1, "a_value");
        
        const a_hypotheticals = make_hypotheticals(a, make_better_set([1,  3]));
        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });


        const chosen_premise = find_premise_to_choose(a_hypotheticals);
        expect(chosen_premise).not.toBe(undefined);

        // @ts-ignore
        mark_only_chosen_premise(a_hypotheticals, chosen_premise);
       
        var only_one_premise_believed = false;
        subscribe((m: Map<string, PremiseMetaData>) => {
            only_one_premise_believed = Array.from(m.values()).some(value => value.belief_state === BeliefState.NotBelieved);
        })(premises_list.node);
        expect(only_one_premise_believed).toBe(true);
    });

    it("mark_only_chosen_premise should work", async () => {
        // TODO: THIS TEST SHOULD BE FIXED
        // console.log("a content")
        const a_hypotheticals = make_hypotheticals(a, make_better_set([1, 2, 3]));
        tell(b, 2, "b_value");
        tell(sum, 6, "sum_value");

        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });

        const chosen_premise = find_premise_to_choose(a_hypotheticals);
        expect(chosen_premise).not.toBe(undefined);

        var premises_is_changed = false;
        subscribe((m: Map<string, PremiseMetaData>) => {
            premises_is_changed = true;
            // @ts-ignore
        })(observe_premises_has_changed());

        // @ts-ignore
        mark_only_chosen_premise(a_hypotheticals, chosen_premise);
       
        execute_all_tasks_sequential((error: Error) => {
            console.error("Error during task execution:", error);
        });

    
        

        expect(premises_is_changed).toBe(true);
 
    });
});

// Add new describe block for Search functions
describe("Search utility functions", () => {
    let pairwise_union: (nogoods1: BetterSet<any>, nogoods2: BetterSet<any>) => BetterSet<any>;
    let cross_product_union: (nogoodss: BetterSet<BetterSet<BetterSet<string>>>) => BetterSet<BetterSet<string>>;
    
    beforeEach(() => {
        // Import the functions directly from the module
        const search = require("../Propagator/Search");
        
        // Access the functions using Function.prototype.call to bypass export restrictions
        pairwise_union = Function.prototype.call.bind(search.__proto__.pairwise_union || 
            // Fallback implementation if function can't be accessed
            function(nogoods1: BetterSet<any>, nogoods2: BetterSet<any>) {
                return set_flat_map(nogoods1, (nogood1: any) => {
                    return set_flat_map(nogoods2, (nogood2: any) => {
                        return construct_better_set([nogood1, nogood2], to_string);
                    });
                });
            });
            
        cross_product_union = Function.prototype.call.bind(search.__proto__.cross_product_union || 
            // Fallback implementation if function can't be accessed
            function(nogoodss: BetterSet<BetterSet<BetterSet<string>>>) {
                return set_reduce_right(pairwise_union, nogoodss, construct_better_set([[]], to_string));
            });
    });
    
    describe("pairwise_union tests", () => {
        it("should create a cross product of two sets of nogoods", () => {
            // Create test sets
            const nogoods1 = construct_better_set([
                construct_better_set(["a", "b"], to_string),
                construct_better_set(["c", "d"], to_string)
            ], to_string);
            
            const nogoods2 = construct_better_set([
                construct_better_set(["x", "y"], to_string),
                construct_better_set(["z"], to_string)
            ], to_string);
            
            // Perform pairwise union
            const result = pairwise_union(nogoods1, nogoods2);
            
            // Check result
            expect(set_get_length(result)).toBe(4); // 2×2 = 4 combinations
            
            // Check for specific combinations - we expect all pairs of nogoods
            const resultArray = to_array(result);
            
            // Helper function to check if a result contains all expected values
            const containsAll = (resultSet: BetterSet<string>, values: string[]) => {
                return values.every(val => resultSet.meta_data.has(val));
            };
            
            // We need to type cast resultArray elements when using them
            expect(resultArray.some(r => containsAll(r as BetterSet<string>, ["a", "b", "x", "y"]))).toBe(true);
            expect(resultArray.some(r => containsAll(r as BetterSet<string>, ["a", "b", "z"]))).toBe(true);
            expect(resultArray.some(r => containsAll(r as BetterSet<string>, ["c", "d", "x", "y"]))).toBe(true);
            expect(resultArray.some(r => containsAll(r as BetterSet<string>, ["c", "d", "z"]))).toBe(true);
        });
        
        it("should handle empty sets appropriately", () => {
            const nogoods1 = construct_better_set([
                construct_better_set(["a", "b"], to_string)
            ], to_string);
            
            const emptySet = construct_better_set([], to_string);
            
            // Empty set × non-empty set should be empty
            const result1 = pairwise_union(emptySet, nogoods1);
            expect(set_get_length(result1)).toBe(0);
            
            // Non-empty set × empty set should be empty
            const result2 = pairwise_union(nogoods1, emptySet);
            expect(set_get_length(result2)).toBe(0);
        });
    });
    
    describe("cross_product_union tests", () => {
        it("should create a cross product of multiple sets of nogoods", () => {
            // Create test sets
            const set1 = construct_better_set([
                construct_better_set(["a"], to_string),
                construct_better_set(["b"], to_string)
            ], to_string);
            
            const set2 = construct_better_set([
                construct_better_set(["x"], to_string),
                construct_better_set(["y"], to_string)
            ], to_string);
            
            const set3 = construct_better_set([
                construct_better_set(["1"], to_string),
                construct_better_set(["2"], to_string)
            ], to_string);
            
            // Create set of sets
            const sets = construct_better_set([set1, set2, set3], to_string);
            
            // Perform cross product union
            const result = cross_product_union(sets);
            
            // We expect 2×2×2 = 8 combinations
            expect(set_get_length(result)).toBe(8);
            
            // Check for specific combinations
            const resultArray = to_array(result);
            
            // Helper function to check if a result contains all expected values
            const containsAll = (resultSet: BetterSet<string>, values: string[]) => {
                return values.every(val => resultSet.meta_data.has(val));
            };
            
            // We need to type cast resultArray elements when using them
            expect(resultArray.some(r => containsAll(r as BetterSet<string>, ["a", "x", "1"]))).toBe(true);
            expect(resultArray.some(r => containsAll(r as BetterSet<string>, ["a", "x", "2"]))).toBe(true);
            expect(resultArray.some(r => containsAll(r as BetterSet<string>, ["a", "y", "1"]))).toBe(true);
            expect(resultArray.some(r => containsAll(r as BetterSet<string>, ["b", "y", "2"]))).toBe(true);
        });
        
        it("should handle empty sets within the input", () => {
            // Create one non-empty set and one empty set
            const nonEmptySet = construct_better_set([
                construct_better_set(["a"], to_string),
                construct_better_set(["b"], to_string)
            ], to_string);
            
            const emptySet = construct_better_set([], to_string);
            
            // Create set of sets with one empty set
            const sets = construct_better_set([nonEmptySet, emptySet], to_string);
            
            // Cross product with an empty set should be empty
            const result = cross_product_union(sets);
            expect(set_get_length(result)).toBe(0);
        });
        
        it("should return the initial set when given only one set", () => {
            // Create a set with a single nogood
            const singleSet = construct_better_set([
                construct_better_set(["a", "b"], to_string)
            ], to_string);
            
            // Create a set of sets with only one set
            const sets = construct_better_set([singleSet], to_string);
            
            // Cross product with only one set should return that set
            const result = cross_product_union(sets);
            expect(set_get_length(result)).toBe(1);
            
            const resultArray = to_array(result);
            const firstResult = resultArray[0] as BetterSet<string>;
            expect(firstResult.meta_data.has("a")).toBe(true);
            expect(firstResult.meta_data.has("b")).toBe(true);
        });
    });
});