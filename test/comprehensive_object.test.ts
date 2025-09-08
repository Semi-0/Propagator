// import { test, expect, describe, beforeEach, afterEach } from "bun:test";
// import { 
//   ce_apply, ce_eq, ce_and, ce_not, ce_gate, ce_collect_defined, ce_maxN,
//   tag, criticTag, anyTag,
//   ce_selector_argmax_intensity, ce_selector_simultaneous,
//   createVirtualOutputs, createShadowEnvs, shallowMergeEnv, commitEnvWithReduceCE,
//   create_object_propagator, create_ergo_object, toEnvCell
// } from "../ObjectSystem/comprehensive_object";
// import { construct_cell, make_temp_cell, cell_strongest_base_value, type Cell } from "../Cell/Cell";
// import { r_constant, the_nothing } from "..";
// import { tell } from "../Helper/UI";
// import { update } from "../AdvanceReactivity/interface";
// import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
// import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
// import { reactive_scheduler } from "../Shared/Scheduler/ReactiveScheduler";
// import { set_merge } from "../Cell/Merge";
// import { reactive_merge } from "../AdvanceReactivity/traced_timestamp/genericPatch";
// import { p_feedback } from "../Propagator/BuiltInProps";

// beforeEach(() => {
//   set_global_state(PublicStateCommand.CLEAN_UP);
//   set_global_state(PublicStateCommand.SET_SCHEDULER, reactive_scheduler());
//   set_merge(reactive_merge);
// });

// afterEach(async () => {
//   await execute_all_tasks_sequential(() => {});
// });

// describe("CE Helpers", () => {
//   test("ce_apply should create arithmetic propagators", async () => {
//     const add = ce_apply("add", (a: number, b: number) => a + b);
//     const a = construct_cell<number>("a");
//     const b = construct_cell<number>("b");
    
//     const result = add(a, b);
    
//     update(a, 5);
//     update(b, 3);
    
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe(8);
//   });

//   test("ce_eq should work correctly", async () => {
//     const a = construct_cell<string>("a");
//     const b = construct_cell<string>("b");
    
//     const result = ce_eq(a, b);
    
//     update(a, "hello");
//     update(b, "hello");
    
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe(true);
    
//     update(b, "world");
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe(false);
//   });

//   test("ce_and should work correctly", async () => {
//     const a = construct_cell<boolean>("a");
//     const b = construct_cell<boolean>("b");
    
//     const result = ce_and(a, b);
    
//     update(a, true);
//     update(b, true);
    
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe(true);
    
//     tell(b, false, "test");
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe(false);
//   });

//   test("ce_not should work correctly", async () => {
//     const a = construct_cell<boolean>("a");
    
//     const result = ce_not(a);
    
//     update(a, true);
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe(false);
    
//     update(a, false);
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe(true);
//   });

//   test("ce_gate should work correctly", async () => {
//     const on = construct_cell<boolean>("on");
//     const value = construct_cell<string>("value");
    
//     const result = ce_gate(on, value);
    
//     update(on, true);
//     update(value, "hello");
    
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe("hello");
    
//     update(on, false);
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe(the_nothing);
//   });

//   test("ce_collect_defined should filter out undefined and nothing values", async () => {
//     const a = construct_cell<any>("a");
//     const b = construct_cell<any>("b");
//     const c = construct_cell<any>("c");
    
//     const result = ce_collect_defined(a, b, c);
    
//     update(a, "hello");
//     update(b, the_nothing);
//     update(c, "world");
    
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toEqual(["hello", "world"]);
//   });

//   test("ce_maxN should find maximum value", async () => {
//     const a = construct_cell<number>("a");
//     const b = construct_cell<number>("b");
//     const c = construct_cell<number>("c");
    
//     const result = ce_maxN(a, b, c);
    
//     update(a, 1);
//     update(b, 5);
//     update(c, 3);
    
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe(5);
//   });
// });

// describe("Tag Helpers", () => {
//   test("tag should create critic functions", async () => {
//     const cmd = construct_cell<string>("cmd");
    
//     const helloCritic = tag("hello");
//     const result = helloCritic(cmd);
    
//     update(cmd, "hello");
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe(true);
    
//     update(cmd, "world");
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe(false);
//   });

//   test("criticTag should work with inputs", async () => {
//     const cmd = construct_cell<string>("cmd");
//     const inputs = [construct_cell<string>("input1")];
    
//     const helloCritic = criticTag("hello");
//     const result = helloCritic(cmd, inputs);
    
//     update(cmd, "hello");
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe(true);
//   });

//   test("anyTag should match any of the provided tags", async () => {
//     const cmd = construct_cell<string>("cmd");
//     const inputs = [construct_cell<string>("input1")];
    
//     const multiCritic = anyTag("hello", "world", "test");
//     const result = multiCritic(cmd, inputs);
    
//     update(cmd, "hello");
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe(true);
    
//     update(cmd, "world");
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe(true);
    
//     update(cmd, "other");
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(result)).toBe(false);
//   });
// });

// describe("Selectors", () => {
//   test("ce_selector_argmax_intensity should select highest intensity match", async () => {
//     const matches = [
//       construct_cell<boolean>("match1"),
//       construct_cell<boolean>("match2"),
//       construct_cell<boolean>("match3")
//     ];
//     const intensity = [
//       construct_cell<number>("intensity1"),
//       construct_cell<number>("intensity2"),
//       construct_cell<number>("intensity3")
//     ];
    
//     const results = ce_selector_argmax_intensity({ matches, intensity });
    
//     // Set up matches and intensities
//     update(matches[0], true);
//     update(matches[1], true);
//     update(matches[2], false);
    
//     update(intensity[0], 1);
//     update(intensity[1], 5);
//     update(intensity[2], 3);
    
//     await execute_all_tasks_sequential(() => {});
    
//     // Only the highest intensity match should be selected
//     expect(cell_strongest_base_value(results[0])).toBe(false);
//     expect(cell_strongest_base_value(results[1])).toBe(true);
//     expect(cell_strongest_base_value(results[2])).toBe(false);
//   });

//   test("ce_selector_simultaneous should select all matches", async () => {
//     const matches = [
//       construct_cell<boolean>("match1"),
//       construct_cell<boolean>("match2"),
//       construct_cell<boolean>("match3")
//     ];
//     const intensity = [
//       construct_cell<number>("intensity1"),
//       construct_cell<number>("intensity2"),
//       construct_cell<number>("intensity3")
//     ];
    
//     const results = ce_selector_simultaneous({ matches, intensity });
    
//     // Set up matches
//     update(matches[0], true);
//     update(matches[1], true);
//     update(matches[2], false);
    
//     await execute_all_tasks_sequential(() => {});
    
//     // All matches should be selected
//     expect(cell_strongest_base_value(results[0])).toBe(true);
//     expect(cell_strongest_base_value(results[1])).toBe(true);
//     expect(cell_strongest_base_value(results[2])).toBe(false);
//   });
// });

// describe("Virtual Environment", () => {
//   test("createVirtualOutputs should create correct number of outputs", () => {
//     const vOuts = createVirtualOutputs(3, 2);
    
//     expect(vOuts.length).toBe(3);
//     expect(vOuts[0].length).toBe(2);
//     expect(vOuts[1].length).toBe(2);
//     expect(vOuts[2].length).toBe(2);
//   });

//   test("createShadowEnvs should create shadow environments", async () => {
//     const baseEnv = construct_cell<Map<string, any>>("baseEnv");
//     const initialMap = new Map([["key1", "value1"]]);
    
//     tell(baseEnv, initialMap, "test");
    
//     const shadowEnvs = createShadowEnvs(2, baseEnv);
    
//     await execute_all_tasks_sequential(() => {});
    
//     expect(shadowEnvs.length).toBe(2);
//     expect((cell_strongest_base_value(shadowEnvs[0]) as Map<string, any>).get("key1")).toBe("value1");
//     expect((cell_strongest_base_value(shadowEnvs[1]) as Map<string, any>).get("key1")).toBe("value1");
//   });

//   test("shallowMergeEnv should merge environments correctly", () => {
//     const env1 = new Map([["key1", "value1"], ["key2", "value2"]]);
//     const env2 = new Map([["key2", "newValue2"], ["key3", "value3"]]);
    
//     const result = shallowMergeEnv(env1, { env: env2, intensity: 1, index: 0 });
    
//     expect(result?.get("key1")).toBe("value1");
//     expect(result?.get("key2")).toBe("newValue2");
//     expect(result?.get("key3")).toBe("value3");
//   });

//   test("commitEnvWithReduceCE should commit environment changes", async () => {
//     const baseEnv = construct_cell<Map<string, any>>("baseEnv");
//     const initialMap = new Map([["key1", "value1"]]);
    
//     tell(baseEnv, initialMap, "test");
    
//     const shadowEnvs = [
//       construct_cell<Map<string, any>>("shadow1"),
//       construct_cell<Map<string, any>>("shadow2")
//     ];
    
//     const gate = [
//       construct_cell<boolean>("gate1"),
//       construct_cell<boolean>("gate2")
//     ];
    
//     const intensity = [
//       construct_cell<number>("intensity1"),
//       construct_cell<number>("intensity2")
//     ];
    
//     // Set up shadow environments
//     const env1 = new Map([["key1", "newValue1"], ["key2", "value2"]]);
//     const env2 = new Map([["key3", "value3"]]);
    
//     tell(shadowEnvs[0], env1, "test");
//     tell(shadowEnvs[1], env2, "test");
    
//     // Enable first gate, disable second
//     tell(gate[0], true, "test");
//     tell(gate[1], false, "test");
    
//     tell(intensity[0], 5, "test");
//     tell(intensity[1], 3, "test");
    
//     commitEnvWithReduceCE("test", baseEnv, shadowEnvs, gate, intensity);
    
//     await execute_all_tasks_sequential(() => {});
    
//     const finalEnv = cell_strongest_base_value(baseEnv) as Map<string, any>;
//     expect(finalEnv.get("key1")).toBe("newValue1");
//     expect(finalEnv.get("key2")).toBe("value2");
//     expect(finalEnv.get("key3")).toBeUndefined();
//   });
// });

// describe("Object Propagator", () => {
//   test("create_object_propagator should create working object", async () => {
//     const env = construct_cell<Map<string, any>>("env");
//     const initialMap = new Map([["name", "John"]]);
//     tell(env, initialMap, "test");
    
//     const cmd = construct_cell<string>("cmd");
//     const inputs = [construct_cell<string>("key")];
//     const outputs = [construct_cell<any>("result")];
    
//     const specs = [
//       {
//         critic: criticTag("get"),
//         run: (cmd: Cell<any>, env: Cell<Map<string, any>>, inputs: Cell<any>[], outputs: Cell<any>[]) => {
//           // Simple getter implementation
//           const key = inputs[0];
//           const result = outputs[0];
          
//           // This is a simplified version - in real implementation you'd use ce_lookup_env
//           const temp = make_temp_cell();
//           // Simulate lookup
//           p_feedback(r_constant("John"), result);
//           return temp as any;
//         },
//         intensity: 1
//       }
//     ];
    
//     const object = create_object_propagator("testObj", env, specs);
//     object(cmd, inputs, outputs);
    
//     update(cmd, "get");
//     update(inputs[0], "name");
    
//     await execute_all_tasks_sequential(() => {});
    
//     expect(cell_strongest_base_value(outputs[0])).toBe("John");
//   });
// });

// describe("Ergonomic Object", () => {
//   test("toEnvCell should convert different env types", () => {
//     // Test with Map
//     const mapEnv = new Map([["key1", "value1"]]);
//     const mapCell = toEnvCell(mapEnv);
//     expect((cell_strongest_base_value(mapCell) as Map<string, any>).get("key1")).toBe("value1");
    
//     // Test with Record
//     const recordEnv = { key1: "value1", key2: "value2" };
//     const recordCell = toEnvCell(recordEnv);
//     expect((cell_strongest_base_value(recordCell) as Map<string, any>).get("key1")).toBe("value1");
//     expect((cell_strongest_base_value(recordCell) as Map<string, any>).get("key2")).toBe("value2");
    
//     // Test with existing Cell
//     const existingCell = construct_cell<Map<string, any>>("existing");
//     update(existingCell, new Map([["test", "value"]]));
//     const cellResult = toEnvCell(existingCell);
//     expect(cellResult).toBe(existingCell);
//     expect((cell_strongest_base_value(cellResult) as Map<string, any>).get("test")).toBe("value");
//   });

//   test("create_ergo_object should create object with builtins", async () => {
//     const initial = { name: "John", age: 30 };
//     const obj = create_ergo_object("testObj", initial);
    
//     const cmd = construct_cell<string>("cmd");
//     const inputs = [construct_cell<string>("key"), construct_cell<any>("value")];
//     const outputs = [construct_cell<any>("result")];
    
//     obj.object(cmd, inputs, outputs);
    
//     // Test getter
//     update(cmd, "get");
//     update(inputs[0], "name");
    
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(outputs[0])).toBe("John");
    
//     // Test setter
//     update(cmd, "set");
//     update(inputs[0], "city");
//     update(inputs[1], "New York");
    
//     await execute_all_tasks_sequential(() => {});
    
//     // Verify the value was set
//     update(cmd, "get");
//     update(inputs[0], "city");
    
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(outputs[0])).toBe("New York");
//   });

//   test("create_ergo_object should auto-increment intensity", async () => {
//     const initial = { name: "John" };
//     const obj = create_ergo_object("testObj", initial, undefined, { startIntensity: 10 });
    
//     const cmd = construct_cell<string>("cmd");
//     const inputs = [construct_cell<string>("key")];
//     const outputs = [construct_cell<any>("result")];
    
//     // Add a custom dispatcher
//     const index = obj.add({
//       tag: "custom",
//       run: (cmd, env, inputs, outputs) => {
//         p_feedback(r_constant("custom result"), outputs[0]);
//         return make_temp_cell() as any;
//       }
//     });
    
//     expect(index).toBe(2); // Builtins are 0 and 1, custom is 2
    
//     obj.object(cmd, inputs, outputs);
    
//     update(cmd, "custom");
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(outputs[0])).toBe("custom result");
//   });

//   test("create_ergo_object should handle multiple tags", async () => {
//     const initial = { name: "John" };
//     const obj = create_ergo_object("testObj", initial);
    
//     const cmd = construct_cell<string>("cmd");
//     const inputs = [construct_cell<string>("key")];
//     const outputs = [construct_cell<any>("result")];
    
//     // Add dispatcher with multiple tags
//     obj.add({
//       tag: ["tag1", "tag2"],
//       run: (cmd, env, inputs, outputs) => {
//         p_feedback(r_constant("multi tag result"), outputs[0]);
//         return make_temp_cell() as any;
//       }
//     });
    
//     obj.object(cmd, inputs, outputs);
    
//     // Test with first tag
//     update(cmd, "tag1");
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(outputs[0])).toBe("multi tag result");
    
//     // Test with second tag
//     update(cmd, "tag2");
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(outputs[0])).toBe("multi tag result");
//   });

//   test("create_ergo_object should handle custom critics", async () => {
//     const initial = { name: "John" };
//     const obj = create_ergo_object("testObj", initial);
    
//     const cmd = construct_cell<string>("cmd");
//     const inputs = [construct_cell<string>("key")];
//     const outputs = [construct_cell<any>("result")];
    
//     // Add dispatcher with custom critic
//     obj.add({
//       critic: (cmd, inputs) => {
//         return ce_eq(cmd, r_constant("custom"));
//       },
//       run: (cmd, env, inputs, outputs) => {
//         p_feedback(r_constant("custom critic result"), outputs[0]);
//         return make_temp_cell() as any;
//       }
//     });
    
//     obj.object(cmd, inputs, outputs);
    
//     update(cmd, "custom");
//     await execute_all_tasks_sequential(() => {});
//     expect(cell_strongest_base_value(outputs[0])).toBe("custom critic result");
//   });
// }); 