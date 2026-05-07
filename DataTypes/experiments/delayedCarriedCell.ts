// carried cell in form of stream?
import { match_args, register_predicate } from "generic-handler/Predicates";
import { is_map } from "../../Helper/Helper";
import { cell_strongest, cell_strongest_base_value, update_cell, type Cell } from "@/cell/Cell";
import { construct_propagator } from "../../Propagator/Propagator";
import { any_unusable_values } from "@/cell/CellValue";
import { is_array } from "generic-handler/built_in_generics/generic_predicates";
import type { LayeredObject } from "sando-layer/Basic";
import { is_trie, is_trie_patch, make_trie, merge_trie_patch, type Trie } from "../trie";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";

export type DelayedCarriedCell = Trie;

export const is_delayed_carried_cell = register_predicate(
  "is_delayed_carried_cell",
  (value: any) => {
    return is_trie(value);
  },
);

export const install_compound_cell_extension = (merge: (value1: any, value2: any) => any) => {
  define_generic_procedure_handler(
    merge,
    match_args(
      is_delayed_carried_cell,
      is_trie_patch,
    ),
    merge_trie_patch,
  );
};

export const delayed_map_get_observers = (delayed_carried_cell: DelayedCarriedCell, key: number, value: Cell<any>) => {
  const maybe_cells = delayed_carried_cell.get_child(key);
  if (maybe_cells && is_trie(maybe_cells)) {
    return maybe_cells.iter_children();
  } else {
    return make_trie().iter_children();
  }
};

export const alert_observers = (observers: IterableIterator<readonly [number, Cell<any>]>, value: Cell<any>) => {
};

export const p_sync_delayed_carried_cell = (
  cell: Cell<any>,
  delayed_carried_cell: Cell<DelayedCarriedCell>,
  key: Cell<string>,
) => construct_propagator(
  [cell, delayed_carried_cell],
  [delayed_carried_cell],
  () => {
    if (any_unusable_values(...[cell, delayed_carried_cell, key])) {
      return;
    } else {
      const k = cell_strongest_base_value(key) as number;
      const observers = delayed_map_get_observers(
        cell_strongest_base_value(delayed_carried_cell) as DelayedCarriedCell,
        k,
        cell,
      );

      alert_observers(observers, cell);
    }
  },
  "sync_delayed_carried_cell",
);

