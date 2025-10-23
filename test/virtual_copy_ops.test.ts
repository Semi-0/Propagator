import { describe, test, expect } from "bun:test";

import { construct_frame, frame_with_identity } from "../VirtualEnvironment/frames";

import { type VirtualCopySet, occurring_frames, full_frame_content } from "../VirtualEnvironment/virtual_copy_core";

import { is_lexical_invariant, virtual_copy_set_equal, virtual_copy_merge_constructor, virtual_copy_contradictory, find_the_occcurrence_parent } from "../VirtualEnvironment/virtual_copy_ops";

import { virtual_copy_of, virtual_copy_from_entries } from "../VirtualEnvironment/virtual_copy_helpers";

describe("virtual_copy ops", () => {
  test("occurring_frames returns frames from keys", () => {
    const fid = construct_frame([]);
    const f = frame_with_identity(fid);
    const cs: VirtualCopySet = new Map([[f.identity, 1]]);
    const occ = occurring_frames(cs);
    expect(occ.length).toBe(1);
    expect(occ[0].identity).toBe(f.identity);
  });

  test("full_frame_content merges ancestors (default strategy: prefer later)", () => {
    const pid = construct_frame([]);
    const parent = frame_with_identity(pid);
    const cid = construct_frame([parent]);
    const child = frame_with_identity(cid);
    const cs = new Map([
      [parent.identity, 1],
      [child.identity, 2],
    ]);
    expect(full_frame_content(cs, child)).toBe(2);
  });

  test("is_lexical_invariant true for simple chain", () => {
    const fid = construct_frame([]);
    const f = frame_with_identity(fid);
    const cs = virtual_copy_of(f, 1);
    expect(is_lexical_invariant(cs)).toBe(true);
  });

  test("virtual_copy_set_equal compares by full_frame_content", () => {
    const fid = construct_frame([]);
    const f = frame_with_identity(fid);
    const a = virtual_copy_of(f, 1);
    const b = virtual_copy_from_entries([[f, 1]]);
    expect(virtual_copy_set_equal(a, b)).toBe(true);
  });

  test("virtual_copy_merge uses cell_merge default", () => {
    const fid = construct_frame([]);
    const f = frame_with_identity(fid);
    const a = virtual_copy_of(f, 1);
    const b = virtual_copy_of(f, 2);
    const m = virtual_copy_merge_constructor(a, b);
    expect(m.get(f.identity)).toBeDefined();
  });

  test("find_the_occcurrence_parent returns Some when parent occurs", () => {
    const pid = construct_frame([]);
    const parent = frame_with_identity(pid);
    const cid = construct_frame([parent]);
    const child = frame_with_identity(cid);
    const anchor = virtual_copy_of(parent, "x");
    const r = find_the_occcurrence_parent(anchor, child);
    expect((r as any)._tag).toBe("Some");
  });
});


