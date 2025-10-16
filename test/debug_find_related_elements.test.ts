import { describe, test, expect, beforeEach } from "bun:test";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { support_layer, construct_defualt_support_set } from "sando-layer/Specified/SupportLayer";
import { victor_clock_layer } from "../AdvanceReactivity/victor_clock";
import { layered_deep_equal } from "sando-layer/Equality";
import { to_generic_value_set, find_related_elements } from "../DataTypes/GenericValueSet";
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

describe("Debug: What is find_related_elements Passing to layered_deep_equal?", () => {
  test("trace the exact values passed to layered_deep_equal from find_related_elements", () => {
    const staleValue = construct_layered_datum(
      10,
      victor_clock_layer, new Map([["source1", 1]]),
      support_layer, construct_defualt_support_set(["premise1"])
    );
    
    const freshValue = construct_layered_datum(
      20,
      victor_clock_layer, new Map([["source1", 3]]),
      support_layer, construct_defualt_support_set(["premise1"])
    );
    
    const set = to_generic_value_set([staleValue]);
    
    console.log("\n=== Input to find_related_elements ===");
    console.log("set (array of LayeredObjects):");
    console.log("  - staleValue: base=10, clock={source1:1}");
    console.log("freshValue: base=20, clock={source1:3}");
    
    console.log("\n=== Calling find_related_elements ===");
    const related = find_related_elements(set, freshValue);
    
    console.log("\n=== Output from find_related_elements ===");
    console.log("related:", related);
    console.log("related.length:", related.length);
    console.log("related[0]:", related[0]);
    console.log("related[1]:", related[1]);
    
    console.log("\n=== Type Analysis ===");
    console.log("typeof related[0]:", typeof related[0]);
    console.log("Is related[0] a Layer?:", related[0]?.get_name !== undefined);
    console.log("Is related[0] a LayeredObject?:", related[0]?.identifier === "layered_object");
    
    console.log("\n=== The Problem ===");
    if (related.length > 0 && related[0]?.get_name !== undefined) {
      console.log("❌ WRONG: related[0] is a LAYER object, not a LayeredObject!");
      console.log("This is what's being passed where LayeredObjects are expected");
    }
    
    if (related.length > 0 && Array.isArray(related[1])) {
      console.log("❌ WRONG: related[1] is an array containing malformed data");
      console.log("Data structure is:", related[1]);
      
      if (related[1][0]?.identifier === "layered_object") {
        console.log("✅ But it DOES contain a layered_object at [1][0]");
        
        // Try comparing that to freshValue
        console.log("\n=== What layered_deep_equal is probably receiving ===");
        console.log("Comparing related[1][0] vs freshValue");
        const result = layered_deep_equal(related[1][0], freshValue);
        console.log("Result:", result);
      }
    }
  });
});
