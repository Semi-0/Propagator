import { test, expect, describe, beforeEach } from "bun:test";
import { construct_cell, cell_level } from "../Cell/Cell";
import { construct_propagator, function_to_primitive_propagator, compound_propagator, propagator_level } from "../Propagator/Propagator";
import { get_global_parent, set_global_state, PublicStateCommand, parameterize_parent } from "../Shared/PublicState";
import { make_relation } from "../DataTypes/Relation";
import { set_merge } from "../Cell/Merge";
import { merge_value_sets } from "../DataTypes/ValueSet";
import { set_scheduler } from "../Shared/Scheduler/Scheduler";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";

beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP);
    set_merge(merge_value_sets);
    set_scheduler(simple_scheduler());
});

describe("Actual Abstraction Levels", () => {
    test("root relation level", () => {
        const root = get_global_parent();
        console.log("Root level:", root.get_level());
        // Don't assert, just observe
    });

    test("cell at root level", () => {
        const cell = construct_cell("test");
        console.log("Cell at root:", cell_level(cell));
    });

    test("propagator at root level", () => {
        const input = construct_cell("input");
        const output = construct_cell("output");
        const prop = construct_propagator([input], [output], () => {}, "test");
        console.log("Propagator at root:", propagator_level(prop));
    });

    test("nested items", () => {
        const root = get_global_parent();
        const parentRel = make_relation("parent", root);
        console.log("Parent relation level:", parentRel.get_level());
        
        let nestedCell, nestedProp;
        parameterize_parent(parentRel)(() => {
            nestedCell = construct_cell("nested");
            const input = construct_cell("input");
            const output = construct_cell("output");
            nestedProp = construct_propagator([input], [output], () => {}, "nested_prop");
            console.log("Nested cell:", cell_level(nestedCell));
            console.log("Nested propagator:", propagator_level(nestedProp));
        });
    });
});
