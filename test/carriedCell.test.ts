import { describe, test, expect, beforeEach } from "bun:test";
import type { Cell } from "@/cell/Cell";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import {
  construct_cell,
  cell_content,
  cell_strongest_base_value,
  set_handle_contradiction,
  cell_strongest,
  cell_id,
  cell_name
} from "@/cell/Cell";
import { execute_all_tasks_sequential, run_scheduler_and_replay } from "../Shared/Scheduler/Scheduler";
import { to_array } from "generic-handler/built_in_generics/generic_collection";
import { get_base_value } from "sando-layer/Basic/Layer";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { the_nothing } from "@/cell/CellValue";
import { update } from "../AdvanceReactivity/interface";
import { merge_layered, set_merge } from "@/cell/Merge";
import { reactive_merge } from "../AdvanceReactivity/traced_timestamp/genericPatch";
import { trace_earliest_emerged_value } from "../AdvanceReactivity/traced_timestamp/genericPatch";
import {
  merge_carried_map,
  bi_switcher,
  function_to_cell_carrier_constructor,
  make_map_carrier,
  make_propagator_closure,
  type PropagatorClosure,
  p_construct_map_carrier_with_name,
  ce_construct_cell_carrier,
  ce_construct_map_carrier_with_name,
  c_map_accessor,
  ce_struct,
  recursive_accessor,
  p_construct_struct_carrier
} from "../DataTypes/CarriedCell";
import { p_add, p_subtract, p_multiply, bi_sync, p_constant } from "../Propagator/BuiltInProps";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { is_map } from "../Helper/Helper";
import { compound_tell, reactive_tell } from "../Helper/UI";
import { merge_patched_set } from "../DataTypes/PatchedValueSet";
import { construct_vector_clock, vector_clock_layer } from "../AdvanceReactivity/vector_clock";
import { merge_plan, r_i, r_o, run_replay_scheduler, test_propagator, test_propagator_only, test_propagator_only_with_merge_plan, trace_scheduler_assessor } from "../TestSuit/propagator_test";
import { compound_propagator, generic_merge, inspect_strongest } from "ppropogator";
import { traced_generic_procedure } from "generic-handler/GenericProcedure";
import { the_contradiction } from "ppropogator";
import { log_tracer } from "generic-handler/built_in_generics/generic_debugger";

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



    test("merge_carried_map should sync cells when keys exist", async () => {
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
      await execute_all_tasks_sequential((error: Error) => {});
      
      const result = merge_carried_map(mapA, mapB);
      // bi_sync(cellA, cellB);
      
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

      set_merge(merge_patched_set)

      p_construct_map_carrier_with_name(cellA, cellB, cellC, output);
 
      await execute_all_tasks_sequential((error: Error) => {});

      await reactive_tell(cellA, 100);
      await reactive_tell(cellB, 200);
      await reactive_tell(cellC, 300);
       
      await execute_all_tasks_sequential(console.log)
      const suppose_map = cell_strongest_base_value(output) as Map<string, Cell<any>>;
      expect(is_map(suppose_map)).toBe(true);
      expect(is_equal(suppose_map.get(cell_name(cellA)), cellA)).toBe(true);
      expect(is_equal(suppose_map.get(cell_name(cellB)), cellB)).toBe(true);
      expect(is_equal(suppose_map.get(cell_name(cellC)), cellC)).toBe(true);
    });

    test_propagator(
      // seems that carried cell is already working with merge_layered
      // so the next step is how we can integrated merge_layered with the value merge
      "accessor can work with map carrier",
      (A: Cell<number>, B: Cell<number>, accessed_A: Cell<number>, accessed_B: Cell<number>) => {
         // ahh its because generic merge access directly to the layered object!!
         // that's why it failed to merge MAPS!!!
         const carrier = construct_cell("carrier") as Cell<Map<string, Cell<any>>>
         const propagator =  p_construct_map_carrier_with_name(A, B, carrier)
        //  inspect_strongest(carrier)
         c_map_accessor("A")(carrier, accessed_A)
         c_map_accessor("B")(carrier, accessed_B)
      },
      ["A", "B", "accessed_A", "accessed_B"],
      [
        // trace_scheduler_assessor(console.log),
        merge_plan(merge_patched_set),
      ],
      [
         r_i(100, "A"),
         r_i(200, "B"),
         r_o(100, "accessed_A"),
         r_o(200, "accessed_B"),
      ],
      [
        // merge_plan(merge_layered),
        r_i(300, "A"),
        r_o(300, "accessed_A"),
      ],
      [
        // merge_plan(merge_layered),
        r_i(400, "B"),
        r_o(400, "accessed_B"),
      ]
    )
  });


  test_propagator_only(
    // seems that carried cell is already working with merge_layered
    // so the next step is how we can integrated merge_layered with the value merge
    "recursive accessor can work with map carrier",
    (A: Cell<number>, B: Cell<number>, accessed_A: Cell<number>, accessed_B: Cell<number>) => {
       // ahh its because generic merge access directly to the layered object!!
       // that's why it failed to merge MAPS!!!
       const carrier = construct_cell("carrier") as Cell<Map<string, Cell<any>>>
      //  const propagator =  p_construct_map_carrier_with_name(A, B, carrier)
      p_construct_struct_carrier({
        A: A,
        B: B,
      })(carrier)
      //  inspect_strongest(carrier)
       recursive_accessor(["A"])(carrier, accessed_A)
       recursive_accessor(["B"])(carrier, accessed_B)
    },
    ["A", "B", "accessed_A", "accessed_B"],
    [
      // trace_scheduler_assessor(console.log),
      merge_plan(merge_patched_set),
    ],
    [
       r_i(100, "A"),
       r_i(200, "B"),
       r_o(100, "accessed_A"),
       r_o(200, "accessed_B"),
    ],
    [
      // merge_plan(merge_layered),
      r_i(300, "A"),
      r_o(300, "accessed_A"),
    ],
    [
      // merge_plan(merge_layered),
      r_i(400, "B"),
      r_o(400, "accessed_B"),
    ]
  )
});


    const nested_map_test_network =
   (
      A: Cell<number>,
      B: Cell<number>,
      inner_A: Cell<number>,
      inner_B: Cell<number>,
      inner_inner_A: Cell<number>,
      accessed_A: Cell<number>,
      accessed_inner_A: Cell<number>,
      accessed_inner_inner_A: Cell<number>,
   ) => compound_propagator(
      [],
      [accessed_A, accessed_inner_A, accessed_inner_inner_A],
      () => {

        const most_inner = ce_struct({
          A: inner_inner_A,
        })

        const inner = ce_struct({
          A: inner_A,
          B: inner_B,
          inner: most_inner,
        })

        const outer = ce_struct(
          {
            A: A,
            B: B,
            inner: inner,
          }
        )

        c_map_accessor("A")(outer, accessed_A)
        recursive_accessor(["inner", "A"])(outer, accessed_inner_A)
        recursive_accessor(["inner", "inner", "A"])(outer, accessed_inner_inner_A)
      }, 
      "nested_map_test_network"
  )

  test_propagator(
    "nested map test network",
    nested_map_test_network,
    ["A", "B", "inner_A", "inner_B", "inner_inner_A", "accessed_A", "accessed_inner_A", "accessed_inner_inner_A"],
    [
      merge_plan(merge_patched_set),
    ],
    [
      r_i(100, "A"),
      r_i(200, "B"),
      r_o(100, "accessed_A"),
    ],
    [
      r_i(300, "inner_A"),
      r_o(300, "accessed_inner_A"),
    ],
    [
      r_i(500, "inner_inner_A"),
      r_o(500, "accessed_inner_inner_A"),
    ]
  )


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

  
  })
