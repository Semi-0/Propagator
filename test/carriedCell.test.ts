import { describe, test, expect, beforeEach } from "bun:test";
import type { Cell } from "@/cell/Cell";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import {
  construct_cell,
  cell_content,
  cell_strongest_base_value,
  set_handle_contradiction,
  cell_strongest,
  cell_id
} from "@/cell/Cell";
import { execute_all_tasks_sequential, run_scheduler_and_replay } from "../Shared/Scheduler/Scheduler";
import { to_array } from "generic-handler/built_in_generics/generic_collection";
import { get_base_value } from "sando-layer/Basic/Layer";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { the_nothing } from "@/cell/CellValue";
import { update } from "../AdvanceReactivity/interface";
import { set_merge } from "@/cell/Merge";
import { reactive_merge } from "../AdvanceReactivity/traced_timestamp/genericPatch";
import { trace_earliest_emerged_value } from "../AdvanceReactivity/traced_timestamp/genericPatch";
import {
  merge_carried_map,
  bi_switcher,
  function_to_cell_carrier_constructor,
  make_map_carrier,
  make_propagator_closure,
  type PropagatorClosure,
  p_map_carrier_default
} from "../DataTypes/CarriedCell";
import { p_add, p_subtract, p_multiply, bi_sync } from "../Propagator/BuiltInProps";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { is_map } from "../Helper/Helper";
import { compound_tell, reactive_tell } from "../Helper/UI";
import { merge_patched_set } from "../DataTypes/PatchedValueSet";
import { construct_vector_clock, vector_clock_layer } from "../AdvanceReactivity/vector_clock";
import { inspect_content } from "ppropogator";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_handle_contradiction(trace_earliest_emerged_value);
  set_merge(merge_patched_set);
});

describe("Carried Cell Tests", () => {
  describe("is_map predicate tests", () => {
    test("is_map should return true for Map objects", () => {
      const map = new Map();
      expect(is_map(map)).toBe(true);
    });

    test("is_map should return false for non-Map objects", () => {
      expect(is_map({})).toBe(false);
      expect(is_map([])).toBe(false);
      expect(is_map("string")).toBe(false);
      expect(is_map(123)).toBe(false);
      expect(is_map(null)).toBe(false);
      expect(is_map(undefined)).toBe(false);
    });
  });

  describe("merge_carried_map tests", () => {
    test("merge_carried_map should merge simple Maps", () => {
      const mapA = new Map([
        ["a", 1],
        ["b", 2]
      ]);
      const mapB = new Map([
        ["c", 3],
        ["d", 4]
      ]);

      const result = merge_carried_map(mapA, mapB);
      
      expect(result.get("a")).toBe(1);
      expect(result.get("b")).toBe(2);
      expect(result.get("c")).toBe(3);
      expect(result.get("d")).toBe(4);
      expect(result.size).toBe(4);
    });

    test("merge_carried_map should overwrite existing keys with new values", () => {
      const mapA = new Map([
        ["a", 1],
        ["b", 2]
      ]);
      const mapB = new Map([
        ["a", 10],
        ["c", 3]
      ]);

      const result = merge_carried_map(mapA, mapB);
      
      expect(result.get("a")).toBe(10);
      expect(result.get("b")).toBe(2);
      expect(result.get("c")).toBe(3);
      expect(result.size).toBe(3);
    });

    test.only("merge_carried_map should sync cells when keys exist", async () => {
      const cellA = construct_cell("cellA");
      const cellB = construct_cell("cellB");
      
      const mapA = new Map([
        ["key1", cellA]
      ]);
      const mapB = new Map([
        ["key1", cellB]
      ]);

       // because for bi_sync both cell needs to be inited with a value
       // thats why it is not working
       inspect_content(cellB)
      await execute_all_tasks_sequential((error: Error) => {});
      
      // const result = merge_carried_map(mapA, mapB);
      bi_sync(cellA, cellB);
      
      // After merge, cellB should be synced with cellA
      compound_tell(cellA, 200, vector_clock_layer, construct_vector_clock([{ source: "test", value: 0 }]));
      run_scheduler_and_replay(console.log) 
      
      expect(cell_strongest_base_value(cellB)).toBe(200);

    
      compound_tell(cellB, 300, vector_clock_layer, construct_vector_clock([{ source: "test", value: 1}]));
      run_scheduler_and_replay(console.log)
      expect(cell_strongest_base_value(cellA)).toBe(300);
    });

    // test("merge_carried_map should handle mixed cell and non-cell values", async () => {
    //   const cellA = construct_cell("cellA");
    //   const cellB = construct_cell("cellB");

    //   // @ts-ignore
    //   const mapA = new Map([
    //     ["cellKey", cellA],
    //     ["simpleKey", 42]
    //   ]) as Map<string, number | Cell<any>>;
    //   // @ts-ignore
    //   const mapB = new Map([
    //     ["cellKey", cellB],
    //     ["anotherKey", "value"]
    //   ]) as Map<string, number | Cell<any>>;

    //   reactive_tell(cellA, 100);
    //   await execute_all_tasks_sequential((error: Error) => {});
      
    //   const result = merge_carried_map(mapA, mapB);
      
    //   expect(result.get("simpleKey")).toBe(42);
    //   expect(result.get("anotherKey")).toBe("value");
      
    //   // Cells should be synced
    //   await reactive_tell(cellA, 300);
    //   await execute_all_tasks_sequential((error: Error) => {});
    //   const syncedValues = to_array(cell_content(cellB)).map((layered: LayeredObject<any>) => get_base_value(layered));
    //   expect(syncedValues).toContain(300);
    // });
  });

  describe("bi_switcher tests", () => {
    test("bi_switcher should route value to 'a' when condition is true", async () => {
      const condition = construct_cell("condition") as Cell<boolean>;
      const a = construct_cell("a") as Cell<number>;
      const b = construct_cell("b") as Cell<number>;

      bi_switcher(condition, a, b);

      await reactive_tell(condition, true);
      await reactive_tell(a, 100);
      await execute_all_tasks_sequential((error: Error) => {});

      expect(cell_strongest_base_value(a)).toBe(100);
      expect(cell_strongest_base_value(b)).toBe(the_nothing);
    });

    test("bi_switcher should route value to 'b' when condition is false", async () => {
      const condition = construct_cell("condition") as Cell<boolean>;
      const a = construct_cell("a") as Cell<number>;
      const b = construct_cell("b") as Cell<number>;

      bi_switcher(condition, a, b);

      await reactive_tell(condition, false);
      await reactive_tell(b, 200);
      await execute_all_tasks_sequential((error: Error) => {});

      expect(cell_strongest_base_value(a)).toBe(the_nothing);
      expect(cell_strongest_base_value(b)).toBe(200);
    });

    test("bi_switcher should switch routing when condition changes", async () => {
      const condition = construct_cell("condition") as Cell<boolean>;
      const a = construct_cell("a") as Cell<number>;
      const b = construct_cell("b") as Cell<number>;

      bi_switcher(condition, a, b);
 
       // Start with condition true, route to a
      await reactive_tell(condition, true);
      await reactive_tell(a, 100);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(a)).toBe(100);
 
      await new Promise((resolve) => setTimeout(resolve, 10));
 
      // Switch condition to false, route to b
      await reactive_tell(condition, false);
      await reactive_tell(b, 200);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(b)).toBe(200);
 
      await new Promise((resolve) => setTimeout(resolve, 10));
 
      // Switch back to true
      await reactive_tell(condition, true);
      await reactive_tell(a, 150);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(a)).toBe(150);
    });
  });

  


  describe("make_map_carrier tests", () => {
    test("make_map_carrier should create a Map from cells", () => {
      const cellA = construct_cell("cellA");
      const cellB = construct_cell("cellB");
      const cellC = construct_cell("cellC");

      const cellMap = make_map_carrier(cell_id)(cellA, cellB, cellC);

      expect(cellMap.size).toBe(3);
 
      expect(is_equal(cellMap.get(cell_id(cellA)), cellA)).toBe(true);
      expect(is_equal(cellMap.get(cell_id(cellB)), cellB)).toBe(true);
      expect(is_equal(cellMap.get(cell_id(cellC)), cellC)).toBe(true);
    });

    test("make_map_carrier should handle single cell", () => {
      const cellA = construct_cell("cellA");

      const cellMap = make_map_carrier(cell_id)(cellA);

      expect(cellMap.size).toBe(1);
      expect(is_equal(cellMap.get(cell_id(cellA)), cellA)).toBe(true);
    });

    test("make_map_carrier should handle empty arguments", () => {
      const cellMap = make_map_carrier(cell_id)();

      expect(cellMap.size).toBe(0);
    });


    test("p_map_carrier should create a map carrier", async () => {
      const cellA = construct_cell("cellA");
      const cellB = construct_cell("cellB");
      const cellC = construct_cell("cellC");
      const output = construct_cell("output");

      p_map_carrier_default(cellA, cellB, cellC, output);
 
      await execute_all_tasks_sequential((error: Error) => {});

      await reactive_tell(cellA, 100);
      await reactive_tell(cellB, 200);
      await reactive_tell(cellC, 300);
      await execute_all_tasks_sequential((error: Error) => {});
 
      const suppose_map = cell_strongest_base_value(output) as Map<string, Cell<any>>;
      expect(is_map(suppose_map)).toBe(true);
      expect(is_equal(suppose_map.get(cell_id(cellA)), cellA)).toBe(true);
      expect(is_equal(suppose_map.get(cell_id(cellB)), cellB)).toBe(true);
      expect(is_equal(suppose_map.get(cell_id(cellC)), cellC)).toBe(true);
    });
  });

  // describe("make_propagator_closure tests", () => {
  //   test("make_propagator_closure should create a propagator closure with environment", () => {
  //     const propagatorConstructor = (a: Cell<number>, b: Cell<number>) => {
  //       return p_add(a, b, construct_cell("output"));
  //     };

  //     const closure = make_propagator_closure(
  //       ["inputA", "inputB"],
  //       propagatorConstructor
  //     );

  //     expect(is_propagator_closure(closure)).toBe(true);
  //     expect(closure.environment.size).toBe(2);
  //     expect(closure.environment.has("inputA")).toBe(true);
  //     expect(closure.environment.has("inputB")).toBe(true);
  //   });

  //   test("make_propagator_closure should create cells with correct names", () => {
  //     const propagatorConstructor = (a: Cell<number>) => {
  //       return p_multiply(a, construct_cell("constant"), construct_cell("result"));
  //     };

  //     const closure = make_propagator_closure(
  //       ["input"],
  //       propagatorConstructor
  //     );

  //     const inputCell = closure.environment.get("input");
  //     expect(inputCell).toBeDefined();
  //     expect(inputCell.id).toBe("input");
  //   });
  // });

  // describe("is_propagator_closure tests", () => {
  //   test("is_propagator_closure should return true for valid closures", () => {
  //     const closure: PropagatorClosure = {
  //       environment: new Map(),
  //       propagator: p_add(construct_cell("a"), construct_cell("b"), construct_cell("c"))
  //     };

  //     expect(is_propagator_closure(closure)).toBe(true);
  //   });

  //   test("is_propagator_closure should return false for invalid objects", () => {
  //     expect(is_propagator_closure({})).toBe(false);
  //     expect(is_propagator_closure({ environment: new Map() })).toBe(false);
  //     expect(is_propagator_closure({ propagator: p_add(construct_cell("a"), construct_cell("b"), construct_cell("c")) })).toBe(false);
  //     expect(is_propagator_closure(null)).toBe(false);
  //     expect(is_propagator_closure(undefined)).toBe(false);
  //     expect(is_propagator_closure("string")).toBe(false);
  //   });
  // });

  // describe("propagator closure merge tests", () => {
  //   test("should merge propagator closures with same propagator ID", async () => {
  //     const cellA1 = construct_cell("a1");
  //     const cellB1 = construct_cell("b1");
  //     const output1 = construct_cell("output1");
      
  //     const cellA2 = construct_cell("a2");
  //     const cellB2 = construct_cell("b2");
  //     const output2 = construct_cell("output2");

  //     const propagator1 = p_add(cellA1, cellB1, output1);
  //     const propagator2 = p_add(cellA2, cellB2, output2);

  //     const closure1: PropagatorClosure = {
  //       environment: new Map([
  //         ["a", cellA1],
  //         ["b", cellB1]
  //       ]),
  //       propagator: propagator1
  //     };

  //     const closure2: PropagatorClosure = {
  //       environment: new Map([
  //         ["a", cellA2],
  //         ["b", cellB2]
  //       ]),
  //       propagator: propagator2
  //     };

  //     // Note: This test demonstrates the merge behavior
  //     // In practice, you'd use the generic merge handler
  //     expect(is_propagator_closure(closure1)).toBe(true);
  //     expect(is_propagator_closure(closure2)).toBe(true);
  //   });
  // });

  // describe("apply_propagator tests", () => {
  //   test("apply_propagator should apply a propagator closure with environment", async () => {
  //     const cellA = construct_cell("a");
  //     const cellB = construct_cell("b");
  //     const output = construct_cell("output");

  //     const propagator = p_add(cellA, cellB, output);

  //     const closure: PropagatorClosure = {
  //       environment: new Map([
  //         ["x", cellA],
  //         ["y", cellB]
  //       ]),
  //       propagator: propagator
  //     };

  //     const additionalEnv = new Map([
  //       ["z", construct_cell("z")]
  //     ]);

  //     const result = apply_propagator(closure, additionalEnv);

  //     expect(result.environment.size).toBe(3);
  //     expect(result.environment.has("x")).toBe(true);
  //     expect(result.environment.has("y")).toBe(true);
  //     expect(result.environment.has("z")).toBe(true);
  //     expect(result.propagator).toBe(propagator);
  //   });

  //   test("apply_propagator should merge environments correctly", async () => {
  //     const cellA = construct_cell("a");
  //     const cellB = construct_cell("b");
  //     const cellC = construct_cell("c");
  //     const output = construct_cell("output");

  //     const propagator = p_add(cellA, cellB, output);

  //     const closure: PropagatorClosure = {
  //       environment: new Map([
  //         ["a", cellA],
  //         ["b", cellB]
  //       ]),
  //       propagator: propagator
  //     };

  //     const additionalEnv = new Map([
  //       ["b", cellC], // This should sync with existing "b"
  //       ["c", cellC]
  //     ]);

  //     const result = apply_propagator(closure, additionalEnv);

  //     expect(result.environment.size).toBe(3);
  //     expect(result.environment.get("b")).toBe(cellC);
  //     expect(result.environment.get("c")).toBe(cellC);
  //   });
  // });

  describe("Integration tests with reactive behavior", () => {
    test("carried map with reactive cells should update correctly", async () => {
      const cellA = construct_cell("cellA");
      const cellB = construct_cell("cellB");
      const cellC = construct_cell("cellC");

      const map1 = new Map([
        ["a", cellA],
        ["b", cellB]
      ]);

      const map2 = new Map([
        ["a", cellC],
        ["c", construct_cell("cellD")]
      ]);

      await reactive_tell(cellA, 100);
      await execute_all_tasks_sequential((error: Error) => {});

      const merged = merge_carried_map(map1, map2);

      // cellC should now be synced with cellA
      await reactive_tell(cellA, 200);
      await execute_all_tasks_sequential((error: Error) => {});

      expect(cell_strongest_base_value(cellC)).toBe(200);

      // Update cellC and it should propagate back to cellA
      await reactive_tell(cellC, 300);
      await execute_all_tasks_sequential((error: Error) => {});

      expect(cell_strongest_base_value(cellA)).toBe(300);
    });

    test("bi_switcher with reactive updates should maintain consistency", async () => {
      const condition = construct_cell("condition") as Cell<boolean>;
      const a = construct_cell("a") as Cell<number>;
      const b = construct_cell("b") as Cell<number>;

      bi_switcher(condition, a, b);

      // Start with true
      await reactive_tell(condition, true);
      await execute_all_tasks_sequential((error: Error) => {});
      await reactive_tell(a, 100);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(a)).toBe(100);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Switch to false, route to b
      await reactive_tell(condition, false);
      await reactive_tell(b, 200);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(b)).toBe(200);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Switch back to true
      await reactive_tell(condition, true);
      await reactive_tell(a, 150);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(a)).toBe(150);
    });
  });
});

