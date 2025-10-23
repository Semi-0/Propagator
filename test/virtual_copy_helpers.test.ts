import { describe, test, expect } from "bun:test";

import { construct_frame, frame_with_identity } from "../VirtualEnvironment/frames";
import { type VirtualCopySet } from "../VirtualEnvironment/virtual_copy_core";
import { empty_virtual_copy, virtual_copy_of, virtual_copy_from_entries, virtual_copy_set_binding, virtual_copy_list } from "../VirtualEnvironment/virtual_copy_helpers";
import { is_virtual_copy_set, is_virtual_copy_list } from "../VirtualEnvironment/virtual_copy_core";

describe("VirtualCopySet helper ergonomics", () => {
  test("empty_virtual_copy returns an empty Map", () => {
    const cs = empty_virtual_copy();
    expect(cs instanceof Map).toBe(true);
    expect(cs.size).toBe(0);
  });

  test("virtual_copy_of with Frame object", () => {
    const fid = construct_frame([]);
    const f = frame_with_identity(fid);
    const cs = virtual_copy_of(f, 42);
    expect(cs.get(f.identity)).toBe(42);
    expect(cs.size).toBe(1);
  });

  test("virtual_copy_of with frame identity string", () => {
    const fid = construct_frame([]);
    const cs = virtual_copy_of(fid, "hello");
    const f = frame_with_identity(fid);
    expect(cs.get(f.identity)).toBe("hello");
  });

  test("virtual_copy_from_entries normalizes Frame and identity inputs", () => {
    const pid = construct_frame([]);
    const parent = frame_with_identity(pid);
    const cid = construct_frame([parent]);
    const child = frame_with_identity(cid);

    const cs = virtual_copy_from_entries([
      [parent, 1],
      [child.identity, 2],
    ]);
    expect(cs.get(parent.identity)).toBe(1);
    expect(cs.get(child.identity)).toBe(2);
    expect(cs.size).toBe(2);
  });

  test("virtual_copy_set_binding does not mutate base and adds binding", () => {
    const fid = construct_frame([]);
    const f = frame_with_identity(fid);
    const base: VirtualCopySet = virtual_copy_of(f, 1);

    const next = virtual_copy_set_binding(base, f, 2);
    expect(base.get(f.identity)).toBe(1);
    expect(next.get(f.identity)).toBe(2);
    expect(base).not.toBe(next);
  });

  test("virtual_copy_list aggregates sets and predicates identify them", () => {
    const fid1 = construct_frame([]);
    const fid2 = construct_frame([]);
    const f1 = frame_with_identity(fid1);
    const f2 = frame_with_identity(fid2);

    const a = virtual_copy_of(f1, "A");
    const b = virtual_copy_of(f2, "B");
    const list = virtual_copy_list(a, b);

    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(2);
    expect(is_virtual_copy_set(a)).toBe(true);
    expect(is_virtual_copy_set(b)).toBe(true);
    expect(is_virtual_copy_list(list)).toBe(true);
  });
});


