import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { construct_simple_object_propagator } from "../ObjectSystem/object_propagator";
import { construct_cell, cell_strongest_base_value, type Cell } from "../Cell/Cell";

import { update } from "../AdvanceReactivity/interface";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { reactive_scheduler } from "../Shared/Scheduler/ReactiveScheduler";
import { set_merge } from "../Cell/Merge";
import { reactive_merge } from "../AdvanceReactivity/traced_timestamp/genericPatch";
import { ce_map } from "../Propagator/BuiltInProps";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_global_state(PublicStateCommand.SET_SCHEDULER, reactive_scheduler());
  set_merge(reactive_merge);
});



describe("construct_simple_object_propagator - Simple Tests", () => {
  test("should create a basic counter propagator", async () => {
    // Simple step function that increments state
    const step = (state: Cell<number>, cmd: Cell<number>) => {
      return ce_map((state: number, cmd: number) => ({
        state: state + cmd
      }))(state, cmd);
    };

    const state = construct_cell<number>("counter");
    const cmd = construct_cell<number>("cmd");
    
    // Initialize state
    update(state, 0);
    
    const propagator = construct_simple_object_propagator(
      "counter",
      step,
      state
    )(cmd);

    // Test basic functionality
    update(cmd, 5);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(state)).toBe(5);

    update(cmd, 3);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(state)).toBe(8);
  });

  test("should handle result cell when provided", async () => {
    // Step function that returns both state and result
    const step = (state: Cell<number>, cmd: Cell<number>) => {
      return ce_map((state: number, cmd: number) => ({
        state: state + cmd,
        result: state + cmd
      }))(state, cmd);
    };

    const state = construct_cell<number>("state");
    const cmd = construct_cell<number>("cmd");
    const result = construct_cell<number>("result");
    
    // Initialize state
    update(state, 0);
    
    const propagator = construct_simple_object_propagator(
      "calculator",
      step,
      state
    )(cmd, result);

    // Test that both state and result are updated
    update(cmd, 10);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(state)).toBe(10);
    expect(cell_strongest_base_value(result)).toBe(10);

    update(cmd, 5);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(state)).toBe(15);
    expect(cell_strongest_base_value(result)).toBe(15);
  });

  test("should work without result cell", async () => {
    // Step function that only updates state
    const step = (state: Cell<number>, cmd: Cell<number>) => {
      return ce_map((state: number, cmd: number) => ({
        state: state + cmd
      }))(state, cmd);
    };

    const state = construct_cell<number>("state");
    const cmd = construct_cell<number>("cmd");
    
    // Initialize state
    update(state, 0);
    
    // Create propagator without result cell
    const propagator = construct_simple_object_propagator(
      "noResultCounter",
      step,
      state
    )(cmd);

    // Should still update state correctly
    update(cmd, 7);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(state)).toBe(7);
  });

  test("should handle string commands", async () => {
    // Step function that interprets string commands
    const step = (state: Cell<number>, cmd: Cell<string>) => {
      return ce_map((state: number, cmd: string) => {
        switch (cmd) {
          case "increment":
            return { state: state + 1 };
          case "decrement":
            return { state: state - 1 };
          case "reset":
            return { state: 0 };
          default:
            return { state };
        }
      })(state, cmd);
    };

    const state = construct_cell<number>("state");
    const cmd = construct_cell<string>("cmd");
    
    // Initialize state
    update(state, 0);
    
    const propagator = construct_simple_object_propagator(
      "stringCommandCounter",
      step,
      state
    )(cmd);

    // Test string commands
    update(cmd, "increment");
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(state)).toBe(1);

    update(cmd, "increment");
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(state)).toBe(2);

    update(cmd, "decrement");
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(state)).toBe(1);

    update(cmd, "reset");
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(state)).toBe(0);
  });
});
