// @ts-nocheck
import { describe, test, expect, beforeEach } from "bun:test";
import { construct_cell, update_cell, cell_content } from "@/cell/Cell";
import { forward } from "../Propagator/HelperProps";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { vector_clock_layer } from "../AdvanceReactivity/victor_clock";
import { construct_better_set, identify_by } from "generic-handler/built_in_generics/generic_better_set";
import { to_array } from "generic-handler/built_in_generics/generic_collection";
import { set_merge } from "@/cell/Merge";
import { merge_patched_set } from "../DataTypes/PatchedValueSet";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { set_scheduler, execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_scheduler(simple_scheduler());
  set_merge(merge_patched_set);
});

describe("forward + Victor Clock integration (independent)", () => {
  test("newer vector clock replaces stale after forward propagation", async () => {
    const a = construct_cell("a_vc_ind");
    const out = construct_cell("out_vc_ind");
    forward([a], [out]);

    const v1 = construct_layered_datum(
      10,
      vector_clock_layer, new Map([["source1", 1]])
    );

    const v3 = construct_layered_datum(
      10,
      vector_clock_layer, new Map([["source1", 3]])
    );

    update_cell(a, v1);
    await execute_all_tasks_sequential(() => {});

    let values = to_array(cell_content(out));
    expect(values.length).toBe(1);
    let vc = vector_clock_layer.get_value(values[0] as any);
    expect(vc.get("source1")).toBe(1);

    update_cell(a, v3);
    await execute_all_tasks_sequential(() => {});

    values = to_array(cell_content(out));
    expect(values.length).toBe(1);
    vc = vector_clock_layer.get_value(values[0] as any);
    expect(vc.get("source1")).toBe(3);
  });
});


