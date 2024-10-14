// import { isNumber } from "effect/Predicate";
import { Cell, test_cell_content } from "./Cell/Cell";
import { do_nothing, monitor_change, observe_cell, tell, tell_value_set } from "./ui";
import { force_load_arithmatic } from "./Cell/GenericArith";
import { c_multiply } from "./BuiltInProps";
import { execute_all_tasks_sequential, steppable_run_task, summarize_scheduler_state } from "./Scheduler";
import { compact } from "fp-ts/lib/Compactable";

force_load_arithmatic();






const log_in_console = observe_cell((str: string) => console.log(str));

monitor_change(do_nothing, log_in_console);

const x = new Cell("x");
const y = new Cell("y");
const product = new Cell("product");






c_multiply(x, y, product);

tell_value_set(x, 8, "fst");


tell_value_set(product, 40, "fst");







execute_all_tasks_sequential(() => {}, () => {
    console.log("done1")
    tell(x, 9, "snd")
    console.log("told x 9")


    for (let i = 0; i < 10; i++){
        console.log(i)
        console.log(summarize_scheduler_state())
        steppable_run_task((e) => {
            console.log("error:", e)
        })
    }
    console.log(summarize_scheduler_state())
})



