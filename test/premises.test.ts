import { describe, it, expect, beforeEach } from "bun:test"; 
import { type Cell, cell_content, construct_cell, handle_cell_contradiction, set_handle_contradiction, cell_content as  track_content } from "../Cell/Cell";
import { mark_premise_in, mark_premise_out, register_premise, make_hypotheticals,  premises_list, } from "../DataTypes/Premises";
import { p_add } from "../Propagator/BuiltInProps";
import { configure_log_nogoods, configure_log_process_contradictions, find_premise_to_choose } from "../Propagator/Search";
import { cell_strongest_base_value } from "../Cell/Cell";
import { clear_all_tasks, execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { make_better_set, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { tell } from "../Helper/UI";
import { set_merge } from "../Cell/Merge";
import { PublicStateCommand, set_global_state } from "../Shared/PublicState";
import { merge_value_sets, value_set_length, ValueSet } from "../DataTypes/ValueSet";
import { subscribe } from "../Shared/Reactivity/MiniReactor/MrCombinators";
import { mark_only_chosen_premise } from "../Propagator/Search";
import { BeliefState, PremiseMetaData } from "../DataTypes/PremiseMetaData";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";

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