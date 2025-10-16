import { describe, test, expect } from "bun:test";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { support_layer, construct_defualt_support_set } from "sando-layer/Specified/SupportLayer";
import { victor_clock_layer } from "../AdvanceReactivity/victor_clock";
import { layered_deep_equal, layers_base_equal, all_layers_value_equal, layers_length_equal } from "sando-layer/Equality";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";

describe("Layer Equality Isolation Tests", () => {
  describe("Support Layer Equality", () => {
    test("should compare identical support sets", () => {
      const set1 = construct_defualt_support_set(["premise1"]);
      const set2 = construct_defualt_support_set(["premise1"]);
      
      console.log("Support set1:", set1);
      console.log("Support set2:", set2);
      console.log("is_equal(set1, set2):", is_equal(set1, set2));
      
      expect(is_equal(set1, set2)).toBe(true);
    });

    test("should compare objects with identical support layers", () => {
      const obj1 = construct_layered_datum(
        10,
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      const obj2 = construct_layered_datum(
        10,
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      const support1 = support_layer.get_value(obj1);
      const support2 = support_layer.get_value(obj2);
      
      console.log("Support value 1:", support1);
      console.log("Support value 2:", support2);
      console.log("is_equal(support1, support2):", is_equal(support1, support2));
      console.log("all_layers_value_equal(obj1, obj2):", all_layers_value_equal(obj1, obj2));
      console.log("layered_deep_equal(obj1, obj2):", layered_deep_equal(obj1, obj2));
      
      expect(is_equal(support1, support2)).toBe(true);
    });
  });

  describe("Victor Clock Layer Equality", () => {
    test("should compare identical version vectors", () => {
      const clock1 = new Map([["source1", 1]]);
      const clock2 = new Map([["source1", 1]]);
      
      console.log("Clock1:", clock1);
      console.log("Clock2:", clock2);
      console.log("is_equal(clock1, clock2):", is_equal(clock1, clock2));
      
      expect(is_equal(clock1, clock2)).toBe(true);
    });

    test("should compare objects with identical victor clock layers", () => {
      const obj1 = construct_layered_datum(
        10,
        victor_clock_layer, new Map([["source1", 1]])
      );
      
      const obj2 = construct_layered_datum(
        10,
        victor_clock_layer, new Map([["source1", 1]])
      );
      
      const clock1 = victor_clock_layer.get_value(obj1);
      const clock2 = victor_clock_layer.get_value(obj2);
      
      console.log("Clock value 1:", clock1);
      console.log("Clock value 2:", clock2);
      console.log("is_equal(clock1, clock2):", is_equal(clock1, clock2));
      console.log("all_layers_value_equal(obj1, obj2):", all_layers_value_equal(obj1, obj2));
      console.log("layered_deep_equal(obj1, obj2):", layered_deep_equal(obj1, obj2));
      
      expect(is_equal(clock1, clock2)).toBe(true);
    });
  });

  describe("Combined Layer Equality", () => {
    test("should compare objects with both support and victor clock layers", () => {
      const obj1 = construct_layered_datum(
        10,
        support_layer, construct_defualt_support_set(["premise1"]),
        victor_clock_layer, new Map([["source1", 1]])
      );
      
      const obj2 = construct_layered_datum(
        10,
        support_layer, construct_defualt_support_set(["premise1"]),
        victor_clock_layer, new Map([["source1", 1]])
      );
      
      console.log("\n=== Combined Layers ===");
      console.log("layers_base_equal(obj1, obj2):", layers_base_equal(obj1, obj2));
      console.log("layers_length_equal(obj1, obj2):", layers_length_equal(obj1, obj2));
      console.log("all_layers_value_equal(obj1, obj2):", all_layers_value_equal(obj1, obj2));
      console.log("layered_deep_equal(obj1, obj2):", layered_deep_equal(obj1, obj2));
      
      expect(layered_deep_equal(obj1, obj2)).toBe(true);
    });

    test("should match the test scenario exactly - stale vs stale copy", () => {
      const staleValue = construct_layered_datum(
        10,
        victor_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      const staleCopy = construct_layered_datum(
        10,
        victor_clock_layer, new Map([["source1", 1]]),
        support_layer, construct_defualt_support_set(["premise1"])
      );
      
      // These SHOULD be equal (identical in all layers)
      console.log("\n=== Stale vs Stale Copy (should be true) ===");
      console.log("layers_base_equal(staleValue, staleCopy):", layers_base_equal(staleValue, staleCopy));
      console.log("layers_length_equal(staleValue, staleCopy):", layers_length_equal(staleValue, staleCopy));
      console.log("all_layers_value_equal(staleValue, staleCopy):", all_layers_value_equal(staleValue, staleCopy));
      console.log("layered_deep_equal(staleValue, staleCopy):", layered_deep_equal(staleValue, staleCopy));
      
      expect(layered_deep_equal(staleValue, staleCopy)).toBe(true);
    });
  });
});
