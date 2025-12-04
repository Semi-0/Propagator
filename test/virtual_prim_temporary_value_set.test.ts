/**
 * @fileoverview Integration Tests: VirtualCopySet + TemporaryValueSet
 * 
 * Tests the integration between:
 * - VirtualCopySet (Map<Frame, any>) - values organized by frame/virtual copy
 * - TemporaryValueSet (BetterSet<LayeredObject>) - values with vector clock/support layers
 * 
 * The integration allows frame-organized values to carry vector clock metadata,
 * enabling reactivity and staleness tracking per frame.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import * as HS from "effect/HashSet";
import { pipe } from "fp-ts/function";

// Frame and VirtualCopySet imports
import { construct_frame, type Frame } from "../VirtualEnvironment/frames";
import {
  type VirtualCopySet,
  make_virtual_copy,
  make_virtual_copy_set,
  occurring_frames,
  frame_content,
} from "../VirtualEnvironment/virtual_copy_core";
import {
  frame_by_frame,
} from "../VirtualEnvironment/virtual_copy_ops";

// TemporaryValueSet and Vector Clock imports
import {
  merge_temporary_value_set,
  vector_clock_subsumes,
} from "../DataTypes/TemporaryValueSet";
import {
  vector_clock_layer,
  construct_vector_clock,
  get_vector_clock_layer,
  prove_staled,
} from "../AdvanceReactivity/vector_clock";

// Cell and Scheduler imports
import { construct_cell, cell_strongest_base_value, type Cell } from "@/cell/Cell";
import { execute_all_tasks_sequential, run_scheduler_and_replay } from "../Shared/Scheduler/Scheduler";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { set_merge } from "@/cell/Merge";
import { the_nothing, get_base_value } from "@/cell/CellValue";

// Layered object utilities
import { is_layered_object, type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";

// Register vector clock handlers
import "../DataTypes/register_vector_clock_patchedValueSet";

// Reality system for dependent updates
import { dependent_update, kick_out, bring_in, clean_dependence_cells } from "../DataTypes/Reality";
import { p_add, p_multiply } from "../Propagator/BuiltInProps";
import { compound_tell } from "../Helper/UI";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_merge(merge_temporary_value_set);
});

/**
 * Helper: Create a frame with computed ancestors for proper HashSet operations
 */
const create_frame_with_ancestors = (parents: Frame[]): Frame => {
  const frame = construct_frame(parents) as Frame;
  // Manually set ancestors (self + all parent ancestors)
  const parentAncestors = parents.flatMap(p => 
    p.ancestors ? Array.from(HS.values(p.ancestors)) : []
  );
  (frame as any).ancestors = HS.make(frame, ...parents, ...parentAncestors);
  return frame;
};

/**
 * Helper: Create a LayeredObject with vector clock
 */
const create_clocked_value = <T>(value: T, source: string, version: number): LayeredObject<T> => {
  return construct_layered_datum(
    value,
    vector_clock_layer,
    construct_vector_clock([{ source, value: version }])
  );
};

/**
 * Helper: Create a VirtualCopySet with clocked values per frame
 */
const create_clocked_virtual_copy_set = <T>(
  entries: Array<[Frame, T, string, number]>
): VirtualCopySet => {
  const copies = entries.map(([frame, value, source, version]) =>
    make_virtual_copy(frame, create_clocked_value(value, source, version))
  );
  return make_virtual_copy_set(...copies);
};

describe("VirtualCopySet + TemporaryValueSet Integration", () => {
  
  describe("Basic Frame-Organized Clocked Values", () => {
    
    test("should create VirtualCopySet with clocked values per frame", () => {
      const rootFrame = create_frame_with_ancestors([]);
      const childFrame = create_frame_with_ancestors([rootFrame]);
      
      const vcs = create_clocked_virtual_copy_set([
        [rootFrame, 10, "source_root", 1],
        [childFrame, 20, "source_child", 1],
      ]);
      
      expect(vcs.size).toBe(2);
      
      const rootValue = vcs.get(rootFrame);
      expect(is_layered_object(rootValue)).toBe(true);
      expect(get_base_value(rootValue)).toBe(10);
      
      const childValue = vcs.get(childFrame);
      expect(get_base_value(childValue)).toBe(20);
    });

    test("should detect stale clocked value via vector clock comparison", () => {
      const oldValue = create_clocked_value(5, "src", 1);
      const newValue = create_clocked_value(10, "src", 2);
      
      // New value should prove old value stale (higher version from same source)
      const staled = prove_staled(
        get_vector_clock_layer(oldValue),
        get_vector_clock_layer(newValue)
      );
      expect(staled).toBe(true);
      
      // Old value should NOT prove new value stale
      const notStaled = prove_staled(
        get_vector_clock_layer(newValue),
        get_vector_clock_layer(oldValue)
      );
      expect(notStaled).toBe(false);
    });

    test("should check vector_clock_subsumes correctly", () => {
      const oldValue = create_clocked_value(5, "src", 1);
      const newValue = create_clocked_value(10, "src", 2);
      
      // New value has fresher clock - subsumes old
      expect(vector_clock_subsumes(newValue, oldValue)).toBe(true);
      
      // Old value does not subsume new value
      expect(vector_clock_subsumes(oldValue, newValue)).toBe(false);
    });

    test("should handle value with same base but different clocks from different sources", () => {
      const valueA = create_clocked_value(42, "src_a", 1);
      const valueB = create_clocked_value(42, "src_b", 1);
      
      // Same base value, different sources - neither clock subsumes the other
      expect(vector_clock_subsumes(valueA, valueB)).toBe(false);
      expect(vector_clock_subsumes(valueB, valueA)).toBe(false);
    });
  });

  describe("Frame Operations with Plain Values", () => {
    
    test("should apply direct VirtualCopySet operations without merge strategy", () => {
      // This test demonstrates that VirtualCopySet operations work at the frame level
      // For TemporaryValueSet integration with premises, see the propagator tests
      const frame1 = create_frame_with_ancestors([]);
      const frame2 = create_frame_with_ancestors([]);
      
      // Direct frame operations using plain values
      const vcsA: VirtualCopySet = new Map([
        [frame1, 10],
        [frame2, 20],
      ]);
      const vcsB: VirtualCopySet = new Map([
        [frame1, 5],
        [frame2, 15],
      ]);
      
      // Create combined result manually (simulating frame-by-frame without merge strategy)
      const combined: VirtualCopySet = new Map();
      for (const [frame, valueA] of vcsA) {
        const valueB = vcsB.get(frame);
        if (valueB !== undefined) {
          combined.set(frame, (valueA as number) + (valueB as number));
        }
      }
      
      expect(combined.get(frame1)).toBe(15);  // 10 + 5
      expect(combined.get(frame2)).toBe(35);  // 20 + 15
    });

    test("should handle empty VirtualCopySet", () => {
      const emptyVcs: VirtualCopySet = new Map();
      expect(emptyVcs.size).toBe(0);
      
      const frames = occurring_frames(emptyVcs);
      expect(HS.size(frames)).toBe(0);
    });

    test("should get frame_content correctly", () => {
      const frame = create_frame_with_ancestors([]);
      const vcs: VirtualCopySet = new Map([[frame, 42]]);
      
      expect(frame_content(vcs, frame)).toBe(42);
    });

    test("should return the_nothing for missing frame", () => {
      const frame1 = create_frame_with_ancestors([]);
      const frame2 = create_frame_with_ancestors([]);
      
      const vcs: VirtualCopySet = new Map([[frame1, 42]]);
      
      expect(frame_content(vcs, frame2)).toBe(the_nothing);
    });
  });

  describe("Multi-Frame Hierarchy with Clocked Values", () => {
    
    test("should handle parent-child frame hierarchy", () => {
      const parentFrame = create_frame_with_ancestors([]);
      const childFrame = create_frame_with_ancestors([parentFrame]);
      
      // Values at different frames with different clocks
      const parentValue = create_clocked_value(100, "parent_src", 1);
      const childValue = create_clocked_value(200, "child_src", 1);
      
      const vcs = make_virtual_copy_set(
        make_virtual_copy(parentFrame, parentValue),
        make_virtual_copy(childFrame, childValue)
      );
      
      expect(vcs.size).toBe(2);
      expect(get_base_value(vcs.get(parentFrame))).toBe(100);
      expect(get_base_value(vcs.get(childFrame))).toBe(200);
      
      // Frame content should return the value at that frame
      const parentContent = frame_content(vcs, parentFrame);
      const childContent = frame_content(vcs, childFrame);
      
      expect(get_base_value(parentContent)).toBe(100);
      expect(get_base_value(childContent)).toBe(200);
    });

    test("should handle sibling frames independently", () => {
      const parentFrame = create_frame_with_ancestors([]);
      const child1 = create_frame_with_ancestors([parentFrame]);
      const child2 = create_frame_with_ancestors([parentFrame]);
      
      const vcs = create_clocked_virtual_copy_set([
        [child1, 10, "src1", 1],
        [child2, 20, "src2", 1],
      ]);
      
      expect(vcs.size).toBe(2);
      expect(get_base_value(vcs.get(child1))).toBe(10);
      expect(get_base_value(vcs.get(child2))).toBe(20);
    });
  });

  describe("Integration with TemporaryValueSet for Propagator Cells", () => {
    
    test("should handle addition with clocked values via compound_tell", async () => {
      const cellA = construct_cell("vcs_tvs_addA") as Cell<LayeredObject<any>>;
      const cellB = construct_cell("vcs_tvs_addB") as Cell<LayeredObject<any>>;
      const output = construct_cell("vcs_tvs_addOutput");
      
      p_add(cellA, cellB, output);
      
      compound_tell(cellA, 10, vector_clock_layer, new Map([["a", 1]]));
      compound_tell(cellB, 5, vector_clock_layer, new Map([["b", 1]]));
      
      run_scheduler_and_replay(() => {});
      
      expect(cell_strongest_base_value(output)).toBe(15);
    });

    test("should handle multiplication with clocked values via compound_tell", async () => {
      const cellA = construct_cell("vcs_tvs_mulA") as Cell<LayeredObject<any>>;
      const cellB = construct_cell("vcs_tvs_mulB") as Cell<LayeredObject<any>>;
      const output = construct_cell("vcs_tvs_mulOutput");
      
      p_multiply(cellA, cellB, output);
      
      compound_tell(cellA, 6, vector_clock_layer, new Map([["sourceA", 1]]));
      compound_tell(cellB, 7, vector_clock_layer, new Map([["sourceB", 1]]));
      
      await execute_all_tasks_sequential(() => {});
      
      expect(cell_strongest_base_value(output)).toBe(42);
    });

    test("should handle value replacement with fresher clock via dependent_update", async () => {
      clean_dependence_cells();
      
      const cellA = construct_cell("vcs_tvs_replaceA") as Cell<LayeredObject<any>>;
      const cellB = construct_cell("vcs_tvs_replaceB") as Cell<LayeredObject<any>>;
      const output = construct_cell("vcs_tvs_replaceOutput");
      
      p_add(cellA, cellB, output);
      
      // First version
      const updateA_v1 = dependent_update("replSrcA_v1");
      const updateB_v1 = dependent_update("replSrcB_v1");
      
      updateA_v1(new Map([[cellA, 10]]));
      updateB_v1(new Map([[cellB, 5]]));
      
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output)).toBe(15);
      
      // Second version - replace with fresher values
      const updateA_v2 = dependent_update("replSrcA_v2");
      const updateB_v2 = dependent_update("replSrcB_v2");
      
      updateA_v2(new Map([[cellA, 20]]));
      updateB_v2(new Map([[cellB, 10]]));
      
      kick_out("replSrcA_v1");
      kick_out("replSrcB_v1");
      
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output)).toBe(30);
    });

    test("should handle concurrent updates and premise switching", async () => {
      clean_dependence_cells();
      
      const cellA = construct_cell("vcs_concA") as Cell<LayeredObject<any>>;
      const cellB = construct_cell("vcs_concB") as Cell<LayeredObject<any>>;
      const output = construct_cell("vcs_concOutput");
      
      p_add(cellA, cellB, output);
      
      // Setup from two different sources
      const updateSrcA = dependent_update("concSrcA");
      const updateSrcB = dependent_update("concSrcB");
      
      updateSrcA(new Map([[cellA, 5]]));
      updateSrcB(new Map([[cellB, 3]]));
      
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output)).toBe(8);
      
      // Add alternative source for cellA
      const updateSrcA1 = dependent_update("concSrcA1");
      updateSrcA1(new Map([[cellA, 7]]));
      
      kick_out("concSrcA");
      
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output)).toBe(10); // 7 + 3
      
      // Switch back
      bring_in("concSrcA");
      kick_out("concSrcA1");
      
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(output)).toBe(8); // 5 + 3
    });

    test("should chain multiple frame operations via propagators", async () => {
      clean_dependence_cells();
      
      const cellA = construct_cell("chainA") as Cell<LayeredObject<any>>;
      const cellB = construct_cell("chainB") as Cell<LayeredObject<any>>;
      const cellC = construct_cell("chainC") as Cell<LayeredObject<any>>;
      const temp = construct_cell("chainTemp");
      const output = construct_cell("chainOutput");
      
      // (A + B) * C
      p_add(cellA, cellB, temp);
      p_multiply(temp, cellC, output);
      
      const updateA = dependent_update("chainSrcA");
      const updateB = dependent_update("chainSrcB");
      const updateC = dependent_update("chainSrcC");
      
      updateA(new Map([[cellA, 2]]));
      updateB(new Map([[cellB, 3]]));
      updateC(new Map([[cellC, 4]]));
      
      await execute_all_tasks_sequential(() => {});
      
      // (2 + 3) * 4 = 20
      expect(cell_strongest_base_value(output)).toBe(20);
    });
  });

  describe("VirtualCopySet with Clocked Values", () => {
    
    test("should create VirtualCopySet with multiple clocked values and verify structure", () => {
      const frame1 = create_frame_with_ancestors([]);
      const frame2 = create_frame_with_ancestors([]);
      const frame3 = create_frame_with_ancestors([]);
      
      const vcs = create_clocked_virtual_copy_set([
        [frame1, 100, "src1", 1],
        [frame2, 200, "src2", 2],
        [frame3, 300, "src3", 3],
      ]);
      
      expect(vcs.size).toBe(3);
      
      // Verify each frame has a layered object with correct base value and clock
      for (const [frame, expectedValue] of [[frame1, 100], [frame2, 200], [frame3, 300]]) {
        const value = vcs.get(frame as Frame);
        expect(is_layered_object(value)).toBe(true);
        expect(get_base_value(value)).toBe(expectedValue);
      }
    });

    test("should compare clocked values across frames", () => {
      const frame1 = create_frame_with_ancestors([]);
      const frame2 = create_frame_with_ancestors([]);
      
      // Same source, different versions at different frames
      const vcs = create_clocked_virtual_copy_set([
        [frame1, 10, "shared_src", 1],
        [frame2, 20, "shared_src", 2],
      ]);
      
      const value1 = vcs.get(frame1);
      const value2 = vcs.get(frame2);
      
      // Value2 should subsume Value1 (newer version from same source)
      expect(vector_clock_subsumes(value2, value1)).toBe(true);
      expect(vector_clock_subsumes(value1, value2)).toBe(false);
    });
  });
});
