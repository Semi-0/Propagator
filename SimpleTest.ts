// import { isNumber } from "effect/Predicate";
import { Cell, cell_strongest_base_value, test_cell_content, track_content, track_strongest } from "./Cell/Cell";
import { force_load_arithmatic } from "./Cell/GenericArith";
import { c_add, c_multiply, p_add, p_divide, p_multiply, p_not, p_subtract } from "./BuiltInProps";
import { binary_amb, configure_log_amb_choose, configure_log_nogoods, configure_log_process_contradictions, p_amb } from "./Search";
import { configure_trace_scheduler, configure_trace_scheduler_state_updates, execute_all_tasks_sequential, execute_all_tasks_simultaneous, steppable_run_task, summarize_scheduler_state } from "./Scheduler";
import { compact } from "fp-ts/lib/Compactable";
import { failed_count, observe_failed_count, PublicStateCommand, set_global_state } from "./PublicState";
import { merge_value_sets } from "./DataTypes/ValueSet";
import { is_better_set, make_better_set, set_get_length, set_map, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { combine_latest } from "./Reactivity/Reactor";
import { _premises_metadata, is_premises_in, track_premise } from "./DataTypes/Premises";
import { observe_cell, tell } from "./ui";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { set_trace_merge } from "./Cell/Merge";
import { filter as reactor_filter } from "./Reactivity/Reactor"
import { is_nothing } from "./Cell/CellValue";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { for_each } from "./helper";
import { pipe } from "fp-ts/lib/function";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { map as generic_map, filter as generic_filter } from "generic-handler/built_in_generics/generic_array_operation";
force_load_arithmatic();

set_global_state(PublicStateCommand.SET_CELL_MERGE, merge_value_sets)
// set_trace_merge(true)

// track_premise();

// // const log_in_console = observe_cell((str: string) => console.log(str));

// // monitor_change(do_nothing, log_in_console);

// // observe_failed_count.subscribe((count: number) => {
// //     console.log("failed count", count)
// // })

// // track_premise(); 

// configure_log_nogoods(true);
// configure_log_amb_choose(true);
// configure_log_process_contradictions(true);
// configure_trace_scheduler_state_updates(true);
// // configure_log_nogoods(true);

const x = new Cell("x");
const y = new Cell("y");
const z = new Cell("z"); 


// const amb1 = binary_amb(x)

// const amb2 = binary_amb(y)

// p_not(x, y)

// execute_all_tasks_sequential((e) => {
//     throw e;
// })
// console.log(y.summarize())
// console.log(y.summarize())

// console.log(summarize_scheduler_state())





const x2 = new Cell("x2");
const y2 = new Cell("y2");
const z2 = new Cell("z2");

track_strongest(z).subscribe((value: any) => {
    console.log("z strongest", to_string(value))
})

track_strongest(x).subscribe((value: any) => {
    console.log("x strongest", to_string(value))
})

track_strongest(y).subscribe((value: any) => {
    console.log("y strongest", to_string(value))
}) 

observe_failed_count.subscribe((count: number) => {
    console.log("failed count", count)
})


const track_nothing = compose(track_strongest, reactor_filter(is_nothing)) 
const log_strongest = compose(cell_strongest_base_value, console.log)
const log_string = compose(to_string, console.log)
// track_nothing(z2).subscribe((v) => {
//     console.log("find nothing:" + v)
//     log_strongest(z2)
//     log_strongest(z)
//     log_strongest(x2)
//     log_strongest(y2)
// })



// track_content(z2).subscribe((value: any) => {
//     console.log("z", to_string(value))
// })

// track_strongest(x2).subscribe((value: any) => {
//     console.log("x2", to_string(value))
// })

// track_strongest(y2).subscribe((value: any) => {
//     console.log("y2", to_string(value))
// })

// track_strongest(z2).subscribe((value: any) => {
//     console.log("z2", to_string(value))
// })
// track_content(z).subscribe((value: any) => {
//     console.log("z content", to_string(value))
// })

const possibilities = make_better_set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

p_amb(x, possibilities)
p_amb(y, possibilities) 
p_amb(z, possibilities) 

p_multiply(x, x, x2)
p_multiply(y, y, y2)
p_multiply(z, z, z2) 

p_add(x2, y2, z2) 

// //TODO: SEEMS CONTRADICTION IS NOT ACTIVATED

execute_all_tasks_sequential((error: Error) => {
    console.log(error);
})



// const get_no_goods = compose(get_support_layer_value, )

// const no_goods = pipe(z.getContent().get_value(),
//     (v) => generic_map(v, get_support_layer_value),
//     (v) => generic_map(v, (value: any) => set_map(value, (se: any) => _premises_metadata(se).get_no_goods()))) 


// console.log("content", to_string(z.getContent().get_value()))
// console.log("no goods", to_string(no_goods))
// console.log(y.summarize())
// console.log(y2.summarize())
console.log(y.summarize())
console.log(z.summarize())
console.log(x.summarize())





