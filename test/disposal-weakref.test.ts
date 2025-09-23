import { describe, it, expect, beforeEach } from "bun:test";
import { construct_cell, cell_strongest_base_value, cell_dispose } from "../Cell/Cell";
import { p_add } from "../Propagator/BuiltInProps";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";
import { the_nothing } from "../Cell/CellValue";

describe("Disposal behavior under weak-ref mode", () => {
  beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP);
    set_global_state(PublicStateCommand.SET_SCHEDULER, simple_scheduler());
  });

  it("disposal breaks links but does not force disposed values", async () => {
    const a = construct_cell<number>("a");
    const b = construct_cell<number>("b");
    const out = construct_cell<number>("out");

    p_add(a, b, out);
    a.addContent(2);
    b.addContent(3);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(out)).toBe(5);

    cell_dispose(a);
    await execute_all_tasks_sequential(() => {});

    // Under weak mode, we do not inject disposed values; output may remain last value or nothing
    const v = cell_strongest_base_value(out);
    expect(v === 5 || v === the_nothing).toBe(true);
  });
});

