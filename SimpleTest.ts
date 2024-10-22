// import { isNumber } from "effect/Predicate";
import { Cell, cell_strongest_base_value, test_cell_content, track_content, track_strongest } from "./Cell/Cell";
import { force_load_arithmatic } from "./Cell/GenericArith";
import { c_add, c_multiply, p_add, p_divide, p_multiply, p_not, p_subtract } from "./BuiltInProps";
import { binary_amb, configure_log_amb_choose, configure_log_nogoods, configure_log_process_contradictions, p_amb } from "./Search";
import { configure_trace_scheduler, configure_trace_scheduler_state_updates, execute_all_tasks_sequential, execute_all_tasks_simultaneous, steppable_run_task, summarize_scheduler_state } from "./Scheduler";
import { compact } from "fp-ts/lib/Compactable";
import { failed_count, observe_failed_count, PublicStateCommand, set_global_state } from "./PublicState";
import { merge_value_sets } from "./DataTypes/ValueSet";
import { construct_better_set, is_better_set, make_better_set, set_get_length, set_map, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { combine_latest } from "./Reactivity/Reactor";
import { _premises_metadata, is_premises_in, track_premise } from "./DataTypes/Premises";
import { all_results, enum_num_set, force_failure, observe_cell, tell } from "./ui";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { set_trace_merge } from "./Cell/Merge";
import { filter as reactor_filter } from "./Reactivity/Reactor"
import { is_nothing, the_contradiction } from "./Cell/CellValue";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { for_each } from "./helper";
import { pipe } from "fp-ts/lib/function";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { map as generic_map, filter as generic_filter } from "generic-handler/built_in_generics/generic_array_operation";
force_load_arithmatic();

set_global_state(PublicStateCommand.SET_CELL_MERGE, merge_value_sets)


const x = new Cell("x");
const y = new Cell("y");
const z = new Cell("z"); 




const x2 = new Cell("x2");
const y2 = new Cell("y2");
const z2 = new Cell("z2");

// track_strongest(z).subscribe((value: any) => {
//     console.log("z strongest", to_string(value))
// })

// track_strongest(x).subscribe((value: any) => {
//     console.log("x strongest", to_string(value))
// })

// track_strongest(y).subscribe((value: any) => {
//     console.log("y strongest", to_string(value))
// }) 

// observe_failed_count.subscribe((count: number) => {
//     console.log("failed count", count)
// })


const track_nothing = compose(track_strongest, reactor_filter(is_nothing)) 
const log_strongest = compose(cell_strongest_base_value, console.log)
const log_string = compose(to_string, console.log)




const possibilities = enum_num_set(1, 20)

p_amb(x, possibilities)
p_amb(y, possibilities) 
p_amb(z, possibilities) 

// p_multiply(x, x, x2)
// p_multiply(y, y, y2)
// p_multiply(z, z, z2) 

p_add(x, y, z) 

// //TODO: SEEMS CONTRADICTION IS NOT ACTIVATED


all_results(construct_better_set([x, y, z], to_string), (value: any) => {
    console.log("all results", to_string(value))
})

// execute_all_tasks_sequential((error: Error) => {
//     console.log(error);
// })


// force_failure(construct_better_set([x, y, z], to_string))

// execute_all_tasks_sequential((error: Error) => {
//     console.log(error);
// })

console.log(y.summarize())
console.log(z.summarize())
console.log(x.summarize())





