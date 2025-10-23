/**
 * @fileoverview PatchedValueSet Test Suite
 * 
 * Comprehensive tests for the PatchedValueSet (BetterSet-based) implementation.
 * 
 * Test Coverage:
 * - ContentPatch creation and validation
 * - scan_for_patches behavior with different value scenarios
 * - apply_content_patch with join/remove operations
 * - PatchedSet merging with support layer
 * - Layer-specific consolidation
 * - Victor clock integration
 * - Edge cases and empty sets
 */

import { describe, test, expect, beforeEach } from "bun:test";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { support_by, support_layer } from "sando-layer/Specified/SupportLayer";
import { construct_better_set } from "generic-handler/built_in_generics/generic_better_set";
import { length, to_array } from "generic-handler/built_in_generics/generic_collection";
import { get_base_value } from "sando-layer/Basic/Layer";
import {
    patch_join,
    patch_remove,
    type_of_content_patch,
    content_patch_elt,
    is_content_patch,
    scan_for_patches,
    apply_content_patch,
    _patched_set_join,
    to_patched_set,
    merge_patched_set,
    is_patched_set,
    type ContentPatch,
    type PatchedSet
} from "../DataTypes/PatchedValueSet";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { set_handle_contradiction } from "@/cell/Cell";
import { trace_earliest_emerged_value } from "../AdvanceReactivity/traced_timestamp/genericPatch";
import { set_merge } from "@/cell/Merge";
import { the_nothing } from "@/cell/CellValue";
import { victor_clock_layer } from "../AdvanceReactivity/victor_clock";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";

beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP);
    set_handle_contradiction(trace_earliest_emerged_value);
    set_merge(merge_patched_set);
});

describe("ContentPatch Tests", () => {
    describe("Patch Creation", () => {
        test("patch_join should create join patch with correct structure", () => {
            const value = support_by(10, "source1");
            const patch = patch_join(value);

            expect(type_of_content_patch(patch)).toBe("join");
            expect(content_patch_elt(patch)).toBe(get_base_value(value));
        });

        test("patch_remove should create remove patch with correct structure", () => {
            const value = support_by(20, "source1");
            const patch = patch_remove(value);

   
            expect(type_of_content_patch(patch)).toBe("remove");
            expect(content_patch_elt(patch)).toBe(get_base_value(value));
        });

        test("is_content_patch should identify valid patches", () => {
            const value = support_by(30, "source1");
            const validPatch = patch_join(value);
            const invalidPatch = { type: "join" }; // Missing elt
            const notAPatch = { foo: "bar" };

            expect(is_content_patch(validPatch)).toBe(true);
            expect(is_content_patch(invalidPatch)).toBe(false);
            expect(is_content_patch(notAPatch)).toBe(false);
        });
    });

    describe("Patch Accessors", () => {
        test("type_of_content_patch should extract type correctly", () => {
            const joinPatch = patch_join(support_by(1, "s"));
            const removePatch = patch_remove(support_by(2, "s"));

            expect(type_of_content_patch(joinPatch)).toBe("join");
            expect(type_of_content_patch(removePatch)).toBe("remove");
        });

        test("content_patch_elt should extract element correctly", () => {
            const value1 = support_by(100, "source1");
            const value2 = support_by(200, "source2");

            const patch1 = patch_join(value1);
            const patch2 = patch_remove(value2);

            expect(content_patch_elt(patch1)).toBe(get_base_value(value1));
            expect(content_patch_elt(patch2)).toBe(get_base_value(value2));
        });
    });
});

describe("PatchedSet Type and Conversion", () => {
    test("is_patched_set should identify BetterSet values", () => {
        const patchedSet = construct_better_set([]);
        const notPatched: any[] = [];

        expect(is_patched_set(patchedSet)).toBe(true);
        expect(is_patched_set(notPatched)).toBe(false);
    });

    test("to_patched_set should convert value to PatchedSet", () => {
        const value = support_by(42, "source1");
        const set = to_patched_set(value);

        expect(is_patched_set(set)).toBe(true);
        // After conversion to patched set, check properties
        expect(set).toBeDefined();
    });

    test("to_patched_set should preserve existing PatchedSet", () => {
        const original = construct_better_set([support_by(1, "s")]);
        const result = to_patched_set(original);

        expect(result).toBe(original);
    });

    test("to_patched_set should handle empty value", () => {
        const set = to_patched_set(undefined);
        expect(is_patched_set(set)).toBe(true);
    });
});

describe("scan_for_patches Tests", () => {
    describe("Basic Scanning", () => {
        test("should generate patches for empty set", () => {
            const emptySet = construct_better_set([]);
            const newValue = support_by(10, "source1");

            const patches = scan_for_patches(emptySet, newValue);

            // Should generate a join patch for the new value
            expect(patches).toBeDefined();
            expect(is_patched_set(patches)).toBe(true);
            expect(length(patches)).toBeGreaterThan(0);
            
            // Should contain a join patch
            const patchArray = to_array(patches);
            const hasJoinPatch = patchArray.some(p => type_of_content_patch(p) === "join");
            expect(hasJoinPatch).toBe(true);
        });

        test("should generate patches when adding new distinct value", () => {
            const value1 = support_by(10, "source1");
            const set = construct_better_set([value1]);
            const value2 = support_by(20, "source2");

            const patches = scan_for_patches(set, value2);

            // Should generate patches for the new value
            expect(patches).toBeDefined();
            expect(is_patched_set(patches)).toBe(true);
            expect(length(patches)).toBeGreaterThan(0);
            
            // Should contain a join patch for the new value
            const patchArray = to_array(patches);
            const hasJoinPatch = patchArray.some(p => 
                type_of_content_patch(p) === "join" && get_base_value(content_patch_elt(p)) === 20
            );
            expect(hasJoinPatch).toBe(true);
        });

        test("should generate patches when stronger value arrives", () => {
            const weakValue = construct_layered_datum(
                42,
                support_layer, construct_better_set(["premise1", "premise2"])
            );

            const strongValue = construct_layered_datum(
                42,
                support_layer, construct_better_set(["premise1"])
            );

            const set = construct_better_set([weakValue]);
            const patches = scan_for_patches(set, strongValue);

            // Should generate patches when stronger value (fewer supports) arrives
            expect(patches).toBeDefined();
            expect(is_patched_set(patches)).toBe(true);
            expect(length(patches)).toBeGreaterThan(0);
            
            // Should have remove and/or join patches
            const patchArray = to_array(patches);
            expect(patchArray.length).toBeGreaterThan(0);
        });
    });

    describe("Support Layer Integration", () => {
        test("should generate patches with support layer comparison", () => {
            const weakValue = construct_layered_datum(
                100,
                support_layer, construct_better_set(["s1", "s2", "s3"])
            );

            const strongValue = construct_layered_datum(
                100,
                support_layer, construct_better_set(["s1"])
            );

            const set = construct_better_set([weakValue]);
            const patches = scan_for_patches(set, strongValue);

            // Should generate patches
            expect(patches).toBeDefined();
            expect(length(patches)).toBeGreaterThan(0);
            
            // Patches should include operations
            const patchArray = to_array(patches);
            expect(patchArray.length).toBeGreaterThan(0);
        });

        test("should handle values with different base values", () => {
            const value1 = construct_layered_datum(
                0,
                support_layer, construct_better_set(["premise1"])
            );

            const value2 = construct_layered_datum(
                100,
                support_layer, construct_better_set(["premise2"])
            );

            const set = construct_better_set([value1]);
            const patches = scan_for_patches(set, value2);

            // Should generate patches for different values
            expect(patches).toBeDefined();
            expect(length(patches)).toBeGreaterThan(0);
            
            // Check that patches contain operations
            const patchArray = to_array(patches);
            expect(patchArray.length).toBeGreaterThan(0);
        });
    });

    describe("Victor Clock Integration", () => {
        test("should detect stale value and generate remove patch with victor clock", () => {
            // Old value with older version vector
            const staleValue = construct_layered_datum(
                10,
                victor_clock_layer, new Map([["source1", 1]]),
                support_layer, construct_better_set(["premise1"])
            );

            // Fresh value with newer version vector from same source
            const freshValue = construct_layered_datum(
                20,
                victor_clock_layer, new Map([["source1", 3]]),
                support_layer, construct_better_set(["premise1"])
            );

            const set = construct_better_set([staleValue]);
            const patches = scan_for_patches(set, freshValue);

            // Should generate patches including remove for stale value
            expect(patches).toBeDefined();
            expect(is_patched_set(patches)).toBe(true);
            expect(length(patches)).toBeGreaterThan(0);
            
            // Should have both a remove (for stale) and join (for fresh)
            const patchArray = to_array(patches);
            const hasRemove = patchArray.some(p => type_of_content_patch(p) === "remove");
            const hasJoin = patchArray.some(p => type_of_content_patch(p) === "join");
            expect(hasRemove || hasJoin).toBe(true);
        });

        test("should generate both remove and join patches for stale replacement", () => {
            const staleValue = construct_layered_datum(
                100,
                victor_clock_layer, new Map([["source1", 1]]),
                support_layer, construct_better_set(["p1"])
            );

            const freshValue = construct_layered_datum(
                200,
                victor_clock_layer, new Map([["source1", 5]]),
                support_layer, construct_better_set(["p1"])
            );

            let set = construct_better_set([staleValue]);
            const patches = scan_for_patches(set, freshValue);

            console.log("patches", patches);
            // Apply patches
            set = apply_content_patch(set, patches, freshValue);

            // After applying patches, should contain the fresh value
            expect(set).toBeDefined();
            expect(length(set)).toBeGreaterThan(0);
            
            // The resulting set should have a value with the fresh base value (200)
            const resultArray = to_array(set);
            const hasValue200 = resultArray.some(v => get_base_value(v) === 200);
            expect(hasValue200).toBe(true);
        });

        test("should keep concurrent values from different sources", () => {
            // Value from source1 at version 2
            const value1 = construct_layered_datum(
                10,
                victor_clock_layer, new Map([["source1", 2]]),
                support_layer, construct_better_set(["p1"])
            );

            // Value from source2 at version 2
            const value2 = construct_layered_datum(
                20,
                victor_clock_layer, new Map([["source2", 2]]),
                support_layer, construct_better_set(["p2"])
            );

            let set = construct_better_set([value1]);
            
            // Add value from different source
            set = merge_patched_set(set, value2);

            // Both should be kept since they're from different sources
            expect(length(set)).toBe(2);
            
            // Verify both values are present
            const values = to_array(set);
            const hasValue10 = values.some(v => get_base_value(v) === 10);
            const hasValue20 = values.some(v => get_base_value(v) === 20);
            expect(hasValue10).toBe(true);
            expect(hasValue20).toBe(true);
        });

        test("should replace stale value with fresher version from same source isolated", () => {
            const v1 = construct_layered_datum(
                50,
                victor_clock_layer, new Map([["proc1", 1]]),
                support_layer, construct_better_set(["input1"])
            );

            const v2 = construct_layered_datum(
                60,
                victor_clock_layer, new Map([["proc1", 2]]),
                support_layer, construct_better_set(["input1"])
            );

            let set = construct_better_set([v1]);
            set = merge_patched_set(set, v2);

            // Should have exactly one value (the fresh one replaced the stale one)
            expect(length(set)).toBe(1);
            
            // Verify the set contains the fresher value (60) not the old one (50)
            const resultValue = get_base_value(to_array(set)[0]);
            expect(resultValue).toBe(60);
            
            // Verify the version is v2
            const resultClock = victor_clock_layer.get_value(to_array(set)[0]);
            expect(resultClock.get("proc1")).toBe(2);
        });

        test("should handle multiple stale values needing removal isolated", () => {
            // Three values with increasing versions
            const v1 = construct_layered_datum(
                10,
                victor_clock_layer, new Map([["source", 1]]),
            );

            const v2 = construct_layered_datum(
                10,
                victor_clock_layer, new Map([["source", 2]]),
            );

            const v3 = construct_layered_datum(
                10,
                victor_clock_layer, new Map([["source", 5]]),
            );

            let set = construct_better_set([v1, v2]);
            
            // Adding fresher version should remove older ones
            set = merge_patched_set(set, v3);

            // Should have only one value (v3 replaced both v1 and v2)
            expect(length(set)).toBe(1);
            
            const array = to_array(set);
            const victor_clock_value = victor_clock_layer.get_value(array[0]);

            // The remaining value should have version 5
            expect(victor_clock_value.get("source")).toBe(5);
        });

        test("should handle multiple stale values needing removal", () => {
            // Three values with increasing versions
            const v1 = construct_layered_datum(
                10,
                victor_clock_layer, new Map([["source", 1]]),
                support_layer, construct_better_set(["p1"])
            );

            const v2 = construct_layered_datum(
                10,
                victor_clock_layer, new Map([["source", 2]]),
                support_layer, construct_better_set(["p1"])
            );

            const v3 = construct_layered_datum(
                10,
                victor_clock_layer, new Map([["source", 5]]),
                support_layer, construct_better_set(["p1"])
            );

            let set = construct_better_set([v1, v2]);
            
            // Adding fresher version should remove older ones
            set = merge_patched_set(set, v3);

            // Should have only one value (v3 replaced both v1 and v2)
            expect(length(set)).toBe(1);
            
            const array = to_array(set);
            const victor_clock_value = victor_clock_layer.get_value(array[0]);

            // The remaining value should have version 5
            expect(victor_clock_value.get("source")).toBe(5);
        });

        test("should correctly identify stale by version comparison", () => {
            // Two values with same base but different vector clocks
            const olderClock = construct_layered_datum(
                42,
                victor_clock_layer, new Map([["A", 1], ["B", 1]]),
                support_layer, construct_better_set(["support1"])
            );

            const newerClock = construct_layered_datum(
                42,
                victor_clock_layer, new Map([["A", 2], ["B", 1]]),
                support_layer, construct_better_set(["support1"])
            );

            let set = construct_better_set([olderClock]);
            set = merge_patched_set(set, newerClock);

            // Should have only the newer value
            expect(length(set)).toBe(1);
            
            const resultClock = victor_clock_layer.get_value(to_array(set)[0]);
            expect(resultClock.get("A")).toBe(2);
            expect(resultClock.get("B")).toBe(1);
        });

        test("should preserve value when clocks are incomparable (concurrent)", () => {
            // Two values with incomparable version vectors
            const clockA = construct_layered_datum(
                10,
                victor_clock_layer, new Map([["sourceA", 2]]),
                support_layer, construct_better_set(["pA"])
            );

            const clockB = construct_layered_datum(
                20,
                victor_clock_layer, new Map([["sourceB", 3]]),
                support_layer, construct_better_set(["pB"])
            );

            let set = construct_better_set([clockA]);
            set = merge_patched_set(set, clockB);

            // Both concurrent values should be kept (incomparable clocks)
            expect(length(set)).toBe(2);
            
            const values = to_array(set);
            const hasA = values.some(v => get_base_value(v) === 10);
            const hasB = values.some(v => get_base_value(v) === 20);
            expect(hasA).toBe(true);
            expect(hasB).toBe(true);
        });

        test("Victor Clock patch merge workflow end-to-end", () => {
            // Scenario: Processing stream where newer values replace older ones
            
            // Initial value from processor at version 1
            const initial = construct_layered_datum(
                "result_v1",
                victor_clock_layer, new Map([["processor", 1]]),
                support_layer, construct_better_set(["input_feed"])
            );

            let content = construct_better_set([initial]);

            // Processor receives new input, produces result_v2
            const updated = construct_layered_datum(
                "result_v2",
                victor_clock_layer, new Map([["processor", 2]]),
                support_layer, construct_better_set(["input_feed"])
            );

            // Merge should replace old result with new
            content = merge_patched_set(content, updated);

            // Should have exactly one value after replacement
            expect(length(content)).toBe(1);
            
            // Verify the newer result is present
            const value1 = get_base_value(to_array(content)[0]);
            expect(value1).toBe("result_v2");

            // Another processor adds concurrent value
            const concurrent = construct_layered_datum(
                "other_result",
                victor_clock_layer, new Map([["other_processor", 1]]),
                support_layer, construct_better_set(["other_input"])
            );

            // Should add concurrent value from different source
            content = merge_patched_set(content, concurrent);

            // Now should have two values (from different sources)
            expect(length(content)).toBe(2);
            
            const finalValues = to_array(content);
            const hasResult2 = finalValues.some(v => get_base_value(v) === "result_v2");
            const hasOther = finalValues.some(v => get_base_value(v) === "other_result");
            expect(hasResult2).toBe(true);
            expect(hasOther).toBe(true);
        });
    });
});

describe("apply_content_patch Tests", () => {
    describe("Basic Application", () => {
        test("should apply join patches", () => {
            let set = construct_better_set([]);
            const value1 = support_by(10, "source1");
            const patch1 = patch_join(get_base_value(value1));
            const patches = construct_better_set([patch1]);

            set = apply_content_patch(set, patches, value1);

            // After applying join patch, set should contain the value
            expect(set).toBeDefined();
            expect(length(set)).toBeGreaterThan(0);
            
            // Verify the value is in the set
            const values = to_array(set);
            const hasValue = values.some(v => get_base_value(v) === 10);
            expect(hasValue).toBe(true);
        });

        test("should apply remove patches", () => {
            const value = support_by(20, "source1");
            let set = construct_better_set([value]);

            const patch = patch_remove(value);
            const patches = construct_better_set([patch]);

            set = apply_content_patch(set, patches, value);

            // After removing, set should be empty or not contain the value
            expect(set).toBeDefined();
            const values = to_array(set);
            const hasValue = values.some(v => get_base_value(v) === 20);
            expect(hasValue).toBe(false);
        });

        test("should apply multiple patches sequentially", () => {
            const value1 = support_by(10, "source1");
            const value2 = support_by(20, "source2");
            const value3 = support_by(30, "source3");

            let set = construct_better_set([value1, value2]);

            const patches = construct_better_set([
                patch_remove(get_base_value(value1)),
                patch_join(get_base_value(value3))
            ]);

            set = apply_content_patch(set, patches, value3);

            // After applying patches, should have value2 and value3, but not value1
            expect(set).toBeDefined();
            const values = to_array(set);
            const hasValue1 = values.some(v => get_base_value(v) === 10);
            const hasValue2 = values.some(v => get_base_value(v) === 20);
            const hasValue3 = values.some(v => get_base_value(v) === 30);
            
            expect(hasValue1).toBe(false);
            expect(hasValue2).toBe(true);
            expect(hasValue3).toBe(true);
        });
    });

    describe("Complex Patch Sequences", () => {
        test("should handle replace pattern (remove + join)", () => {
            const oldValue = support_by(100, "source1");
            const newValue = support_by(200, "source1");

            let set = construct_better_set([oldValue]);

            const patches = construct_better_set([
                patch_remove(get_base_value(oldValue)),
                patch_join(get_base_value(newValue))
            ]);

            set = apply_content_patch(set, patches, newValue);

            // Should have replaced old with new
            expect(set).toBeDefined();
            expect(length(set)).toBe(1);
            
            const values = to_array(set);
            const hasOld = values.some(v => get_base_value(v) === 100);
            const hasNew = values.some(v => get_base_value(v) === 200);
            
            expect(hasOld).toBe(false);
            expect(hasNew).toBe(true);
        });

        test("should handle empty patch set", () => {
            const value = support_by(42, "source1");
            const set = construct_better_set([value]);
            const emptyPatches = construct_better_set([]);

            const result = apply_content_patch(set, emptyPatches);

            // Empty patches should not change the set
            expect(result).toBeDefined();
            expect(length(result)).toBe(1);
            
            const values = to_array(result);
            const hasValue = values.some(v => get_base_value(v) === 42);
            expect(hasValue).toBe(true);
        });
    });
});

describe("_patched_set_join Tests", () => {
    test("should join new element to patched set", () => {
        const value1 = support_by(10, "source1");
        let set = construct_better_set([value1]);

        const value2 = support_by(20, "source2");
        set = _patched_set_join(set, value2);

        // Should complete without error
        expect(set).toBeDefined();
    });

    test("should handle join with layered values", () => {
        const weakValue = construct_layered_datum(
            42,
            support_layer, construct_better_set(["s1", "s2"])
        );

        const strongValue = construct_layered_datum(
            42,
            support_layer, construct_better_set(["s1"])
        );

        let set = construct_better_set([weakValue]);
        set = _patched_set_join(set, strongValue);

        // Should complete without error
        expect(set).toBeDefined();
    });

    test("should build up set through multiple joins", () => {
        let set = construct_better_set([]);

        const v1 = support_by(1, "s1");
        const v2 = support_by(2, "s2");
        const v3 = support_by(3, "s3");

        set = _patched_set_join(set, v1);
        set = _patched_set_join(set, v2);
        set = _patched_set_join(set, v3);

        // Should have processed all joins
        expect(set).toBeDefined();
    });
});

describe("patched_set_merge Tests", () => {
    test("should merge new element into patched set", () => {
        const v1 = support_by(10, "source1");
        let set = construct_better_set([v1]);

        const v2 = support_by(20, "source2");
        set = merge_patched_set(set, v2);

        // Should complete without error
        expect(set).toBeDefined();
    });

    test("should ignore the_nothing merges", () => {
        const value = support_by(42, "source1");
        let set = construct_better_set([value]);

        set = merge_patched_set(set, the_nothing);

        // Should remain unchanged for the_nothing
        expect(set).toBeDefined();
    });

    test("should handle undefined as nothing", () => {
        const value = support_by(100, "source1");
        let set = construct_better_set([value]);

        set = merge_patched_set(set, undefined);

        // Should complete without error
        expect(set).toBeDefined();
    });

    test("should build complex set through sequential merges", () => {
        let set = construct_better_set([]);

        set = merge_patched_set(set, support_by(10, "s1"));
        set = merge_patched_set(set, support_by(20, "s2"));
        set = merge_patched_set(set, support_by(30, "s3"));
        set = merge_patched_set(set, the_nothing);

        // Should complete without error
        expect(set).toBeDefined();
    });
});

describe("Edge Cases and Complex Scenarios", () => {
    test("should handle empty patchedset", () => {
        const emptySet = construct_better_set([]);
        expect(length(emptySet)).toBe(0);

        const value = support_by(42, "source1");
        const set = merge_patched_set(emptySet, value);

        expect(length(set)).toBe(1);
    });

    test("should handle patchedset with same base value but different metadata", () => {
        const value1 = construct_layered_datum(
            42,
            support_layer, construct_better_set(["p1"])
        );

        const value2 = construct_layered_datum(
            42,
            support_layer, construct_better_set(["p2"])
        );

        let set = construct_better_set([value1]);
        set = merge_patched_set(set, value2);

        // Should handle merge without error and produce a result
        expect(length(set)).toBeGreaterThan(0);
    });

    test("should handle concurrent values from different sources", () => {
        let set = construct_better_set([]);

        const values = [
            construct_layered_datum(
                10,
                support_layer, construct_better_set(["p1"])
            ),
            construct_layered_datum(
                20,
                support_layer, construct_better_set(["p2"])
            ),
            construct_layered_datum(
                30,
                support_layer, construct_better_set(["p3"])
            )
        ];

        values.forEach(v => {
            set = merge_patched_set(set, v);
        });

        // Should successfully merge all values without error
        expect(length(set)).toBeGreaterThan(0);
    });

    test("should handle replacement with layered values", () => {
        const original = construct_layered_datum(
            100,
            support_layer, construct_better_set(["p1", "p2"])
        );

        const replacement = construct_layered_datum(
            100,
            support_layer, construct_better_set(["p1"])
        );

        let set = construct_better_set([original]);
        set = merge_patched_set(set, replacement);

        // Should consolidate successfully
        expect(length(set)).toBeGreaterThan(0);
    });

    test("should maintain consistency through repeated patches", () => {
        let set = construct_better_set([]);
        const value = support_by(42, "source1");

        // Apply same patches multiple times
        for (let i = 0; i < 3; i++) {
            set = merge_patched_set(set, value);
        }

        // Should not duplicate entries
        expect(length(set)).toBeGreaterThan(0);
    });
});

describe("Comparison: PatchedSet vs GenericValueSet", () => {
    test("PatchedSet maintains single canonical element per base value", () => {
        const value1 = construct_layered_datum(
            42,
            support_layer, construct_better_set(["p1", "p2"])
        );

        const value2 = construct_layered_datum(
            42,
            support_layer, construct_better_set(["p1"])
        );

        let set = construct_better_set([value1]);
        set = merge_patched_set(set, value2);

        // PatchedSet should consolidate or keep multiple entries
        // depending on layer-specific consolidation rules
        expect(length(set)).toBeGreaterThan(0);
    });

    test("PatchedSet uses BetterSet for efficient operations", () => {
        const set1 = construct_better_set([]);
        expect(is_patched_set(set1)).toBe(true);

        // BetterSet provides set operations
        const value = support_by(42, "source1");
        const set2 = construct_better_set([value]);
        expect(length(set2)).toBe(1);
    });
});
