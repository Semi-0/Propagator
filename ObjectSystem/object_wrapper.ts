import type { Cell, Propagator } from "..";

import { construct_cell } from "../Cell/Cell";
import { ce_constant, p_sync } from "../Propagator/BuiltInProps";

import { p_map_a } from "../Propagator/BuiltInProps";
import { p_switch } from "../Propagator/BuiltInProps";
import { function_to_primitive_propagator, compound_propagator } from "../Propagator/Propagator";
import { no_compute } from "../Helper/noCompute";
import { make_temp_cell } from "../Cell/Cell";
import { the_nothing } from "..";

import { ce_not } from "../Propagator/BuiltInProps";

import { is_object } from "generic-handler/built_in_generics/generic_predicates";


// ── Command protocol ──────────────────────────────────────────────────────────
type ObjCmd =
  | { op: "get";  key: string }                          // => result = obj[key]
  | { op: "set";  key: string; value: any }              // => result = obj[key] (after set)
  | { op: "call"; name: string; args?: any[] }           // => result = obj[name](...args)
  | { op: "pull"; key?: string }                         // => result = obj[key] or no_compute
  | { op: "noop" };                                      // => no_compute

// ── Same callable shape as your ObjectPropagator<T> ───────────────────────────
type ObjectPropagator<T> = (cmd: Cell<ObjCmd>, out: Cell<any>) => Propagator;

export function object_wrapper<T extends Record<string, any>>(
  name: string,
  obj: T
): ObjectPropagator<T> & {
  // optional helpers you can use, but wrapper remains a function (cmd,out)=>Propagator
  field: (key: string) => Cell<any>;
  pull: () => void;
  bindWrites: (keys?: string[]) => Propagator;
} {
  // lazily created per-field cells (reactive mirrors)
  const fieldMap = new Map<string, Cell<any>>();

  const ensureFieldCell = (k: string) => {
    let c = fieldMap.get(k);
    if (!c) {
      c = construct_cell<any>(`${name}:${k}`);
      // seed from object once
      p_sync(ce_constant(obj[k], "constant"), c);
      fieldMap.set(k, c);
    }
    return c;
  };

  // the callable wrapper itself
  const wrapper = ((cmd: Cell<ObjCmd>, out: Cell<any>) =>
    compound_propagator([cmd], [out], () => {
      // Execute imperative action declaratively
      const run = function_to_primitive_propagator(`${name}:cmd`, (c: ObjCmd) => {
        if (!c || c.op === "noop") return no_compute;

        switch (c.op) {
          case "get":
            return obj[c.key];

          case "set": {
            obj[c.key as keyof T] = c.value;
            return obj[c.key];
          }

          case "call": {
            const fn = obj[c.name];
            if (typeof fn !== "function") return no_compute;
            return fn.apply(obj, c.args ?? []);
          }

          case "pull":
            return c.key ? obj[c.key] : no_compute;

          default:
            return no_compute;
        }
      });

      run(cmd, out);

      // Keep known field cells in sync when commands touch them.
      // Project (key, valueNow) from cmd, then route to the right field cell(s).
      const keyC = make_temp_cell() as Cell<string>;
      const valC = make_temp_cell() as Cell<any>;

      // extract key (only for get/set/pull)
      p_map_a((c: ObjCmd) =>
        c && (c.op === "get" || c.op === "set" || c.op === "pull") ? (c as any).key : the_nothing
      )(cmd, keyC);

      // read current value for that key
      const readKey = function_to_primitive_propagator(`${name}:readKey`,
        (k: any) => (k === the_nothing || k === undefined) ? no_compute : obj[k]
      );
      readKey(keyC, valC);

      // route into the matching field cell, if we’ve created it
      // (we cannot dynamically choose a destination; expand per-known key)
      fieldMap.forEach((cell, k) => {
        const isK = make_temp_cell() as Cell<boolean>;
        p_map_a((kk: any) => kk === k)(keyC, isK);
        const gated = make_temp_cell() as Cell<any>;
        p_switch(isK, valC, gated);       // only pass when keys match
        p_switch(ce_not(isK), gated, make_temp_cell()); // drop when not matching
        p_switch(isK, gated, cell);       // update the field cell
      });
    }, name)
  ) as ObjectPropagator<T> & {
    field: (key: string) => Cell<any>;
    pull: () => void;
    bindWrites: (keys?: string[]) => Propagator;
  };

  // helper: expose a field as a Cell (reactive mirror)
  wrapper.field = (key: string) => ensureFieldCell(key);

  // helper: one-shot refresh (obj -> cells) for all known fields
  wrapper.pull = () => {
    fieldMap.forEach((cell, k) => p_sync(ce_constant(obj[k], "constant"), cell));
  };

  // helper: make cells drive the object (cells -> obj), optionally gated
  wrapper.bindWrites = (keys?: string[]) =>
    compound_propagator([], [], () => {
      const ks = keys ?? [...fieldMap.keys()];
      ks.forEach((k) => {
        const c = ensureFieldCell(k);
        function_to_primitive_propagator(`${name}:write:${k}`, (v: any) => {
          obj[k as keyof T] = v;
          return v;
        })(c, make_temp_cell());
      });
    }, `${name}:bindWrites`);

  return wrapper;
}
