import { primitive_construct_cell } from "./Cell/Cell";
import { compound_propagator, propagator_id } from "./Propagator/Propagator";
import { p_drop } from "./Propagator/BuiltInProps";
import { update } from "./AdvanceReactivity/interface";
import { execute_all_tasks_sequential } from "./Shared/Scheduler/Scheduler";
import { set_global_state, PublicStateCommand } from "./Shared/PublicState";
import { simple_scheduler } from "./Shared/Scheduler/SimpleScheduler";
import { cell_strongest_base_value } from "./Cell/Cell";

set_global_state(PublicStateCommand.CLEAN_UP);
set_global_state(PublicStateCommand.SET_SCHEDULER, simple_scheduler());
// NO reactive_merge!

const input = primitive_construct_cell<number>("drop_input");
const output = primitive_construct_cell<number>("drop_output");

let dropPropId: string;
let activationCount = 0;

const compound = compound_propagator([input], [output], () => {
    console.log(`Building compound...`);
    const drop = p_drop(2);
    const prop = drop(input, output);
    dropPropId = propagator_id(prop);
}, "compound_with_drop");

console.log("\nUpdate 1:");
update(input, 1);
await execute_all_tasks_sequential(() => {});
console.log(`Output: ${cell_strongest_base_value(output)}`);

console.log("\nUpdate 2:");
update(input, 2);
await execute_all_tasks_sequential(() => {});
console.log(`Output: ${cell_strongest_base_value(output)}`);

console.log("\nUpdate 3:");
update(input, 3);
await execute_all_tasks_sequential(() => {});
console.log(`Output: ${cell_strongest_base_value(output)}`);
