// @ts-nocheck
import { expect, test, beforeEach, describe } from "bun:test";

import { forward, apply_propagator, l_apply_propagator, apply_subnet } from "../Propagator/HelperProps";
import { construct_cell, type Cell } from "../Cell/Cell";
import { construct_propagator, type Propagator } from "../Propagator/Propagator";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { set_scheduler, execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";
import { get_base_value } from "sando-layer/Basic/Layer";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_scheduler(simple_scheduler());
});

describe("Propagator helper utilities", () => {
  test("forward constructs a propagator and pairs inputs to outputs", async () => {
    const a = construct_cell("a");
    const b = construct_cell("b");
    const outA = construct_cell("outA");
    const outB = construct_cell("outB");

    const prop = forward([a, b], [outA, outB]);
    expect(prop).toBeDefined();
    expect(typeof prop.getName).toBe("function");
    expect(prop.getInputs().length).toBe(2);
    expect(prop.getOutputs().length).toBe(2);
  });

  test("apply_propagator applies a constructor to inputs/outputs", async () => {
    const x = construct_cell("x");
    const y = construct_cell("y");
    const z = construct_cell("z");

    const ctor = (...cells: Cell<any>[]): Propagator => {
      const ins = cells.slice(0, -1) as Cell<any>[];
      const out = cells[cells.length - 1] as Cell<any>;
      return construct_propagator(ins, [out], () => {}, "dummy_ctor");
    };

    const p = apply_propagator(ctor, [x, y], [z]);
    expect(p.getName()).toBe("dummy_ctor");
    expect(p.getInputs().length).toBe(2);
    expect(p.getOutputs().length).toBe(1);
  });

  test("l_apply_propagator delegates to apply_propagator for base values", async () => {
    const x = construct_cell("x");
    const y = construct_cell("y");
    const z = construct_cell("z");

    const ctor = (...cells: Cell<any>[]): Propagator => {
      const ins = cells.slice(0, -1) as Cell<any>[];
      const out = cells[cells.length - 1] as Cell<any>;
      return construct_propagator(ins, [out], () => {}, "layer_dummy");
    };

    const layered = l_apply_propagator(ctor, [x, y], [z]);
    const p = get_base_value(layered);
    expect(p.getName()).toBe("layer_dummy");
    expect(p.getInputs().length).toBe(2);
    expect(p.getOutputs().length).toBe(1);
  });

  test("apply_subnet constructs and activates without errors when subnet unset", async () => {
    const subnetCell = construct_cell<(...cells: Cell<any>[]) => Propagator>("subnet");
    const a = construct_cell("a");
    const b = construct_cell("b");
    const out = construct_cell("out");

    const wrapper = apply_subnet(subnetCell, [a, b], [out]);
    expect(wrapper).toBeDefined();
    // Should not throw on activation when subnet is not yet set
    wrapper.activate();
    await execute_all_tasks_sequential(() => {});
  });
});


