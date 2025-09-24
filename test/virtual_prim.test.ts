import { describe, test, expect, beforeEach } from "bun:test";

import {
  construct_frame,
  frame_with_identity,
  virtual_copy_set_merge,
  v_c_io_unpacking,
  io_function_to_propagator_constructor,
  doit,
  type VirtualCopySet
} from "../VirtualEnvironment/virtual_prim";

import {
  construct_cell,
  cell_strongest_base_value
} from "@/cell/Cell";

import { update } from "../AdvanceReactivity/interface";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { reactive_scheduler } from "../Shared/Scheduler/ReactiveScheduler";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_global_state(PublicStateCommand.SET_SCHEDULER, reactive_scheduler());
});

describe("virtual_prim basics", () => {
  test("virtual_copy_set_merge merges frame-by-frame with custom merge", () => {
    const fid = construct_frame([]);
    const f = frame_with_identity(fid);

    const cs1: VirtualCopySet = new Map([[f.identity, 2]]);
    const cs2: VirtualCopySet = new Map([[f.identity, 3]]);

    const merge = virtual_copy_set_merge((a: number, b: number) => a + b);
    const result = merge(cs1, cs2);

    expect(result.get(f.identity)).toBe(5);
  });

  test("v_c_io_unpacking anchors output to occurring parent when present", () => {
    const pid = construct_frame([]);
    const parent = frame_with_identity(pid);
    const cid = construct_frame([parent]);
    const child = frame_with_identity(cid);

    const a: VirtualCopySet = new Map([[child.identity, 10]]);
    const b: VirtualCopySet = new Map([[child.identity, 7]]);
    const outputAnchor: VirtualCopySet = new Map([[parent.identity, "anchor"]]);

    const sum = v_c_io_unpacking((x: number, y: number) => x + y);
    const out = sum(a, b, outputAnchor);

    expect(out.get(parent.identity)).toBe(17);
    expect(out.has(child.identity)).toBe(false);
  });

  test("io_function_to_propagator_constructor wires a simple sum", async () => {
    const a = construct_cell<number>("a");
    const b = construct_cell<number>("b");
    const out = construct_cell<number>("out");

    const sumCtor = io_function_to_propagator_constructor(
      "sum",
      (x: number, y: number) => x + y
    );
    sumCtor(a, b, out);

    update(a, 4);
    update(b, 6);
    await execute_all_tasks_sequential(() => {});

    expect(cell_strongest_base_value(out)).toBe(10);
  });

  test("doit short-circuits the_nothing and otherwise behaves like plain f", async () => {
    const a = construct_cell<number>("a2");
    const b = construct_cell<number>("b2");
    const out = construct_cell<number>("out2");

    const sumCtor = doit("sum2", (x: number, y: number) => x + y);
    sumCtor(a, b, out);

    update(a, 1);
    update(b, 2);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(out)).toBe(3);
  });
});


