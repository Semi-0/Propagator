// import { describe, it, expect, beforeEach } from "bun:test"; 
// import { Cell } from "../Cell/Cell";
// import { mark_premise_in, mark_premise_out, register_premise, make_hypotheticals, summarize_premises_list, premises_list, BeliefState } from "../DataTypes/Premises";
// import { observe_premises_has_changed } from "../DataTypes/Premises";
// import { find_premise_to_choose, mark_only_chosen_premise, p_add } from "../BuiltInProps";
// import { cell_strongest_base_value } from "../Cell/Cell";
// import { execute_all_tasks_sequential } from "../Scheduler";
// import { make_better_set } from "generic-handler/built_in_generics/generic_better_set";
// import { tell } from "../ui";
// import { set_merge } from "@/cell/Merge";
// import { PublicStateCommand, set_global_state } from "../PublicState";
// import { merge_value_sets, value_set_length } from "../DataTypes/ValueSet";
// import { subscribe } from "../Reactivity/Reactor";
// import { type PremiseMetaData } from "../DataTypes/Premises";
// let a: Cell, b: Cell, sum: Cell;

// beforeEach(() => {
//     set_global_state(PublicStateCommand.CLEAN_UP);
//     set_merge(merge_value_sets);

//     // Set up cells
//     a = new Cell("a");
//     b = new Cell("b");
//     sum = new Cell("sum");
//     p_add(a, b, sum);
// });

// describe("Premises and Hypotheticals", () => {
//     it("should trigger premises_has_changed when premise state changes", () => {
//         let triggered = false;
//         observe_premises_has_changed().subscribe(() => { triggered = true; });
        
//         register_premise("test", a);
        
//         mark_premise_out("test");
//         expect(triggered).toBe(true);
        
//         triggered = false;
//         mark_premise_in("test");
//         expect(triggered).toBe(true);
//     });

//     it("hypotheticals should all been added to cell content", async () => {
//         make_hypotheticals(a, make_better_set([1, 2, 3]));
//         await execute_all_tasks_sequential((error: Error) => {
//             console.error("Error during task execution:", error);
//         }).task;
//         expect(value_set_length(a.getContent().get_value())).toBe(3)
//     })

//     it("should calculate hypotheticals like normal values", async () => {
//         make_hypotheticals(a, make_better_set([1]));
//         tell(b, 2, "b_value");

//         await execute_all_tasks_sequential((error: Error) => {
//             console.error("Error during task execution:", error);
//         }).task;

//         expect(cell_strongest_base_value(a)).toBe(1);
//         expect(cell_strongest_base_value(sum)).toBe(3);
//     });

//     it("should handle contradictions with hypotheticals", async () => {
//         const a_hypotheticals = make_hypotheticals(a, make_better_set([1, 2, 3]));
//         tell(b, 2, "b_value");
//         tell(sum, 6, "sum_value");

//         await execute_all_tasks_sequential((error: Error) => {
//             console.error("Error during task execution:", error);
//         }).task;

//         let some_premise_kicked_out = false;
//         subscribe((m: Map<string, PremiseMetaData>) => {
//             some_premise_kicked_out = Array.from(m.values()).some(value => value.belief_state === BeliefState.NotBelieved);
//         })(premises_list);

//         expect(some_premise_kicked_out).toBe(true);
//         expect(find_premise_to_choose(a_hypotheticals)).not.toBe(undefined);
//     });

//     it("mark_only_chosen_premise should work", async () => {
//         tell(b, 2, "b_value");
//         tell(sum, 6, "sum_value");
//         // tell(a, 1, "a_value");
        
//         const a_hypotheticals = make_hypotheticals(a, make_better_set([1,  3]));
//         await execute_all_tasks_sequential((error: Error) => {
//             console.error("Error during task execution:", error);
//         }).task;

//         console.log("a strongest", cell_strongest_base_value(a))

//         const chosen_premise = find_premise_to_choose(a_hypotheticals);
//         expect(chosen_premise).not.toBe(undefined);

//         // @ts-ignore
//         mark_only_chosen_premise(a_hypotheticals, chosen_premise);
       
//         var only_one_premise_believed = false;
//         subscribe((m: Map<string, PremiseMetaData>) => {
//             only_one_premise_believed = Array.from(m.values()).some(value => value.belief_state === BeliefState.NotBelieved);
//         })(premises_list);
//         expect(only_one_premise_believed).toBe(true);
//     });

//     it("mark_only_chosen_premise should work", async () => {
//         // TODO: THIS TEST SHOULD BE FIXED
//         // console.log("a content")
//         const a_hypotheticals = make_hypotheticals(a, make_better_set([1, 2, 3]));
//         tell(b, 2, "b_value");
//         tell(sum, 6, "sum_value");

//         await execute_all_tasks_sequential((error: Error) => {
//             console.error("Error during task execution:", error);
//         }).task;

//         console.log("a content");
//         console.log(a.getContent().get_value());
//         console.log("a strongest", a.getStrongest().get_value());
//         const chosen_premise = find_premise_to_choose(a_hypotheticals);
//         expect(chosen_premise).not.toBe(undefined);

//         var premises_is_changed = false;
//         subscribe((m: Map<string, PremiseMetaData>) => {
//             premises_is_changed = true;
//             // @ts-ignore
//         })(observe_premises_has_changed());

//         // @ts-ignore
//         mark_only_chosen_premise(a_hypotheticals, chosen_premise);
       
//         await execute_all_tasks_sequential((error: Error) => {
//             console.error("Error during task execution:", error);
//         }).task;

    
        

//         expect(premises_is_changed).toBe(true);
//         // console.log("a content", a.getContent().get_value());
//         // console.log("a strongest", a.getStrongest().get_value());
//         // console.log("sum strongest", sum.getStrongest().get_value());
//         console.log(summarize_premises_list());
//     });
// });