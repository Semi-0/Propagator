import { construct_cell, set_merge } from "ppropogator";
import { p_add } from "../Propagator/BuiltInProps";
import { reactive_tell } from "../Helper/UI";
import { execute_all_tasks_sequential } from "ppropogator";
import { cell_strongest_base_value } from "ppropogator";
import { merge_patched_set } from "../DataTypes/PatchedValueSet";

async function main() {
    set_merge(merge_patched_set);
    const a = construct_cell("a");
    const b = construct_cell("b");
    const sum = construct_cell("sum");
    p_add(a, b, sum);
    await reactive_tell(a, 1);
    await reactive_tell(b, 1);
    execute_all_tasks_sequential(console.error);
    console.log("sum", cell_strongest_base_value(sum));
}

main();
