import { p_sync } from "../Propagator/BuiltInProps";
import type { Cell } from "..";
import { construct_cell } from "../Cell/Cell";
import { constant_cell } from "../Cell/Cell";
import { function_to_primitive_propagator, compound_propagator } from "../Propagator/Propagator";
import type { Propagator } from "..";
import { make_temp_cell } from "../Cell/Cell";
import { p_map_a } from "../Propagator/BuiltInProps";
import { is_object } from "generic-handler/built_in_generics/generic_predicates"; 
import { is_array } from "generic-handler/built_in_generics/generic_predicates";

type AnyObj = Record<string | symbol, any>;

export function proxyReactiveObject<T extends AnyObj>(name: string, obj: T) {
  const fieldMap = new Map<PropertyKey, Cell<any>>();

  const ensureCell = (k: PropertyKey) => {
    if (!fieldMap.has(k)) {
      const c = construct_cell<any>(`${name}:${String(k)}`);
      // seed from object now
      p_sync(constant_cell(obj[k as keyof T], "constant"), c);
      fieldMap.set(k, c);
    }
    return fieldMap.get(k)!;
  };

  const pull = () => {
    for (const [k, c] of fieldMap) {
      p_sync(constant_cell(obj[k as keyof T], "constant"), c);
    }
  };

  const bindWrites = (keys?: PropertyKey[]) => compound_propagator([], [], () => {
    const ks = keys ?? [...fieldMap.keys()];
    ks.forEach(k => {
      const c = ensureCell(k);
      function_to_primitive_propagator(`${name}:write:${String(k)}`, (v:any)=> (obj[k as keyof T] = v, v))(c, make_temp_cell());
    });
  }, `${name}:bindWrites`);

  const proxied = new Proxy(obj, {
    get(t, p, r) {
      if (p === "__cells__") return fieldMap;
      if (p === "__pull__")  return pull;
      if (p === "__bindWrites__") return bindWrites;
      // Accessing a property returns its cell (reactive view)
      if (p in t) return ensureCell(p);
      return Reflect.get(t, p, r);
    },
    set(t, p, v, r) {
      // Setting the property pushes into its cell (and thus can write back if bindWrites enabled)
      const c = ensureCell(p);
      p_sync(constant_cell(v, "constant"), c);
      return true;
    }
  });

  return proxied as T & {
    __cells__: Map<PropertyKey, Cell<any>>;
    __pull__: () => void;
    __bindWrites__: (keys?: PropertyKey[]) => Propagator;
  };
}
