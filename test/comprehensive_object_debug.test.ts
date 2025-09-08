import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { 
  ce_eq, ce_and, ce_not, ce_gate, ce_collect_defined, ce_maxN
} from "../ObjectSystem/comprehensive_object";
import { construct_cell, cell_strongest_base_value, type Cell } from "../Cell/Cell";
import { r_constant, the_nothing } from "..";
import { tell } from "../Helper/UI";
import { update } from "../AdvanceReactivity/interface";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { reactive_scheduler } from "../Shared/Scheduler/ReactiveScheduler";
import { set_merge } from "../Cell/Merge";
import { reactive_merge } from "../AdvanceReactivity/traced_timestamp/genericPatch";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_global_state(PublicStateCommand.SET_SCHEDULER, reactive_scheduler());
  set_merge(reactive_merge);
});

afterEach(async () => {
  await execute_all_tasks_sequential(() => {});
});

describe("CE Helper Debug Tests", () => {
  test("ce_eq should propagate changes correctly", async () => {
    const a = construct_cell<string>("a");
    const b = construct_cell<string>("b");
    
    const result = ce_eq(a, b);
    
    // Initial state
    update(a, "hello");
    update(b, "hello");
    
    await execute_all_tasks_sequential(() => {});
    console.log("Initial result:", cell_strongest_base_value(result));
    expect(cell_strongest_base_value(result)).toBe(true);
    
    // Change b to different value
    update(b, "world");
    
    await execute_all_tasks_sequential(() => {});
    console.log("After change result:", cell_strongest_base_value(result));
    expect(cell_strongest_base_value(result)).toBe(false);
  });

  test("ce_and should propagate changes correctly", async () => {
    const a = construct_cell<boolean>("a");
    const b = construct_cell<boolean>("b");
    
    const result = ce_and(a, b);
    
    // Initial state
    update(a, true);
    update(b, true);
    
    await execute_all_tasks_sequential(() => {});
    console.log("Initial result:", cell_strongest_base_value(result));
    expect(cell_strongest_base_value(result)).toBe(true);
    
    // Change b to false
    update(b, false);
    
    await execute_all_tasks_sequential(() => {});
    console.log("After change result:", cell_strongest_base_value(result));
    expect(cell_strongest_base_value(result)).toBe(false);
  });

  test("ce_not should propagate changes correctly", async () => {
    const a = construct_cell<boolean>("a");
    
    const result = ce_not(a);
    
    // Initial state
    update(a, true);
    
    await execute_all_tasks_sequential(() => {});
    console.log("Initial result:", cell_strongest_base_value(result));
    expect(cell_strongest_base_value(result)).toBe(false);
    
    // Change a to false
    update(a, false);
    
    await execute_all_tasks_sequential(() => {});
    console.log("After change result:", cell_strongest_base_value(result));
    expect(cell_strongest_base_value(result)).toBe(true);
  });

  test("ce_gate should propagate changes correctly", async () => {
    const on = construct_cell<boolean>("on");
    const value = construct_cell<string>("value");
    
    const result = ce_gate(on, value);
    
    // Initial state - set condition to false first, then value
    update(on, false);
    update(value, "hello");
    
    await execute_all_tasks_sequential(() => {});
    console.log("Initial result:", cell_strongest_base_value(result));
    expect(cell_strongest_base_value(result)).toBe(the_nothing);
    
    // Change on to true
    update(on, true);
    
    await execute_all_tasks_sequential(() => {});
    console.log("After change result:", cell_strongest_base_value(result));
    expect(cell_strongest_base_value(result)).toBe("hello");
  });
}); 