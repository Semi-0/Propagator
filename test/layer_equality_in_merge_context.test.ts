import { describe, test, expect, beforeEach } from "bun:test";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { support_layer, construct_defualt_support_set } from "sando-layer/Specified/SupportLayer";
import { vector_clock_layer } from "../AdvanceReactivity/vector_clock";
import { layered_deep_equal, layers_base_equal, all_layers_value_equal } from "sando-layer/Equality";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { merge_generic_value_sets, to_generic_value_set, find_related_elements } from "../DataTypes/GenericValueSet";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { set_merge } from "@/cell/Merge";
import { trace_earliest_emerged_value } from "../AdvanceReactivity/traced_timestamp/genericPatch";
import { set_handle_contradiction } from "@/cell/Cell";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_handle_contradiction(trace_earliest_emerged_value);
  set_merge(merge_generic_value_sets);
});

describe("Layer Equality in Merge Context", () => {
  describe("Stale vs Fresh Value Scenario", () => {
    test("should find identical stale values as related elements", () => {
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
      
      const set = to_generic_value_set([staleValue]);
      
      console.log("\n=== Test 1: Finding related elements (stale vs stale copy) ===");
      console.log("staleValue equals staleCopy:", layered_deep_equal(staleValue, staleCopy));
      
      // Try to find related elements
      const related = find_related_elements(set, staleCopy);
      console.log("find_related_elements result length:", related.length);
      console.log("find_related_elements result:", related);
      
      expect(related.length).toBeGreaterThan(0);
    });

    test("should compare stale and fresh values from the test scenario", () => {
      const staleValue = construct_layered_datum(
        10,
        vector_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      const freshValue = construct_layered_datum(
        20,
        vector_clock_layer, new Map([["source1", 3]]),
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      console.log("\n=== Test 2: Stale vs Fresh (should be false) ===");
      console.log("layers_base_equal(stale, fresh):", layers_base_equal(staleValue, freshValue));
      console.log("all_layers_value_equal(stale, fresh):", all_layers_value_equal(staleValue, freshValue));
      console.log("layered_deep_equal(stale, fresh):", layered_deep_equal(staleValue, freshValue));
      
      expect(layered_deep_equal(staleValue, freshValue)).toBe(false);
    });

    test("should verify layer values directly from GenericValueSet merge", () => {
      const staleValue = construct_layered_datum(
        10,
        vector_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      const freshValue = construct_layered_datum(
        20,
        vector_clock_layer, new Map([["source1", 3]]),
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      const set = to_generic_value_set([staleValue]);
      
      console.log("\n=== Test 3: Direct layer value comparison ===");
      
      // Extract layer values
      const staleClk = vector_clock_layer.get_value(staleValue);
      const staleSupp = support_layer.get_value(staleValue);
      const freshClk = vector_clock_layer.get_value(freshValue);
      const freshSupp = support_layer.get_value(freshValue);
      
      console.log("Stale clock:", staleClk);
      console.log("Fresh clock:", freshClk);
      console.log("is_equal(staleClk, freshClk):", is_equal(staleClk, freshClk));
      
      console.log("Stale support:", staleSupp);
      console.log("Fresh support:", freshSupp);
      console.log("is_equal(staleSupp, freshSupp):", is_equal(staleSupp, freshSupp));
      
      expect(is_equal(staleClk, freshClk)).toBe(false);
      expect(is_equal(staleSupp, freshSupp)).toBe(true);
    });
  });
});
