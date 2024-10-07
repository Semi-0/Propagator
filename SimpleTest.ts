// import { isNumber } from "effect/Predicate";
import { Cell } from "./Cell/Cell";
import { do_nothing, monitor_change, observe_cell, tell } from "./ui";
import { force_load_arithmatic } from "./Cell/GenericArith";
import { c_multiply } from "./BuiltInProps";
import { execute_all_tasks_sequential, steppable_run_task } from "./Scheduler";

force_load_arithmatic();






// const log_in_console = observe_cell((str: string) => console.log(str));

// monitor_change(do_nothing, log_in_console);

const x = new Cell("x");
const y = new Cell("y");
const product = new Cell("product");






c_multiply(x, y, product);

tell(x, 8, "fst");

tell(product, 40, "fst");









// execute_all_tasks_sequential(() => {}, () => {
//     console.log("done")
// })



