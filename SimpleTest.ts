// import { isNumber } from "effect/Predicate";
import { Cell, test_cell_content, track_content, track_strongest } from "./Cell/Cell";
import { force_load_arithmatic } from "./Cell/GenericArith";
import { c_add, c_multiply, p_add, p_multiply } from "./BuiltInProps";
import { configure_log_amb_choose, configure_log_nogoods, configure_log_process_contradictions, p_amb } from "./Search";
import { execute_all_tasks_sequential, steppable_run_task, summarize_scheduler_state } from "./Scheduler";
import { compact } from "fp-ts/lib/Compactable";
import { failed_count, observe_failed_count, PublicStateCommand, set_global_state } from "./PublicState";
import { merge_value_sets } from "./DataTypes/ValueSet";
import { make_better_set } from "generic-handler/built_in_generics/generic_better_set";
import { combine_latest } from "./Reactivity/Reactor";
import { track_premise } from "./DataTypes/Premises";
import { observe_cell } from "./ui";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";

force_load_arithmatic();

set_global_state(PublicStateCommand.SET_CELL_MERGE, merge_value_sets)

// track_premise();

// const log_in_console = observe_cell((str: string) => console.log(str));

// monitor_change(do_nothing, log_in_console);

// observe_failed_count.subscribe((count: number) => {
//     console.log("failed count", count)
// })

// track_premise(); 


configure_log_amb_choose(true);
configure_log_process_contradictions(true);
// configure_log_nogoods(true);

const x = new Cell("x");
const y = new Cell("y");
const z = new Cell("z"); 

// track_strongest(y).subscribe((value: any) => {
//     console.log("x strongest", to_string(value))
// })

// track_content(z).subscribe((value: any) => {
//     console.log("z content", to_string(value))
// })

const x2 = new Cell("x2");
const y2 = new Cell("y2");
const z2 = new Cell("z2");

const possibilities = make_better_set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

p_amb(x, possibilities)
p_amb(y, possibilities) 
p_amb(z, possibilities) 

// p_multiply(x, x, x2)
// p_multiply(y, y, y2)
// p_multiply(z, z, z2) 

p_add(x, y, z) 

//TODO: SEEMS CONTRADICTION IS NOT ACTIVATED

await execute_all_tasks_sequential((error: Error) => {
   throw error;
}).task
