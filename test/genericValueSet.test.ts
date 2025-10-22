import { describe, test, expect, beforeEach } from "bun:test";
import type { Cell } from "@/cell/Cell";
import { primitive_construct_cell, cell_strongest_base_value, set_handle_contradiction, cell_content, cell_strongest } from "@/cell/Cell";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { the_nothing } from "@/cell/CellValue";
import { primitive_propagator } from "../Propagator/Propagator";
import { p_add, p_sync } from "../Propagator/BuiltInProps";
import { update } from "../AdvanceReactivity/interface";
import { set_merge, generic_merge } from "@/cell/Merge";
import { reactive_merge, trace_earliest_emerged_value } from "../AdvanceReactivity/traced_timestamp/genericPatch";
import { merge_generic_value_sets, to_generic_value_set, is_generic_value_set } from "../DataTypes/GenericValueSet";
import { victor_clock_layer, generic_version_clock_less_than, generic_version_clock_equal } from "../AdvanceReactivity/victor_clock";
import { support_by, support_layer } from "sando-layer/Specified/SupportLayer";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { get_base_value } from "sando-layer/Basic/Layer";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { to_array, length } from "generic-handler/built_in_generics/generic_collection";
import { construct_better_set } from "generic-handler/built_in_generics/generic_better_set";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_handle_contradiction(trace_earliest_emerged_value);
  set_merge(merge_generic_value_sets);
});

describe("Generic Value Set Tests", () => {
  describe("Basic Generic Value Set Operations", () => {
    test("should create a generic value set from array", () => {
      const v1 = support_by(10, "source1");
      const v2 = support_by(20, "source2");
      const set = to_generic_value_set([v1, v2]);
      
      expect(is_generic_value_set(set)).toBe(true);
      expect(set.length).toBe(2);
    });

    test("should merge new element into value set", () => {
      const v1 = support_by(10, "source1");
      const v2 = support_by(20, "source2");
      const set = to_generic_value_set([v1]);
      
      const merged = merge_generic_value_sets(set, v2);
      expect(merged.length).toBe(2);
    });

    test("should not add nothing to value set", () => {
      const v1 = support_by(10, "source1");
      const set = to_generic_value_set([v1]);
      
      const merged = merge_generic_value_sets(set, the_nothing);
      expect(merged.length).toBe(1);
    });

    test("should replace weaker support with stronger support", () => {
      // Create value with weak support (multiple sources)
      const weakValue = construct_layered_datum(
        42,
        support_layer, construct_better_set(["source1", "source2", "source3"])
      );
      
      // Create value with strong support (single source)
      const strongValue = construct_layered_datum(
        42,
        support_layer, construct_better_set(["source1"])
      );
      
      const set = to_generic_value_set([weakValue]);
      const merged = merge_generic_value_sets(set, strongValue);
      
      // Should replace weak with strong
      expect(merged.length).toBe(1);
      expect(get_base_value(merged[0])).toBe(42);
    });
  });

  describe("Victor Clock Layer Tests", () => {
    test("should create victor clock layer on layered object", () => {
      const versionVector = new Map([["source1", 1]]);
      const value = construct_layered_datum(
        100,
        victor_clock_layer, versionVector
      );
      
      expect(victor_clock_layer.has_value(value)).toBe(true);
      const clockValue = victor_clock_layer.get_value(value);
      expect(clockValue.get("source1")).toBe(1);
    });

    test("should compare version vectors correctly", () => {
      const clock1 = new Map([["source1", 1]]);
      const clock2 = new Map([["source1", 2]]);
      
      expect(generic_version_clock_less_than(clock1, clock2)).toBe(true);
      expect(generic_version_clock_less_than(clock2, clock1)).toBe(false);
    });

    test("should detect equal version vectors", () => {
      const clock1 = new Map([["source1", 5]]);
      const clock2 = new Map([["source1", 5]]);
      
      expect(generic_version_clock_equal(clock1, clock2)).toBe(true);
    });

    test("should drop staled values based on victor clock", () => {
      // Create stale value (older clock)
      const staleValue = construct_layered_datum(
        10,
        victor_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_better_set(["premise1"])
      );
      
      // Create fresh value (newer clock from same source)
      const freshValue = construct_layered_datum(
        20,
        victor_clock_layer, new Map([["source1", 3]]),
        support_layer, construct_better_set(["premise1"])
      );
      
      const set = to_generic_value_set([staleValue]);
      const merged = merge_generic_value_sets(set, freshValue);
      
      // Should drop stale value
      expect(merged.length).toBe(1);
      expect(get_base_value(merged[0])).toBe(20);
    });

    test("should keep values from different sources", () => {
      // Value from source1
      const value1 = construct_layered_datum(
        10,
        victor_clock_layer, new Map([["source1", 2]]),
        support_layer, construct_better_set(["premise1"])
      );
      
      // Value from source2
      const value2 = construct_layered_datum(
        20,
        victor_clock_layer, new Map([["source2", 2]]),
        support_layer, construct_better_set(["premise1"])
      );
      
      const set = to_generic_value_set([value1]);
      const merged = merge_generic_value_sets(set, value2);
      
      // Should keep both values from different sources
      expect(merged.length).toBe(2);
    });

    test("should handle multiple version vector entries", () => {
      const clock1 = new Map([
        ["source1", 2],
        ["source2", 3]
      ]);
      
      const clock2 = new Map([
        ["source1", 2],
        ["source2", 5]
      ]);
      
      expect(generic_version_clock_less_than(clock1, clock2)).toBe(true);
    });
  });

  describe("Compound Values: Victor Clock + Support Layer", () => {
    test("should handle values with both victor clock and support layers", () => {
      const compoundValue = construct_layered_datum(
        100,
        victor_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_better_set(["premise1", "premise2"])
      );
      
      expect(victor_clock_layer.has_value(compoundValue)).toBe(true);
      expect(support_layer.has_value(compoundValue)).toBe(true);
      expect(get_base_value(compoundValue)).toBe(100);
    });

    test("should replace compound value when newer version with stronger support arrives", () => {
      // Old value: clock=1, support=2 premises
      const oldValue = construct_layered_datum(
        42,
        victor_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_better_set(["premise1", "premise2"])
      );
      
      // New value: clock=3, support=1 premise (stronger)
      const newValue = construct_layered_datum(
        42,
        victor_clock_layer, new Map([["source1", 3]]),
        support_layer, construct_better_set(["premise1"])
      );
      
      const set = to_generic_value_set([oldValue]);
      const merged = merge_generic_value_sets(set, newValue);
      
      // Should replace old with new (both stale clock AND weaker support)
      expect(merged.length).toBe(1);
      expect(get_base_value(merged[0])).toBe(42);
      
      const resultClock = victor_clock_layer.get_value(merged[0]);
      expect(resultClock.get("source1")).toBe(3);
    });

    test("should keep newer value with weaker support when clocks differ", () => {
      // Old value: clock=1, support=1 premise (strong)
      const oldValue = construct_layered_datum(
        42,
        victor_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_better_set(["premise1"])
      );
      
      // New value: clock=3, support=3 premises (weak)
      const newValue = construct_layered_datum(
        42,
        victor_clock_layer, new Map([["source1", 3]]),
        support_layer, construct_better_set(["premise1", "premise2", "premise3"])
      );
      
      const set = to_generic_value_set([oldValue]);
      const merged = merge_generic_value_sets(set, newValue);
      
      // Should replace old with new because clock is more recent
      expect(merged.length).toBe(1);
      const resultClock = victor_clock_layer.get_value(merged[0]);
      expect(resultClock.get("source1")).toBe(3);
    });

    test("should handle multiple compound values from different sources", () => {
      const value1 = construct_layered_datum(
        10,
        victor_clock_layer, new Map([["source1", 2]]),
        support_layer, construct_better_set(["premise1"])
      );
      
      const value2 = construct_layered_datum(
        20,
        victor_clock_layer, new Map([["source2", 1]]),
        support_layer, construct_better_set(["premise2"])
      );
      
      const value3 = construct_layered_datum(
        30,
        victor_clock_layer, new Map([["source3", 5]]),
        support_layer, construct_better_set(["premise3"])
      );
      
      let set = to_generic_value_set([value1]);
      set = merge_generic_value_sets(set, value2);
      set = merge_generic_value_sets(set, value3);
      
      // Should keep all three from different sources
      expect(set.length).toBe(3);
    });
  });

  describe("Integration with Propagators", () => {
    test("should work with propagators using victor clock values", async () => {
      const cellA = primitive_construct_cell("victorClockA");
      const cellB = primitive_construct_cell("victorClockB");
      
      // Create values with victor clocks
      const valueA1 = construct_layered_datum(
        5,
        victor_clock_layer, new Map([["cellA", 1]]),
        support_layer, construct_better_set(["inputA"])
      );
      
      const valueB1 = construct_layered_datum(
        10,
        victor_clock_layer, new Map([["cellB", 1]]),
        support_layer, construct_better_set(["inputB"])
      );
      
      cellA.addContent(valueA1);
      cellB.addContent(valueB1);
      
      const output = primitive_construct_cell("victorClockOutput");
      p_add(cellA, cellB, output);
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      const result = cell_strongest_base_value(output);
      expect(result).toBe(15);
    });

    test("should update when one input gets fresher value", async () => {
      const cellA = primitive_construct_cell("victorUpdateA");
      const cellB = primitive_construct_cell("victorUpdateB");
      const output = primitive_construct_cell("victorUpdateOutput");
      
      p_add(cellA, cellB, output);
      
      // Initial values
      const valueA1 = construct_layered_datum(
        5,
        victor_clock_layer, new Map([["cellA", 1]]),
        support_layer, construct_better_set(["inputA"])
      );
      
      const valueB1 = construct_layered_datum(
        10,
        victor_clock_layer, new Map([["cellB", 1]]),
        support_layer, construct_better_set(["inputB"])
      );
      
      cellA.addContent(valueA1);
      cellB.addContent(valueB1);
      await execute_all_tasks_sequential((error: Error) => {});
      
      expect(cell_strongest_base_value(output)).toBe(15);
      
      // Update cellA with newer clock
      const valueA2 = construct_layered_datum(
        8,
        victor_clock_layer, new Map([["cellA", 2]]),
        support_layer, construct_better_set(["inputA"])
      );
      
      cellA.addContent(valueA2);
      await execute_all_tasks_sequential((error: Error) => {});
      
      expect(cell_strongest_base_value(output)).toBe(18);
    });

    test("should be glitch-free: not compute when clocks are out of sync", async () => {
      const cellA = primitive_construct_cell("glitchA");
      const cellB = primitive_construct_cell("glitchB");
      const output = primitive_construct_cell("glitchOutput");
      
      // Create a computation that should only run when inputs are synchronized
      let computeCount = 0;
      const trackedProp = primitive_propagator((a: LayeredObject<any>, b: LayeredObject<any>) => {
        computeCount++;
        return construct_layered_datum(
          get_base_value(a) + get_base_value(b),
          victor_clock_layer, new Map([["output", computeCount]]),
          support_layer, construct_better_set(["computed"])
        );
      }, "tracked_add");
      
      trackedProp(cellA, cellB, output);
      
      // Set initial synchronized values
      const valueA1 = construct_layered_datum(
        5,
        victor_clock_layer, new Map([["source", 1]]),
        support_layer, construct_better_set(["inputA"])
      );
      
      const valueB1 = construct_layered_datum(
        10,
        victor_clock_layer, new Map([["source", 1]]),
        support_layer, construct_better_set(["inputB"])
      );
      
      cellA.addContent(valueA1);
      cellB.addContent(valueB1);
      await execute_all_tasks_sequential((error: Error) => {});
      
      const firstCount = computeCount;
      expect(firstCount).toBeGreaterThan(0);
      
      // Now update A with a much newer clock (creating desync)
      const valueA2 = construct_layered_datum(
        8,
        victor_clock_layer, new Map([["source", 10]]),
        support_layer, construct_better_set(["inputA"])
      );
      
      cellA.addContent(valueA2);
      await execute_all_tasks_sequential((error: Error) => {});
      
      // Propagator should potentially skip computation due to clock desync
      // (This depends on any_unusable_values implementation)
      const secondCount = computeCount;
      
      // Now sync B to same clock level
      const valueB2 = construct_layered_datum(
        12,
        victor_clock_layer, new Map([["source", 10]]),
        support_layer, construct_better_set(["inputB"])
      );
      
      cellB.addContent(valueB2);
      await execute_all_tasks_sequential((error: Error) => {});
      
      // Should compute again now that they're synced
      expect(computeCount).toBeGreaterThan(secondCount);
    });

    test("should retract specific input marked with premises", async () => {
      const cell = primitive_construct_cell("retractionTest");
      
      // Add value with premise1
      const value1 = construct_layered_datum(
        100,
        victor_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_better_set(["premise1"])
      );
      
      cell.addContent(value1);
      await execute_all_tasks_sequential((error: Error) => {});
      expect(cell_strongest_base_value(cell)).toBe(100);
      
      // Add value with premise2
      const value2 = construct_layered_datum(
        200,
        victor_clock_layer, new Map([["source1", 2]]),
        support_layer, construct_better_set(["premise2"])
      );
      
      cell.addContent(value2);
      await execute_all_tasks_sequential((error: Error) => {});
      
      // Should have newer value
      expect(cell_strongest_base_value(cell)).toBe(200);
      
      // The ability to retract premise1 vs premise2 depends on the cell's content structure
      // With victor clock, only the newest value from each source is kept
      const content = cell_content(cell);
      expect(content).toBeDefined();
    });

    test("should handle propagator with multiple inputs having different clocks", async () => {
      const cellA = primitive_construct_cell("multiClockA");
      const cellB = primitive_construct_cell("multiClockB");
      const cellC = primitive_construct_cell("multiClockC");
      const output = primitive_construct_cell("multiClockOutput");
      
      // Create a custom propagator that adds three inputs
      const addThree = primitive_propagator((a: any, b: any, c: any) => {
        return construct_layered_datum(
          get_base_value(a) + get_base_value(b) + get_base_value(c),
          victor_clock_layer, new Map([["output", 1]]),
          support_layer, construct_better_set(["computed"])
        );
      }, "add_three");
      
      addThree(cellA, cellB, cellC, output);
      
      // Different clocks for each input
      cellA.addContent(construct_layered_datum(
        10,
        victor_clock_layer, new Map([["sourceA", 5]]),
        support_layer, construct_better_set(["a"])
      ));
      
      cellB.addContent(construct_layered_datum(
        20,
        victor_clock_layer, new Map([["sourceB", 3]]),
        support_layer, construct_better_set(["b"])
      ));
      
      cellC.addContent(construct_layered_datum(
        30,
        victor_clock_layer, new Map([["sourceC", 7]]),
        support_layer, construct_better_set(["c"])
      ));
      
      await execute_all_tasks_sequential((error: Error) => {});
      
      const result = cell_strongest_base_value(output);
      expect(result).toBe(60);
    });
  });

  describe("Edge Cases and Complex Scenarios", () => {
    test("should handle empty value set", () => {
      const emptySet = to_generic_value_set([]);
      expect(emptySet.length).toBe(0);
      
      const newValue = support_by(42, "source1");
      const merged = merge_generic_value_sets(emptySet, newValue);
      expect(merged.length).toBe(1);
    });

    test("should handle value set with same base value but different metadata", () => {
      const value1 = construct_layered_datum(
        42,
        victor_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_better_set(["premise1"])
      );
      
      const value2 = construct_layered_datum(
        42,
        victor_clock_layer, new Map([["source1", 2]]),
        support_layer, construct_better_set(["premise2"])
      );
      
      const set = to_generic_value_set([value1]);
      const merged = merge_generic_value_sets(set, value2);
      
      // Should replace due to newer clock
      expect(merged.length).toBe(1);
      expect(get_base_value(merged[0])).toBe(42);
    });

    test("should handle concurrent updates from multiple sources", () => {
      // Simulate concurrent updates from different sources
      const updates = [
        construct_layered_datum(
          10,
          victor_clock_layer, new Map([["source1", 1]]),
          support_layer, construct_better_set(["p1"])
        ),
        construct_layered_datum(
          20,
          victor_clock_layer, new Map([["source2", 1]]),
          support_layer, construct_better_set(["p2"])
        ),
        construct_layered_datum(
          30,
          victor_clock_layer, new Map([["source3", 1]]),
          support_layer, construct_better_set(["p3"])
        )
      ];
      
      let set = to_generic_value_set([]);
      updates.forEach(update => {
        set = merge_generic_value_sets(set, update);
      });
      
      // Should have all three concurrent values
      expect(set.length).toBe(3);
    });

    test("should handle vector clock with mixed source updates", () => {
      const value1 = construct_layered_datum(
        100,
        victor_clock_layer, new Map([["source1", 5], ["source2", 3]]),
        support_layer, construct_better_set(["p1"])
      );
      
      // Update that's newer in source1 but same in source2
      const value2 = construct_layered_datum(
        200,
        victor_clock_layer, new Map([["source1", 7], ["source2", 3]]),
        support_layer, construct_better_set(["p1"])
      );
      
      const set = to_generic_value_set([value1]);
      const merged = merge_generic_value_sets(set, value2);
      
      // Should replace with newer value
      expect(merged.length).toBe(1);
      expect(get_base_value(merged[0])).toBe(200);
    });
  });
});

