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

  p_construct_dict_carrier_with_name,
  ce_construct_cell_carrier,
  ce_construct_dict_carrier_with_name,
  c_dict_accessor,
  ce_struct,
  recursive_accessor,
  p_construct_struct_carrier,
  p_cdr,
  p_cons,
  p_car,
  ce_cons,
  ce_car,
  ce_cdr,
  p_list,
  p_list_map,
  p_list_filter,
  p_list_zip
} from "../DataTypes/CarriedCell";
import { p_add, p_subtract, p_multiply, bi_sync, p_constant } from "../Propagator/BuiltInProps";
import { ce_map, ce_filter_a, ce_zip } from "../Propagator/BuiltInProps";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { is_map } from "../Helper/Helper";
import { compound_tell, reactive_tell } from "../Helper/UI";
import { merge_patched_set } from "../DataTypes/PatchedValueSet";
import { construct_vector_clock, vector_clock_layer } from "../AdvanceReactivity/vector_clock";
import { merge_plan, r_i, r_o, run_replay_scheduler, test_propagator, test_propagator_only, trace_scheduler_assessor } from "../TestSuit/propagator_test";
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

      p_construct_dict_carrier_with_name(cellA, cellB, cellC, output);
 
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
         const propagator =  p_construct_dict_carrier_with_name(A, B, carrier)
        //  inspect_strongest(carrier)
         c_dict_accessor("A")(carrier, accessed_A)
         c_dict_accessor("B")(carrier, accessed_B)
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


  test_propagator(
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

        c_dict_accessor("A")(outer, accessed_A)
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


  test_propagator(
    "p_cons and p_car and p_cdr worked",
    (head: Cell<any>, tail: Cell<any>, car: Cell<any>, cdr: Cell<any>) => {
      const pair = construct_cell("pair") as Cell<Map<string, any>>
      p_cons(head, tail, pair)
      p_car(pair, car)
      p_cdr(pair, cdr)

    },
    ["head", "tail", "car", "cdr"],
    [merge_plan(merge_patched_set)],
    [
      r_i(100, "head"),
      r_o(100, "car")
    ],
    [
      r_i(200, "tail"),
      r_o(200, "cdr"),
    ]
  )

  // test_propagator(
  //   "p_cons worked wi"
  // )


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

  test_propagator_only(
    "p_cons handles nested linked lists",
    (
      list1: Cell<any>,
      list2: Cell<any>,
      head1: Cell<number>,
      head2: Cell<number>,
      head3: Cell<number>,
      car1: Cell<number>,
      cdr1: Cell<any>,
      car2: Cell<number>,
      cdr2: Cell<any>,
      car3: Cell<number>
    ) => {  
        p_cons(head2, ce_cons(head3, construct_cell("end")), list2)
        p_cons(head1, list2, list1)
        p_car(list1, car1)
        p_cdr(list1, cdr1)
        p_car(cdr1, car2)
        p_cdr(cdr1, cdr2)
        p_car(cdr2, car3)      
    },
    ["list", "list2", "head1", "head2", "head3", "car1", "cdr1", "car2", "cdr2", "car3"],
    [merge_plan(merge_patched_set)],
    [
      
      run_replay_scheduler,
      r_i(10, "head1"),
      r_i(20, "head2"),
      r_i(30, "head3"),
      r_o(10, "car1"),
      r_o(20, "car2"),
      r_o(30, "car3")
    ]
  );

  test_propagator_only(
    "p_list builds the same structure as manual cons",
    (
      list: Cell<Map<string, any>>,
      item1: Cell<number>,
      item2: Cell<number>,
      item3: Cell<number>,
      listCar1: Cell<number>,
      listCar2: Cell<number>,
      listCar3: Cell<number>,

    ) => {
      p_list([item1, item2, item3], list);
      p_car(list, listCar1)
      p_car(ce_cdr(list), listCar2)
      p_car(ce_cdr(ce_cdr(list)), listCar3)
     
    },
    [
      "list",
      "item1",
      "item2",
      "item3",
      "listCar1",
      "listCar2",
      "listCar3",

    ],
    [merge_plan(merge_patched_set)],
    [
      r_i(1, "item1"),
      r_i(2, "item2"),
      r_i(3, "item3"),
      r_o(1, "listCar1"),
      r_o(2, "listCar2"),
      r_o(3, "listCar3"),
    ]
  );

  test_propagator_only(
    "p_list_map applies mapper to each element",
    (
      value1: Cell<number>,
      value2: Cell<number>,
      list: Cell<Map<string, any>>,
      mapped_list: Cell<Map<string, any>>,
      mapped1: Cell<number>,
      mapped2: Cell<number>
    ) => {
    
      p_list([value1, value2], list);

      const mapper = ce_map((input: number) => 
        {
          return input * 2;
        });

      p_list_map(mapper, list, mapped_list);
      p_car(mapped_list, mapped1)
      p_car(ce_cdr(mapped_list), mapped2)

      
    },
    ["value1", "value2", "list", "mapped_list", "mapped1", "mapped2"],
    [merge_plan(merge_patched_set)],
    [
      r_i(5, "value1"),
      r_i(15, "value2"),
      r_o(10, "mapped1"),
      r_o(30, "mapped2")
    ]
  );

  test_propagator_only(
    "p_list_filter keeps elements that satisfy predicate",
    (
      value1: Cell<number>,
      value2: Cell<number>,
      value3: Cell<number>,
      filteredHead: Cell<number>
    ) => {
      const list = construct_cell("filterList") as Cell<Map<string, any>>;
      p_list([value1, value2, value3], list);

      const filteredList = construct_cell("filteredList") as Cell<Map<string, any>>;
      const predicate = (cell: Cell<any>) => ce_map((input: number) => input % 2 === 0)(cell);

      p_list_filter(predicate, list, filteredList);

      p_car(filteredList, filteredHead);
    },
    ["value1", "value2", "value3", "filteredHead"],
    [merge_plan(merge_patched_set)],
    [
      r_i(4, "value1"),
      r_i(7, "value2"),
      r_i(10, "value3"),
      r_o(4, "filteredHead")
    ]
    );

  test_propagator_only(
    "p_list_zip pairs elements from two lists",
    (
      list1Value1: Cell<number>,
      list1Value2: Cell<number>,
      zipped: Cell<Map<string, any>>,
  
      list2Value1: Cell<number>,
      list2Value2: Cell<number>,
      zippedFirstA: Cell<number>,
      zippedFirstB: Cell<number>
    ) => {

      const list1 = construct_cell("list1") as Cell<Map<string, any>>;
      const list2 = construct_cell("list2") as Cell<Map<string, any>>;
      p_list([list1Value1, list1Value2], list1);
      p_list([list2Value1, list2Value2], list2);

      p_list_zip(list1, list2, zipped);

      const zippedPair = construct_cell("zippedPair") as Cell<Map<string, any>>;
      p_car(zipped, zippedPair);
      p_car(zippedPair, zippedFirstA);

      p_car(ce_car(ce_cdr(zipped)), zippedFirstB);
      // const zippedPairTail = construct_cell("zippedPairTail") as Cell<Map<string, any>>;
      // p_cdr(zippedPair, zippedPairTail);
      // p_car(zippedPairTail, zippedFirstB);
    },
    [
      "list1Value1",
      "list1Value2",
      "zipped",
      "list2Value1",
      "list2Value2",
      "zippedFirstA",
      "zippedFirstB"
    ],
    [merge_plan(merge_patched_set)],
    [
      run_replay_scheduler,
      r_i(1, "list1Value1"),
      r_i(2, "list1Value2"),
      r_i(3, "list2Value1"),
      r_i(4, "list2Value2"),
      r_o(1, "zippedFirstA"),
      r_o(2, "zippedFirstB")
    ]
  );
