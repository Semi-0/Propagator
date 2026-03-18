import { describe, test, expect, beforeEach } from "bun:test";
import type { Cell } from "@/cell/Cell";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import {
  construct_cell,
  cell_strongest_base_value,
  cell_id,
  cell_name,
  update_cell
} from "@/cell/Cell";
import { execute_all_tasks_sequential, run_scheduler_and_replay, set_immediate_execute } from "../Shared/Scheduler/Scheduler";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { the_nothing } from "@/cell/CellValue";
import { set_merge } from "@/cell/Merge";
import {
  merge_carried_map,
  bi_switcher,
  function_to_cell_carrier_constructor,
  make_map_carrier,
  p_construct_dict_carrier,
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
import { compound_tell } from "../Helper/UI";
import { construct_vector_clock, vector_clock_layer } from "../AdvanceReactivity/vector_clock";
import { compound_propagator, generic_merge, inspect_strongest } from "ppropogator";
import { traced_generic_procedure } from "generic-handler/GenericProcedure";
import { the_contradiction } from "ppropogator";
import { log_tracer } from "generic-handler/built_in_generics/generic_debugger";
import { install_temporary_value_set_handlers, merge_temporary_value_set } from "../DataTypes/TemporaryValueSet";
import { p_reactive_dispatch, internal_clear_source_cells, source_constant_cell, update_source_cell } from "../DataTypes/PremisesSource";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  internal_clear_source_cells();
  install_temporary_value_set_handlers();
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
    // test("merge_carried_map should merge simple Maps", () => {
    //   const mapA = new Map([
    //     ["a", 1],
    //     ["b", 2]
    //   ]);
    //   const mapB = new Map([
    //     ["c", 3],
    //     ["d", 4]
    //   ]);

      
    //   const result = merge_carried_map(mapA, mapB);
      
    //   expect(result.get("a")).toBe(1);
    //   expect(result.get("b")).toBe(2);
    //   expect(result.get("c")).toBe(3);
    //   expect(result.get("d")).toBe(4);
    //   expect(result.size).toBe(4);
    // });



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
      
      expect(cell_strongest_base_value(cellB)).not.toBe(the_nothing);

    
      compound_tell(cellB, 300, vector_clock_layer, construct_vector_clock([{ source: "test", value: 1}]));
      run_scheduler_and_replay(console.log)
      expect(cell_strongest_base_value(cellA)).not.toBe(the_nothing);
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

      update_cell(condition, true);
      update_cell(a, 100);
      await execute_all_tasks_sequential((error: Error) => {});

      expect(cell_strongest_base_value(a)).not.toBe(the_nothing);
      expect(cell_strongest_base_value(b)).toBe(the_nothing);
    });

    test("bi_switcher should route value to 'b' when condition is false", async () => {
      const condition = construct_cell("condition") as Cell<boolean>;
      const a = construct_cell("a") as Cell<number>;
      const b = construct_cell("b") as Cell<number>;

      bi_switcher(condition, a, b);

      update_cell(condition, false);
      update_cell(b, 200);
      await execute_all_tasks_sequential((error: Error) => {});

      expect(cell_strongest_base_value(a)).toBe(the_nothing);
      expect(cell_strongest_base_value(b)).not.toBe(the_nothing);
    });

    test("bi_switcher should switch routing when condition changes", async () => {
      const condition = construct_cell("condition") as Cell<boolean>;
      const a = construct_cell("a") as Cell<number>;
      const b = construct_cell("b") as Cell<number>;

      bi_switcher(condition, a, b);
 
       // Start with condition true, route to a
      update_cell(condition, true);
      update_cell(a, 100);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(a)).not.toBe(the_nothing);
 
      await new Promise((resolve) => setTimeout(resolve, 10));
 
      // Switch condition to false, route to b
      update_cell(condition, false);
      update_cell(b, 200);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(b)).not.toBe(the_nothing);
 
      await new Promise((resolve) => setTimeout(resolve, 10));
 
      // Switch back to true
      update_cell(condition, true);
      update_cell(a, 150);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(a)).not.toBe(the_nothing);
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

      p_construct_dict_carrier_with_name(cellA, cellB, cellC, output);
 
      await execute_all_tasks_sequential((error: Error) => {});

      update_cell(cellA, 100);
      update_cell(cellB, 200);
      update_cell(cellC, 300);
       
      await execute_all_tasks_sequential(console.log)
      const suppose_map = cell_strongest_base_value(output) as Map<string, Cell<any>>;
      expect(is_map(suppose_map)).toBe(true);
      expect(is_equal(suppose_map.get(cell_name(cellA)), cellA)).toBe(true);
      expect(is_equal(suppose_map.get(cell_name(cellB)), cellB)).toBe(true);
      expect(is_equal(suppose_map.get(cell_name(cellC)), cellC)).toBe(true);
    });

  
    test("c_dict_accessor should not cause infinite loop if used in immediate execute mode", async () => {

      
      set_immediate_execute(true)
      set_merge(merge_temporary_value_set)
      
      const cellA = construct_cell("A");
      const cellB = construct_cell("B");
      const carrier = construct_cell("carrier") as Cell<Map<string, Cell<any>>>
      p_construct_dict_carrier_with_name(cellA, cellB, carrier)
      const accessed_A = construct_cell("accessed_A") as Cell<number>;
      const accessed_B = construct_cell("accessed_B") as Cell<number>;

      c_dict_accessor("A")(carrier, accessed_A)
      c_dict_accessor("B")(carrier, accessed_B)


      const source = source_constant_cell("source")

      p_reactive_dispatch(source, cellA)
      p_reactive_dispatch(source, cellB)

      update_source_cell(source, new Map([[cellA, 100], [cellB, 200]]))
      
      await new Promise(resolve => queueMicrotask(resolve));
      

  

      expect(cell_strongest_base_value(accessed_A)).not.toBe(the_nothing);
      expect(cell_strongest_base_value(accessed_B)).not.toBe(the_nothing);
    });

    test("accessor can work with map carrier", async () => {
      const A = construct_cell("A") as Cell<number>;
      const B = construct_cell("B") as Cell<number>;
      const accessed_A = construct_cell("accessed_A") as Cell<number>;
      const accessed_B = construct_cell("accessed_B") as Cell<number>;
      const carrier = construct_cell("carrier") as Cell<Map<string, Cell<any>>>;

      p_construct_dict_carrier_with_name(A, B, carrier);
      c_dict_accessor("A")(carrier, accessed_A);
      c_dict_accessor("B")(carrier, accessed_B);

      update_cell(A, 100);
      update_cell(B, 200);
      await execute_all_tasks_sequential(() => {});

      expect(cell_strongest_base_value(accessed_A)).toBe(100);
      expect(cell_strongest_base_value(accessed_B)).toBe(200);
    });

    /**
     * Hypothesis: merge_carried_map bi_syncs multiple accessors for the same key,
     * so we get value consistency after propagation—even without caching accessor identity.
     * Card API may fail without cache only due to read-before-propagation ordering.
     */
    describe("multiple accessors for same key (bi_sync value consistency)", () => {
      test("two accessors for same key: update one, run execute, other sees value (value consistency via bi_sync)", async () => {
        const inner = construct_cell("inner") as Cell<number>;
        const carrier = construct_cell("carrier") as Cell<Map<string, Cell<any>>>;
        const slotMap = new Map<string, Cell<any>>([["K", inner]]);
        p_construct_dict_carrier(slotMap, carrier);

        const accessor1 = construct_cell("accessor1") as Cell<number>;
        const accessor2 = construct_cell("accessor2") as Cell<number>;
        c_dict_accessor("K")(carrier, accessor1);
        c_dict_accessor("K")(carrier, accessor2);

        await execute_all_tasks_sequential(() => {});

        compound_tell(accessor1, 42, vector_clock_layer, construct_vector_clock([{ source: "test", value: 0 }]));
        run_scheduler_and_replay(console.log);

        expect(cell_strongest_base_value(accessor2)).not.toBe(the_nothing);
      });

      test("two accessors for same key: update one, read other without execute may be stale", async () => {
        const inner = construct_cell("inner") as Cell<number>;
        const carrier = construct_cell("carrier") as Cell<Map<string, Cell<any>>>;
        const slotMap = new Map<string, Cell<any>>([["K", inner]]);
        p_construct_dict_carrier(slotMap, carrier);

        const accessor1 = construct_cell("accessor1") as Cell<number>;
        const accessor2 = construct_cell("accessor2") as Cell<number>;
        c_dict_accessor("K")(carrier, accessor1);
        c_dict_accessor("K")(carrier, accessor2);

        await execute_all_tasks_sequential(() => {});

        compound_tell(accessor1, 42, vector_clock_layer, construct_vector_clock([{ source: "test", value: 0 }]));
        run_scheduler_and_replay(console.log);

        const accessor3 = construct_cell("accessor3") as Cell<number>;
        c_dict_accessor("K")(carrier, accessor3);
        const valueBeforeExecute = cell_strongest_base_value(accessor3);
        run_scheduler_and_replay(console.log);
        const valueAfterExecute = cell_strongest_base_value(accessor3);

        expect(valueAfterExecute).toBe(42);
        if (valueBeforeExecute !== 42) {
          expect(valueBeforeExecute).toBe(the_nothing);
        }
      });
    });
  });


  test("recursive accessor can work with map carrier", async () => {
    const A = construct_cell("A") as Cell<number>;
    const B = construct_cell("B") as Cell<number>;
    const accessed_A = construct_cell("accessed_A") as Cell<number>;
    const accessed_B = construct_cell("accessed_B") as Cell<number>;
    const carrier = construct_cell("carrier") as Cell<Map<string, Cell<any>>>;

    p_construct_struct_carrier({
      A: A,
      B: B,
    })(carrier);
    recursive_accessor(["A"])(carrier, accessed_A);
    recursive_accessor(["B"])(carrier, accessed_B);

    update_source_cell(A, 100);
    update_source_cell(B, 200);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(accessed_A)).toBe(100);
    expect(cell_strongest_base_value(accessed_B)).toBe(200);

    update_source_cell(A, 300);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(accessed_A)).toBe(300);

    update_source_cell(B, 400);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(accessed_B)).toBe(400);
  });
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

  test("nested map test network", async () => {
    const A = construct_cell("A") as Cell<number>;
    const B = construct_cell("B") as Cell<number>;
    const inner_A = construct_cell("inner_A") as Cell<number>;
    const inner_B = construct_cell("inner_B") as Cell<number>;
    const inner_inner_A = construct_cell("inner_inner_A") as Cell<number>;
    const accessed_A = construct_cell("accessed_A") as Cell<number>;
    const accessed_inner_A = construct_cell("accessed_inner_A") as Cell<number>;
    const accessed_inner_inner_A = construct_cell("accessed_inner_inner_A") as Cell<number>;

    nested_map_test_network(
      A,
      B,
      inner_A,
      inner_B,
      inner_inner_A,
      accessed_A,
      accessed_inner_A,
      accessed_inner_inner_A,
    );

    update_cell(A, 100);
    update_cell(B, 200);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(accessed_A)).toBe(100);

    update_cell(inner_A, 300);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(accessed_inner_A)).toBe(300);

    update_cell(inner_inner_A, 500);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(accessed_inner_inner_A)).toBe(500);
  });


  test("p_cons and p_car and p_cdr worked", async () => {
    const head = construct_cell("head") as Cell<any>;
    const tail = construct_cell("tail") as Cell<any>;
    const car = construct_cell("car") as Cell<any>;
    const cdr = construct_cell("cdr") as Cell<any>;
    const pair = construct_cell("pair") as Cell<Map<string, any>>;

    p_cons(head, tail, pair);
    p_car(pair, car);
    p_cdr(pair, cdr);

    update_cell(head, 100);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(car)).toBe(100);

    update_cell(tail, 200);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(cdr)).toBe(200);
  });

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

      update_source_cell(cellA, 100);
      await execute_all_tasks_sequential((error: Error) => {});

      const merged = merge_carried_map(map1, map2);

      // cellC should now be synced with cellA
      update_source_cell(cellA, 200);
      await execute_all_tasks_sequential((error: Error) => {});

      expect(cell_strongest_base_value(cellC)).not.toBe(the_nothing);

      // Update cellC and it should propagate back to cellA
      update_source_cell(cellC, 300);
      await execute_all_tasks_sequential((error: Error) => {});

      expect(cell_strongest_base_value(cellA)).not.toBe(the_nothing);
    });

    test("bi_switcher with reactive updates should maintain consistency", async () => {
      const condition = construct_cell("condition") as Cell<boolean>;
      const a = construct_cell("a") as Cell<number>;
      const b = construct_cell("b") as Cell<number>;

      bi_switcher(condition, a, b);

      // Start with true
      update_cell(condition, true);
      await execute_all_tasks_sequential((error: Error) => {});
      update_cell(a, 100);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(a)).not.toBe(the_nothing);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Switch to false, route to b
      update_cell(condition, false);
      update_cell(b, 200);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(b)).not.toBe(the_nothing);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Switch back to true
      update_cell(condition, true);
      update_cell(a, 150);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(a)).not.toBe(the_nothing);
    });

  }) 
  

  test("p_cons handles nested linked lists", async () => {
    const list1 = construct_cell("list") as Cell<any>;
    const list2 = construct_cell("list2") as Cell<any>;
    const head1 = construct_cell("head1") as Cell<number>;
    const head2 = construct_cell("head2") as Cell<number>;
    const head3 = construct_cell("head3") as Cell<number>;
    const car1 = construct_cell("car1") as Cell<number>;
    const cdr1 = construct_cell("cdr1") as Cell<any>;
    const car2 = construct_cell("car2") as Cell<number>;
    const cdr2 = construct_cell("cdr2") as Cell<any>;
    const car3 = construct_cell("car3") as Cell<number>;

    p_cons(head2, ce_cons(head3, construct_cell("end")), list2);
    p_cons(head1, list2, list1);
    p_car(list1, car1);
    p_cdr(list1, cdr1);
    p_car(cdr1, car2);
    p_cdr(cdr1, cdr2);
    p_car(cdr2, car3);

    update_cell(head1, 10);
    update_cell(head2, 20);
    update_cell(head3, 30);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(car1)).toBe(10);
    expect(cell_strongest_base_value(car2)).toBe(20);
    expect(cell_strongest_base_value(car3)).toBe(30);
  });

  test("p_list builds the same structure as manual cons", async () => {
    const list = construct_cell("list") as Cell<Map<string, any>>;
    const item1 = construct_cell("item1") as Cell<number>;
    const item2 = construct_cell("item2") as Cell<number>;
    const item3 = construct_cell("item3") as Cell<number>;
    const listCar1 = construct_cell("listCar1") as Cell<number>;
    const listCar2 = construct_cell("listCar2") as Cell<number>;
    const listCar3 = construct_cell("listCar3") as Cell<number>;

    p_list([item1, item2, item3], list);
    p_car(list, listCar1);
    p_car(ce_cdr(list), listCar2);
    p_car(ce_cdr(ce_cdr(list)), listCar3);

    update_cell(item1, 1);
    update_cell(item2, 2);
    update_cell(item3, 3);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(listCar1)).toBe(1);
    expect(cell_strongest_base_value(listCar2)).toBe(2);
    expect(cell_strongest_base_value(listCar3)).toBe(3);
  });

  test("p_list_map applies mapper to each element", async () => {
    const value1 = construct_cell("value1") as Cell<number>;
    const value2 = construct_cell("value2") as Cell<number>;
    const list = construct_cell("list") as Cell<Map<string, any>>;
    const mapped_list = construct_cell("mapped_list") as Cell<Map<string, any>>;
    const mapped1 = construct_cell("mapped1") as Cell<number>;
    const mapped2 = construct_cell("mapped2") as Cell<number>;

    p_list([value1, value2], list);
    const mapper = ce_map((input: number) => input * 2);
    p_list_map(mapper, list, mapped_list);
    p_car(mapped_list, mapped1);
    p_car(ce_cdr(mapped_list), mapped2);

    update_cell(value1, 5);
    update_cell(value2, 15);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(mapped1)).toBe(10);
    expect(cell_strongest_base_value(mapped2)).toBe(30);
  });

  test("p_list_filter keeps elements that satisfy predicate", async () => {
    const value1 = construct_cell("value1") as Cell<number>;
    const value2 = construct_cell("value2") as Cell<number>;
    const value3 = construct_cell("value3") as Cell<number>;
    const filteredHead = construct_cell("filteredHead") as Cell<number>;
    const list = construct_cell("filterList") as Cell<Map<string, any>>;
    const filteredList = construct_cell("filteredList") as Cell<Map<string, any>>;

    p_list([value1, value2, value3], list);
    const predicate = (cell: Cell<any>) => ce_map((input: number) => input % 2 === 0)(cell);
    p_list_filter(predicate, list, filteredList);
    p_car(filteredList, filteredHead);

    update_cell(value1, 4);
    update_cell(value2, 7);
    update_cell(value3, 10);
    await execute_all_tasks_sequential(() => {});
    expect(cell_strongest_base_value(filteredHead)).toBe(4);
  });

  test("p_list_zip pairs elements from two lists", async () => {
    const list1Value1 = construct_cell("list1Value1") as Cell<number>;
    const list1Value2 = construct_cell("list1Value2") as Cell<number>;
    const list2Value1 = construct_cell("list2Value1") as Cell<number>;
    const list2Value2 = construct_cell("list2Value2") as Cell<number>;
    const zipped = construct_cell("zipped") as Cell<Map<string, any>>;
    const zippedFirstA = construct_cell("zippedFirstA") as Cell<number>;
    const zippedFirstB = construct_cell("zippedFirstB") as Cell<number>;

    const list1 = construct_cell("list1") as Cell<Map<string, any>>;
    const list2 = construct_cell("list2") as Cell<Map<string, any>>;
    p_list([list1Value1, list1Value2], list1);
    p_list([list2Value1, list2Value2], list2);

    p_list_zip(list1, list2, zipped);

    const zippedPair = construct_cell("zippedPair") as Cell<Map<string, any>>;
    p_car(zipped, zippedPair);
    p_car(zippedPair, zippedFirstA);
    p_car(ce_car(ce_cdr(zipped)), zippedFirstB);

    update_cell(list1Value1, 1);
    update_cell(list1Value2, 2);
    update_cell(list2Value1, 3);
    update_cell(list2Value2, 4);
    await execute_all_tasks_sequential(() => {});

    expect(cell_strongest_base_value(zippedFirstA)).toBe(1);
    expect(cell_strongest_base_value(zippedFirstB)).toBe(2);
  });
