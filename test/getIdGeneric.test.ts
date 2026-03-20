import { expect, test, beforeEach } from "bun:test";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { merge_value_sets } from "../DataTypes/ValueSet";
import { set_merge } from "../Cell/Merge";
import { construct_cell } from "../Cell/Cell";
import { construct_propagator } from "../Propagator/Propagator";
import { init_propagator_system } from "../index";

// Important: `get_id` is a generic procedure whose handlers are registered via
// module side-effects. In some import orders, Propagator has circular deps
// that can trigger module-init TDZ issues. Dynamic import keeps this test
// deterministic when running in isolation.
let get_id: (x: any) => string;

beforeEach(() => {
  // Keep scheduler/public state deterministic for tests.
  // Ensure generic-procedure handlers are installed before calling `get_id`.
  // Use async init so we don't depend on import-order side effects.
  void init_propagator_system();
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_merge(merge_value_sets);
});

const ensureGetId = async () => {
  const mod = await import("../Shared/Generics");
  get_id = mod.get_id as any;
};

test("generic get_id works for real Cell", async () => {
  await init_propagator_system();
  await ensureGetId();
  const a = construct_cell("a");
  const idFromGetId = get_id(a);
  const idFromRelation = a.getRelation().get_id();
  expect(idFromGetId).toBe(idFromRelation);
});

test("generic get_id works for real Propagator", async () => {
  await init_propagator_system();
  await ensureGetId();
  const a = construct_cell("a");
  const b = construct_cell("b");

  const p = construct_propagator([a], [b], () => b.update(a.getStrongest()), "P");
  const idFromGetId = get_id(p);
  const idFromRelation = p.getRelation().get_id();

  expect(idFromGetId).toBe(idFromRelation);
});

test("generic get_id returns id for Relation", async () => {
  await init_propagator_system();
  await ensureGetId();
  const a = construct_cell("a");
  const rel = a.getRelation();
  expect(get_id(rel)).toBe(rel.get_id());
});

