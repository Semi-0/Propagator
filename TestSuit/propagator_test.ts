import { test, expect } from "bun:test";
import type { Propagator } from "../Propagator/Propagator";
import type { Cell } from "../Cell/Cell";
import { register_predicate } from "generic-handler/Predicates";
import { cell_name, construct_cell, construct_propagator, execute_all_tasks_sequential, PublicStateCommand, set_global_state, set_merge } from "ppropogator";
import { merge_patched_set } from "../DataTypes/PatchedValueSet";
import { replay_propagators, set_record_alerted_propagator, set_traced_scheduler } from "ppropogator/Shared/Scheduler/Scheduler";
import { describe_propagator_frame } from "../Shared/Scheduler/RuntimeFrame";
import { reactive_tell } from "../Helper/UI";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { cell_strongest_base_value } from "ppropogator";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { layered_apply } from "../Helper/Helper";
import { pipe } from "fp-ts/lib/function";
import { curried_map } from "../Helper/Helper";
import { to_array } from "generic-handler/built_in_generics/generic_collection";
import { Current_Scheduler } from "ppropogator";
import { merge_temporary_value_set } from "../DataTypes/TemporaryValueSet";
import { p_reactive_dispatch, source_cell, update_source_cell } from "../DataTypes/Premises_Source";
export type TestAssessor = {
    category: "input" | "output" | "scheduler" | "replay_scheduler" | "merge_plan" | "trace_scheduler";
    fn: (...args: any[]) => any;
    label?: string;
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
        },
        label: name,
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

export const output_accessor: (name: string, access: (cell: Cell<any>) => boolean) => TestAssessor = (name: string, access: (cell: Cell<any>) => boolean) => {
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
        },
        label: name,
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
    },
    label: "scheduler",
}

export const is_run_scheduler = register_predicate("is_run_scheduler", (value: TestAssessor) => value.category === "scheduler");

export const run_replay_scheduler : TestAssessor = {
    category: "replay_scheduler",
    fn: (env: Map<string, Cell<any>>) => {
        return true;
    },
    label: "replay_scheduler",
}



export const is_run_replay_scheduler = register_predicate("is_run_replay_scheduler", (value: TestAssessor) => value.category === "replay_scheduler");

export const is_scheduler_plan = register_predicate("is_scheduler_plan", (value: any) => is_run_scheduler(value) || is_run_replay_scheduler(value));


export const is_merge_plan = register_predicate("is_merge_plan", (value: any) => value.category === "merge_plan");

export const merge_plan : (merge_plan: (content: any, increment: any) => any) => TestAssessor = (merge_plan: (content: any, increment: any) => any) => {
    return {
        category: "merge_plan",
        fn: () => {
            return merge_plan;
        },
        label: "merge_plan",
    }
}

export const is_trace_scheduler = register_predicate("is_trace_scheduler", (value: any) => value.category === "trace_scheduler");



/**
 * Creates a TestAssessor that sets up a traced scheduler for debugging
 * 
 * @param logger - Function to log scheduler operations (defaults to console.log)
 * @returns TestAssessor that can be used in test configurations
 * 
 * @example
 * test_propagator(
 *   "my test",
 *   myPropagator,
 *   ["A", "B"],
 *   [
 *     trace_scheduler_assessor(console.log), // Trace all scheduler operations
 *     r_i(100, "A"),
 *     r_o(200, "B")
 *   ]
 * )
 */
export const trace_scheduler_assessor: (logger?: (log: string) => void) => TestAssessor = (logger: (log: string) => void = console.log) => {
    return {
        category: "trace_scheduler",
        fn: () => {
            set_traced_scheduler(logger, Current_Scheduler);
            return true;
        },
        label: "trace_scheduler",
    }
}

/**
 * Sets up a traced scheduler for debugging test execution
 * This is a convenience function that can be called directly in tests
 * 
 * @param logger - Function to log scheduler operations (defaults to console.log)
 * 
 * @example
 * test("my test", () => {
 *   set_scheduler_traceable(console.log);
 *   // ... test code ...
 * })
 */
export const set_scheduler_traceable = (logger: (log: string) => void = console.log) => {
    set_traced_scheduler(logger);
}

export const describe_env = (env: Map<string, Cell<any>>) => {
    return Array.from(env.values()).map((cell: Cell<any>) => cell.summarize()).join(", \n");
}

const accessor_label = (assessor: TestAssessor, index: number): string =>
    assessor.label ?? `output[${index}]`;

const assert_output_with_env = (
    envDescription: string,
    expectation: string,
    assessor: TestAssessor,
    index: number,
    result: boolean
) => {
    try {
        expect(result).toBe(true);
    }
    catch (error) {
        if (error instanceof Error) {
            error.message = [
                error.message,
                `Accessor: ${accessor_label(assessor, index)}` ,
                `Expectation: ${expectation}`,
                "Environment Snapshot:",
                envDescription,
            ].join("\n");
        }
        throw error;
    }
};

export const assess = async (
    env: Map<string, Cell<any>>,
    input_accessors: TestAssessor[],
    output_accessors: TestAssessor[],
    run_scheduler: () => void | Promise<void>,
) => {
    for (const input_accessor of input_accessors) {
        await inject_input(env, input_accessor);
    }

    await Promise.resolve(run_scheduler());

    const env_description = describe_env(env);
    const expectations = output_accessors.map((output_accessor) => output_accessor.label);
    for (const [index, output_accessor] of output_accessors.entries()) {
        const result = await examine_output(env, output_accessor);
        assert_output_with_env(env_description, expectations[index] ?? "", output_accessor, index, result);
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

var source = source_cell("test_source")

export const test_propagator_constructor = (testor: (description: string, test: (...args: any[]) => void | Promise<void>) => void, merge_plan: (content: any, increment: any) => any = merge_temporary_value_set) => (
    description: string,
    constructor: (...args: Cell<any>[]) => Propagator | void,
    cell_names: string[],
    // env_setup: TestAssessor[] = [],
    ...assesors: TestAssessor[][]
) => {
    testor(description, async () => {
        set_global_state(PublicStateCommand.CLEAN_UP);

        // const trace_scheduler_assessors = env_setup.filter(is_trace_scheduler);
        // if (trace_scheduler_assessors.length > 0) {
        //     trace_scheduler_assessors[0].fn();
        // }
        // const merge_plan_assessors = env_setup.filter(is_merge_plan);
        // if (merge_plan_assessors.length > 0) {
        //     set_merge(merge_plan_assessors[0].fn());
        // }

        const env = pop_cell_env(cell_names);
        source.dispose()
        source = source_cell("test_source")
        
        var propagator = constructor(...env.values());
        for (const assessor of assesors) {

            const trace_scheduler_assessors = assessor.filter(is_trace_scheduler);
            if (trace_scheduler_assessors.length > 0) {
                trace_scheduler_assessors[0].fn();
            }
            const merge_plan_assessors = assessor.filter(is_merge_plan);
            if (merge_plan_assessors.length > 0) {
                set_merge(merge_plan_assessors[0].fn());
            }
            else {
                set_merge(merge_patched_set) // default merge plan is merge_patched_set
            }

            const assesor_inputs = assessor.filter(is_input_accessor);
            const assesor_outputs = assessor.filter(is_output_accessor);
            const scheduler_plan = assessor.filter(is_scheduler_plan);

            await assess(
                env,
                assesor_inputs,
                assesor_outputs,
                translate_scheduler_plan(scheduler_plan),
            );

       
        }
    });
};

export const test_propagator = test_propagator_constructor(test)

export const test_propagator_only = test_propagator_constructor(test.only)

export const test_propagator_only_with_merge_plan = (merge_plan: (content: any, increment: any) => any) => test_propagator_constructor(test.only, merge_plan)

export const reactive_input = (value: any, name: string) =>
    input_accessor(name, async (cell: Cell<any>) => {
        p_reactive_dispatch(source, cell)
        update_source_cell(source, new Map([[cell, value]]))
        return true;
    });

export const r_i =  reactive_input

export const reactive_output = (value: any, name: string) => output_accessor(name, (cell: Cell<any>) => is_equal(cell_strongest_base_value(cell), value))

export const r_o = reactive_output