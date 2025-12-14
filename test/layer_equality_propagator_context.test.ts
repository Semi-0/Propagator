import { describe, test, expect, beforeEach } from "bun:test";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { support_layer, construct_defualt_support_set } from "sando-layer/Specified/SupportLayer";
import { vector_clock_layer } from "../AdvanceReactivity/vector_clock";
import { layered_deep_equal, layers_base_equal, all_layers_value_equal, layers_length_equal } from "sando-layer/Equality";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { set_merge } from "@/cell/Merge";
import { trace_earliest_emerged_value } from "../AdvanceReactivity/traced_timestamp/genericPatch";
import { set_handle_contradiction } from "@/cell/Cell";
import { merge_generic_value_sets } from "../DataTypes/GenericValueSet";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_handle_contradiction(trace_earliest_emerged_value);
  set_merge(merge_generic_value_sets);
});

describe("Layer Equality in Propagator Context (Victor Clock + Support)", () => {
  describe("Victor Clock Layer Equality", () => {
    test("should compare identical victor clock layers - propagator context", () => {
      const obj1 = construct_layered_datum(
        10,
        vector_clock_layer, new Map([["source1", 1]])
      );
      
      const obj2 = construct_layered_datum(
        10,
        vector_clock_layer, new Map([["source1", 1]])
      );
      
      console.log("\n=== Victor Clock Only ===");
      const clock1 = vector_clock_layer.get_value(obj1);
      const clock2 = vector_clock_layer.get_value(obj2);
      
      console.log("Clock1:", clock1);
      console.log("Clock2:", clock2);
      console.log("is_equal(clock1, clock2):", is_equal(clock1, clock2));
      console.log("all_layers_value_equal(obj1, obj2):", all_layers_value_equal(obj1, obj2));
      console.log("layered_deep_equal(obj1, obj2):", layered_deep_equal(obj1, obj2));
      
      expect(is_equal(clock1, clock2)).toBe(true);
      expect(layered_deep_equal(obj1, obj2)).toBe(true);
    });

    test("should compare different victor clock layers", () => {
      const obj1 = construct_layered_datum(
        10,
        vector_clock_layer, new Map([["source1", 1]])
      );
      
      const obj2 = construct_layered_datum(
        10,
        vector_clock_layer, new Map([["source1", 3]])
      );
      
      console.log("\n=== Different Victor Clocks ===");
      const clock1 = vector_clock_layer.get_value(obj1);
      const clock2 = vector_clock_layer.get_value(obj2);
      
      console.log("Clock1:", clock1);
      console.log("Clock2:", clock2);
      console.log("is_equal(clock1, clock2):", is_equal(clock1, clock2));
      console.log("layered_deep_equal(obj1, obj2):", layered_deep_equal(obj1, obj2));
      
      expect(is_equal(clock1, clock2)).toBe(false);
      expect(layered_deep_equal(obj1, obj2)).toBe(false);
    });
  });

  describe("Support Layer Equality", () => {
    test("should compare identical support layers - propagator context", () => {
      const obj1 = construct_layered_datum(
        10,
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      const obj2 = construct_layered_datum(
        10,
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      console.log("\n=== Support Only ===");
      const support1 = support_layer.get_value(obj1);
      const support2 = support_layer.get_value(obj2);
      
      console.log("Support1:", support1);
      console.log("Support2:", support2);
      console.log("is_equal(support1, support2):", is_equal(support1, support2));
      console.log("all_layers_value_equal(obj1, obj2):", all_layers_value_equal(obj1, obj2));
      console.log("layered_deep_equal(obj1, obj2):", layered_deep_equal(obj1, obj2));
      
      expect(is_equal(support1, support2)).toBe(true);
      expect(layered_deep_equal(obj1, obj2)).toBe(true);
    });
  });

  describe("Combined Victor Clock + Support Layers", () => {
    test("should compare identical combined layers - stale value scenario", () => {
      const staleValue = construct_layered_datum(
        10,
        vector_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      const staleCopy = construct_layered_datum(
        10,
        vector_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      console.log("\n=== Combined: Identical Stale Values ===");
      console.log("layers_base_equal(stale, staleCopy):", layers_base_equal(staleValue, staleCopy));
      console.log("layers_length_equal(stale, staleCopy):", layers_length_equal(staleValue, staleCopy));
      console.log("all_layers_value_equal(stale, staleCopy):", all_layers_value_equal(staleValue, staleCopy));
      console.log("layered_deep_equal(stale, staleCopy):", layered_deep_equal(staleValue, staleCopy));
      
      expect(layered_deep_equal(staleValue, staleCopy)).toBe(true);
    });

    test("should show what logs showed - stale vs fresh comparison", () => {
      const staleValue = construct_layered_datum(
        10,
        vector_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      const freshValue = construct_layered_datum(
        10,  // SAME base value - this is the key!
        vector_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      console.log("\n=== Combined: Same Base Value ===");
      console.log("layers_base_equal(stale, fresh):", layers_base_equal(staleValue, freshValue));
      console.log("layers_length_equal(stale, fresh):", layers_length_equal(staleValue, freshValue));
      console.log("all_layers_value_equal(stale, fresh):", all_layers_value_equal(staleValue, freshValue));
      console.log("layered_deep_equal(stale, fresh):", layered_deep_equal(staleValue, freshValue));
      
      expect(layered_deep_equal(staleValue, freshValue)).toBe(true);
    });

    test("should match exact log scenario from failing test", () => {
      // This matches the exact log output:
      // layered_deep_equal called with args: [10, victor_clock: {}, support: [object], base: 10]
      // layered_deep_equal returned: false
      
      const obj1 = construct_layered_datum(
        10,
        vector_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      const obj2 = construct_layered_datum(
        10,
        vector_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      console.log("\n=== Exact Log Scenario ===");
      console.log("Object 1:", obj1);
      console.log("Object 2:", obj2);
      
      const result = layered_deep_equal(obj1, obj2);
      console.log("layered_deep_equal result:", result);
      console.log("Expected: true");
      console.log("Actual:", result);
      
      // This should pass - objects are identical
      expect(result).toBe(true);
    });
  });

  describe("Cross-Workspace Test - Direct Equality Check", () => {
    test("should verify all equality components work in propagator context", () => {
      const obj1 = construct_layered_datum(
        10,
        vector_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      const obj2 = construct_layered_datum(
        10,
        vector_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      console.log("\n=== Full Component Check ===");
      
      // Check each component
      const baseEqual = layers_base_equal(obj1, obj2);
      const lengthEqual = layers_length_equal(obj1, obj2);
      const allLayersEqual = all_layers_value_equal(obj1, obj2);
      const deepEqual = layered_deep_equal(obj1, obj2);
      
      console.log("1. layers_base_equal:", baseEqual);
      console.log("2. layers_length_equal:", lengthEqual);
      console.log("3. all_layers_value_equal:", allLayersEqual);
      console.log("4. layered_deep_equal:", deepEqual);
      
      // Check layer values directly
      const clock1 = vector_clock_layer.get_value(obj1);
      const clock2 = vector_clock_layer.get_value(obj2);
      const support1 = support_layer.get_value(obj1);
      const support2 = support_layer.get_value(obj2);
      
      console.log("\nDirect layer equality:");
      console.log("5. is_equal(clock1, clock2):", is_equal(clock1, clock2));
      console.log("6. is_equal(support1, support2):", is_equal(support1, support2));
      
      // All should be true
      expect(baseEqual).toBe(true);
      expect(lengthEqual).toBe(true);
      expect(allLayersEqual).toBe(true);
      expect(deepEqual).toBe(true);
      expect(is_equal(clock1, clock2)).toBe(true);
      expect(is_equal(support1, support2)).toBe(true);
    });
  });
});
