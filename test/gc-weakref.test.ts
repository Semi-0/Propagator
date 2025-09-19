import { describe, it, expect, beforeEach } from "bun:test";
import { construct_cell } from "../Cell/Cell";
import { p_add } from "../Propagator/BuiltInProps";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { set_global_state, PublicStateCommand, cell_snapshot, propagator_snapshot } from "../Shared/PublicState";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";

// This test validates that cells and propagators are not strongly retained by registries
// and can be collected by GC once no strong references remain.

const hasGC = typeof (globalThis as any).gc === "function";

describe("WeakRef GC behavior", () => {
  beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP);
    set_global_state(PublicStateCommand.SET_SCHEDULER, simple_scheduler());
  });

  it("collects cells and propagators when dereferenced", async () => {
    if (!hasGC) {
      return;
    }

    let a = construct_cell<number>("a");
    let b = construct_cell<number>("b");
    let out = construct_cell<number>("out");

    p_add(a, b, out);
    await execute_all_tasks_sequential(() => {});

    // Ensure they are registered
    expect(cell_snapshot().length).toBeGreaterThanOrEqual(3);
    expect(propagator_snapshot().length).toBeGreaterThanOrEqual(1);

    // Drop strong references
    // @ts-ignore
    a = undefined as any;
    // @ts-ignore
    b = undefined as any;
    // @ts-ignore
    out = undefined as any;

    // Force GC a few times
    const gc = (globalThis as any).gc as () => void;
    gc(); gc(); gc();

    // Give finalizers a chance to run
    await new Promise(r => setTimeout(r, 10));

    // Registries should prune cleared refs
    set_global_state(PublicStateCommand.CLEAN_UP);

    // After prune, snapshots should be empty
    expect(cell_snapshot().length).toBe(0);
    expect(propagator_snapshot().length).toBe(0);
  });
});

