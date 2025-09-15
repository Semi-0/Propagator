import { describe, it, expect, beforeEach } from "bun:test";
import { construct_cell } from "../Cell/Cell";
import { p_add, p_multiply } from "../Propagator/BuiltInProps";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { set_global_state, PublicStateCommand, cell_snapshot, propagator_snapshot } from "../Shared/PublicState";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";

const hasGC = typeof (globalThis as any).gc === "function";

describe("Auto-GC of cell/propagator chains with weak links", () => {
  beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP);
    set_global_state(PublicStateCommand.SET_SCHEDULER, simple_scheduler());
  });

  it("collects an entire chain when all external refs are dropped", async () => {
    if (!hasGC) return;

    {
      // Create a small chain: a + b -> x; x * b -> y
      let a = construct_cell<number>("a");
      let b = construct_cell<number>("b");
      let x = construct_cell<number>("x");
      let y = construct_cell<number>("y");

      p_add(a, b, x);
      p_multiply(x, b, y);

      a.addContent(2);
      b.addContent(3);
      await execute_all_tasks_sequential(() => {});

      // Drop all strong references
      // @ts-ignore
      a = undefined as any;
      // @ts-ignore
      b = undefined as any;
      // @ts-ignore
      x = undefined as any;
      // @ts-ignore
      y = undefined as any;
    }

    const gc = (globalThis as any).gc as () => void;
    gc(); gc(); gc();
    await new Promise(r => setTimeout(r, 10));
    set_global_state(PublicStateCommand.CLEAN_UP);

    expect(cell_snapshot().length).toBe(0);
    expect(propagator_snapshot().length).toBe(0);
  });
});

