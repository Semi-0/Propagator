import { test, expect } from "bun:test";
import type { Propagator } from "../Propagator/Propagator";
import type { Cell } from "../Cell/Cell";
import { register_predicate } from "generic-handler/Predicates";
import { construct_cell, execute_all_tasks_sequential, PublicStateCommand, set_global_state, set_merge } from "ppropogator";
import { merge_patched_set } from "../DataTypes/PatchedValueSet";
import { replay_propagators, set_record_alerted_propagator } from "ppropogator/Shared/Scheduler/Scheduler";
import { describe_propagator_frame } from "../Shared/Scheduler/RuntimeFrame";
import { reactive_tell } from "../Helper/UI";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { cell_strongest_base_value } from "ppropogator";

export type TestAssessor = {
    category: "input" | "output" | "scheduler" | "replay_scheduler";
    fn: (env: Map<string, Cell<any>>) => boolean | Promise<boolean>;
};

export const input_accessor: (name: string, inject: (cell: Cell<any>) => boolean | Promise<boolean>) => TestAssessor = (name: string, inject: (cell: Cell<any>) => boolean | Promise<boolean>) => {
    return {
        category: "input",
        fn: async (env: Map<string, Cell<any>>) => {
            const cell = env.get(name);
            if (cell) {
                await inject(cell);

                return true;
            }
            else {
                throw new Error(`Cell ${name} not found`);
            }
        }
    }
}

export const is_input_accessor = register_predicate("is_input_accessor", (value: TestAssessor) => value.category === "input");

export const inject_input = (env: Map<string, Cell<any>>, accessor: TestAssessor) => {
    if (is_input_accessor(accessor)) {
        return accessor.fn(env)
    }
    else {
        throw new Error(`Invalid accessor`);
        return false;
    }
}

export const output_accessor: (name: string, access: (cell: Cell<any>) => boolean | Promise<boolean>) => TestAssessor = (name: string, access: (cell: Cell<any>) => boolean | Promise<boolean>) => {
    return {
        category: "output",
        fn: async (env: Map<string, Cell<any>>) => {
            const cell = env.get(name);
            if (cell) {
                return access(cell);
            }
            else {
                throw new Error(`Cell ${name} not found`);
            }
        }
    }
}

export const examine_output = (env: Map<string, Cell<any>>, accessor: TestAssessor) => {
    if (is_output_accessor(accessor)) {
        return accessor.fn(env)
    }
    else {
        throw new Error(`Invalid accessor`);
    }
}

export const is_output_accessor = register_predicate("is_output_accessor", (value: TestAssessor) => value.category === "output");

export const run_scheduler : TestAssessor = {
    category: "scheduler",
    fn: (env: Map<string, Cell<any>>) => {
        return true;
    }
}

export const is_run_scheduler = register_predicate("is_run_scheduler", (value: TestAssessor) => value.category === "scheduler");

export const run_replay_scheduler : TestAssessor = {
    category: "replay_scheduler",
    fn: (env: Map<string, Cell<any>>) => {
        return true;
    }
}

export const is_run_replay_scheduler = register_predicate("is_run_replay_scheduler", (value: TestAssessor) => value.category === "replay_scheduler");

export const is_scheduler_plan = register_predicate("is_scheduler_plan", (value: any) => is_run_scheduler(value) || is_run_replay_scheduler(value));



export const assess = async (
    _propagator: Propagator,
    env: Map<string, Cell<any>>,
    input_accessors: TestAssessor[],
    output_accessors: TestAssessor[],
    run_scheduler: () => void | Promise<void>,
    merge_plan: (content: any, increment: any) => any = merge_patched_set
) => {
    set_merge(merge_plan);

    for (const input_accessor of input_accessors) {
        await inject_input(env, input_accessor);
    }

    await Promise.resolve(run_scheduler());

    for (const output_accessor of output_accessors) {
        const result = await examine_output(env, output_accessor);
        // to do compare result list with expected list
        expect(result).toBe(true);
    }
};




export const translate_scheduler_plan = (scheduler_plan: TestAssessor[]) => {
    if (scheduler_plan.length == 1) {
        const plan = scheduler_plan[0];
        if (is_run_scheduler(plan)) {
            return () => execute_all_tasks_sequential(console.error);
        }
        else if (is_run_replay_scheduler(plan)) {

            return () => {
                set_record_alerted_propagator(true);
                execute_all_tasks_sequential(console.error);
                replay_propagators((frame) => {
                    console.log(describe_propagator_frame(frame));
                });
            }
        }
        else {
            throw new Error(`Invalid scheduler plan`);
        }
    }
    else if (scheduler_plan.length == 0) {
        return () => execute_all_tasks_sequential(console.error);

    }
    else {
        throw new Error(`Scheduler plan must have exactly one element`);
    }
}

export const pop_cell_env = (cell_names: string[]) => {
    const cells = new Map<string, Cell<any>>();
    for (const cell_name of cell_names) {
        cells.set(cell_name, construct_cell(cell_name));
    }
    return cells;
}

export const test_propagator_constructor = (testor: (description: string, test: (...args: any[]) => void | Promise<void>) => void) => (
    description: string,
    constructor: (...args: Cell<any>[]) => Propagator,
    cell_names: string[],
    ...assesors: TestAssessor[][]
) => {
    testor(description, async () => {
        for (const assessor of assesors) {
            set_global_state(PublicStateCommand.CLEAN_UP);
            set_merge(merge_patched_set);

            const env = pop_cell_env(cell_names);
            const propagator = constructor(...env.values());

            const assesor_inputs = assessor.filter(is_input_accessor);
            const assesor_outputs = assessor.filter(is_output_accessor);
            const scheduler_plan = assessor.filter(is_scheduler_plan);

            await assess(
                propagator,
                env,
                assesor_inputs,
                assesor_outputs,
                translate_scheduler_plan(scheduler_plan)
            );
        }
    });
};

export const test_propagator = test_propagator_constructor(test)

export const test_propagator_only = test_propagator_constructor(test.only)

export const reactive_input = (value: any, name: string) =>
    input_accessor(name, async (cell: Cell<any>) => {
        await reactive_tell(cell, value);
        return true;
    });

export const r_i =  reactive_input

export const reactive_output = (value: any, name: string) => output_accessor(name, (cell: Cell<any>) => is_equal(cell_strongest_base_value(cell), value))

export const r_o = reactive_output