// import { isNumber } from "effect/Predicate";
import { cell_content, cell_content_value, cell_strongest, cell_strongest_base_value, construct_cell, type Cell  } from "./Cell/Cell";
import { force_load_arithmatic } from "./Cell/GenericArith";
import { c_add, c_multiply, c_subtract, p_add, p_divide, p_multiply, p_not, p_subtract, p_switcher } from "./Propagator/BuiltInProps";
import { binary_amb, configure_log_amb_choose, configure_log_nogoods, configure_log_process_contradictions, p_amb } from "./Propagator/Search";
import { configure_trace_scheduler, configure_trace_scheduler_state_updates, execute_all_tasks_sequential, execute_all_tasks_simultaneous, steppable_run_task, summarize_scheduler_state } from "./Shared/Reactivity/Scheduler";
import { compact } from "fp-ts/lib/Compactable";
import {  failed_count, observe_failed_count, PublicStateCommand, set_global_state } from "./Shared/PublicState";
import { merge_value_sets } from "./DataTypes/ValueSet";
import { construct_better_set, is_better_set, make_better_set, set_get_length, set_map, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { combine_latest } from "./Shared/Reactivity/Reactor";
import { _premises_metadata, is_premises_in, track_premise } from "./DataTypes/Premises";
import { all_results, enum_num_set, force_failure, observe_cell, tell } from "./Helper/UI";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { generic_merge, set_merge, set_trace_merge } from "./Cell/Merge";
import { filter as reactor_filter } from "./Shared/Reactivity/Reactor"
import { is_nothing, the_contradiction } from "./Cell/CellValue";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { for_each } from "./Helper/Helper";
import { pipe } from "fp-ts/lib/function";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { map as generic_map, filter as generic_filter } from "generic-handler/built_in_generics/generic_array_operation";
import { all_match, register_predicate } from "generic-handler/Predicates";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { add } from "generic-handler/built_in_generics/generic_arithmetic";
import { is_layered_object } from "sando-layer/Basic/LayeredObject";
import { get_base_value } from "sando-layer/Basic/Layer";
force_load_arithmatic();

set_global_state(PublicStateCommand.SET_CELL_MERGE, merge_value_sets)


import { f_add, f_equal, f_less_than, f_subtract, f_switch } from "./Propagator/Sugar";
import { socket_IO_client_cell } from "./Cell/RemoteCell/SocketClientCell";
// TODO:
//1.arrays
//2.constraint programming with partial data still not work
// or is it suppose to work?


set_global_state(PublicStateCommand.CLEAN_UP)
set_trace_merge(true)
set_merge(merge_value_sets)

const a = construct_cell("a");
const b = construct_cell("b");
const c = construct_cell("c");

const c_r = await socket_IO_client_cell("c_r", "145.49.78.35", 9021)
const c_r2 = await socket_IO_client_cell("c_r1", "145.49.78.35", 2043)

c_multiply(a, b, c)
c_multiply(c, b, c_r)
c_multiply(c, a, c_r2)
tell(a, 10, "fst")
tell(b, 3, "3st")
// tell(c, make_partial_data(5), "3st")


cell_strongest(a).subscribe((value: any) => {
    console.log("a strongest", to_string(value))
})


cell_strongest(b).subscribe((value: any) => {
    console.log("b strongest", to_string(value))
})


execute_all_tasks_sequential((e) => {})

console.log(c.summarize())

c_r.dispose()
c_r2.dispose()


// tell(c, make_partial_data(4), "fst")

// const x = construct_cell("x");
// const y = construct_cell("y");
// const z = construct_cell("z"); 

// p_add(x, y, z)

// tell(x, make_partial_data(1), "fst")
// tell(y, make_partial_data(2), "snd")


// execute_all_tasks_sequential((e) => {})

// console.log(cell_strongest_base_value(z))

// tell(x, make_partial_data(3), "3st")

// execute_all_tasks_sequential((e) => {})

// tell(x,  make_partial_data(5), "ast")

// execute_all_tasks_sequential((e) => {})

// console.log(to_string(cell_content_value(z)))

// const x2 = construct_cell("x2");
// const y2 = construct_cell("y2");
// const z2 = construct_cell("z2");

// // track_strongest(z).subscribe((value: any) => {
// //     console.log("z strongest", to_string(value))
// // })

// // track_strongest(x).subscribe((value: any) => {
// //     console.log("x strongest", to_string(value))
// // })



// // observe_failed_count.subscribe((count: number) => {
// //     console.log("failed count", count)
// // })


// const track_nothing = compose(cell_strongest, reactor_filter(is_nothing)) 
// const log_strongest = compose(cell_strongest_base_value, console.log)
// const log_string = compose(to_string, console.log)




// const possibilities = enum_num_set(1, 20)

// p_amb(x, possibilities)
// p_amb(y, possibilities) 
// p_amb(z, possibilities) 

// p_multiply(x, x, x2)
// p_multiply(y, y, y2)
// p_multiply(z, z, z2) 

// p_add(x2, y2, z2) 

// // //TODO: SEEMS CONTRADICTION IS NOT ACTIVATED


// all_results(construct_better_set([x, y, z], to_string), (value: any) => {
//     console.log("all results", to_string(value))
//     console.log("failed count", failed_count.get_value())
// })

// // execute_all_tasks_sequential((error: Error) => {
// //     console.log(error);
// // })


// // force_failure(construct_better_set([x, y, z], to_string))

// // execute_all_tasks_sequential((error: Error) => {
// //     console.log(error);
// // })

// console.log(y.summarize())
// console.log(z.summarize())
// console.log(x.summarize())



