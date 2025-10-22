import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { 
  createVirtualOutputs, createShadowEnvs, shallowMergeEnv, toEnvCell
} from "../ObjectSystem/comprehensive_object";
import { primitive_construct_cell, make_temp_cell, cell_strongest_base_value, type Cell } from "../Cell/Cell";
import { r_constant, the_nothing } from "..";
import { tell } from "../Helper/UI";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { set_global_state } from "../Shared/PublicState";
import { PublicStateCommand } from "../Shared/PublicState";
import { set_scheduler } from "../Shared/Scheduler/Scheduler";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_scheduler(simple_scheduler());
});

afterEach(async () => {
  await execute_all_tasks_sequential(() => {});
});

describe("Basic Comprehensive Object Functions", () => {
  test("createVirtualOutputs should create correct number of outputs", () => {
    const vOuts = createVirtualOutputs(3, 2);
    
    expect(vOuts.length).toBe(3);
    expect(vOuts[0].length).toBe(2);
    expect(vOuts[1].length).toBe(2);
    expect(vOuts[2].length).toBe(2);
  });

  test("shallowMergeEnv should merge environments correctly", () => {
    const env1 = new Map([["key1", "value1"], ["key2", "value2"]]);
    const env2 = new Map([["key2", "newValue2"], ["key3", "value3"]]);
    
    const result = shallowMergeEnv(env1, { env: env2, intensity: 1, index: 0 });
    
    expect(result?.get("key1")).toBe("value1");
    expect(result?.get("key2")).toBe("newValue2");
    expect(result?.get("key3")).toBe("value3");
  });

  test("toEnvCell should convert different env types", () => {
    // Test with Map
    const mapEnv = new Map([["key1", "value1"]]);
    const mapCell = toEnvCell(mapEnv);
    expect(cell_strongest_base_value(mapCell).get("key1")).toBe("value1");
    
    // Test with Record
    const recordEnv = { key1: "value1", key2: "value2" };
    const recordCell = toEnvCell(recordEnv);
    expect(cell_strongest_base_value(recordCell).get("key1")).toBe("value1");
    expect(cell_strongest_base_value(recordCell).get("key2")).toBe("value2");
    
    // Test with existing Cell - should return the same cell
    const existingCell = primitive_construct_cell<Map<string, any>>("existing");
    tell(existingCell, new Map([["test", "value"]]), "test");
    const cellResult = toEnvCell(existingCell);
    expect(cellResult).toBe(existingCell);
    expect(cell_strongest_base_value(cellResult).get("test")).toBe("value");
  });

  test("createShadowEnvs should create shadow environments", async () => {
    const baseEnv = primitive_construct_cell<Map<string, any>>("baseEnv");
    const initialMap = new Map([["key1", "value1"]]);
    
    tell(baseEnv, initialMap, "test");
    
    const shadowEnvs = createShadowEnvs(2, baseEnv);
    
    await execute_all_tasks_sequential(() => {});
    
    expect(shadowEnvs.length).toBe(2);
    const shadow1Value = cell_strongest_base_value(shadowEnvs[0]);
    const shadow2Value = cell_strongest_base_value(shadowEnvs[1]);
    console.log("Shadow1 value:", shadow1Value, typeof shadow1Value);
    console.log("Shadow2 value:", shadow2Value, typeof shadow2Value);
    expect(shadow1Value).toBeInstanceOf(Map);
    expect(shadow2Value).toBeInstanceOf(Map);
    expect(shadow1Value.get("key1")).toBe("value1");
    expect(shadow2Value.get("key1")).toBe("value1");
  });
});

describe("Simple CE Helper Test", () => {
  test("ce_apply should work with simple function", async () => {
    // Import the ce_apply function
    const { ce_apply } = await import("../ObjectSystem/comprehensive_object");
    
    const add = ce_apply("add", (a: number, b: number) => a + b);
    const a = primitive_construct_cell<number>("a");
    const b = primitive_construct_cell<number>("b");
    
    const result = add(a, b);
    
    tell(a, 5, "test");
    tell(b, 3, "test");
    
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(result)).toBe(8);
  });
}); 