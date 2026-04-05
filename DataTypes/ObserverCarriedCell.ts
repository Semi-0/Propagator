import { cell_id, cell_strongest, cell_strongest_base_value, update_cell } from "@/cell/Cell"
import { type Cell } from "@/cell/Cell"
import { match_args, one_of_args_match, register_predicate } from "generic-handler/Predicates"
import { find_cell_by_id } from "../Shared/GraphTraversal"
import { to_string } from "generic-handler/built_in_generics/generic_conversation"
import { ce_constant, p_constant } from "../Propagator/BuiltInProps"
import { compound_propagator, construct_propagator, primitive_propagator } from "../Propagator/Propagator"
import { no_compute } from "../Helper/noCompute"
import { cell_merge } from "@/cell/Merge"
import { is_concrete } from "generic-handler/built_in_generics/generic_predicates"
import { is_nothing, the_contradiction, the_nothing } from "@/cell/CellValue"
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure"
import { make_ce_arithmetical } from "../Propagator/Sugar"
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure"
import { add_item, for_each } from "generic-handler/built_in_generics/generic_collection"
import { construct_better_set, identify_by, is_better_set, set_merge } from "generic-handler/built_in_generics/generic_better_set"
import { define_generic_propagator_handler } from "../GenericPropagator/generic_propagator"


export type Link = {
  link: string
}

export const create_observer_link = (cell: Cell<any>) => {
  return {
    link: cell_id(cell)
  }
}

export const is_link = register_predicate("is_link", (x: any) => {
  return x && x.link
})


export const resolve_link = (x: any) => {
  return find_cell_by_id(x.link)
}

export const p_sync_to_link = (notifier: Cell<any>, cell_held_link: Cell<any>) => primitive_propagator(
  (v: any) => {
    const link = cell_strongest_base_value(cell_held_link)

    if (is_link(link)) {
      const resolved_cell = resolve_link(link)
      if (resolved_cell) {
        update_cell(cell_strongest(notifier), resolved_cell)
      }
    }
    else if (is_link_set(link)) {
      for_each(link, (link: Link) => {
        const resolved_cell = resolve_link(link)
        if (resolved_cell) {
          update_cell(cell_strongest(notifier), resolved_cell)
        }
      })
    }
    return no_compute
  }
  ,
  "resolve_link"
)(notifier, cell_held_link)

export const is_link_set = is_better_set



export const is_sync_dict = register_predicate("is_sync_dict", (x: any) => {
  return x && x.sync_dict
})

interface SyncDict {
  sync_dict: Map<string, any>
}

export const make_link_set = construct_better_set

export const merge_link_set = set_merge


export const merge_link = (a: any, b: any) => {
  if (is_link_set(a) && is_link_set(b)) {
    return merge_link_set(a, b)
  }
  else if (is_link_set(a) && (is_link(b))) {
    return add_item(a, b)
  }
  else if (is_link_set(b) && (is_link(a))) {
    return add_item(b, a)
  }
  else if (is_link(a) && is_link(b)) {
    return make_link_set([a, b])
  }
  else {
    console.error("error merge_link" + "  \n a: \n " + to_string(a) + " b:  \n" + to_string(b))
    return the_contradiction
  }
}

export const merge_sync_dict = (dict1: SyncDict, dict2: SyncDict) => {
  const keys = new Set([...dict1.sync_dict.keys(), ...dict2.sync_dict.keys()])
  const new_sync_dict = new Map<string, string>()

  for (const key of keys) {
    const value1 = dict1.sync_dict.get(key)
    const value2 = dict2.sync_dict.get(key)
    if (is_concrete(value1) && is_concrete(value2)) {
       // cell_merge can install merge link extension
       new_sync_dict.set(key, cell_merge(value1, value2))
    }
    else if (is_concrete(value1)) {
      new_sync_dict.set(key, value1)
    }
    else if (is_concrete(value2)) {
      new_sync_dict.set(key, value2)
    }
    else {
      // this should never happen
      new_sync_dict.set(key, the_nothing)
    }
  }
}

export const make_sync_dict = (entries: [string, any][]) => {
  return {
    sync_dict: new Map<string, any>(entries)
  }
}

export const make_sync_dict_entry = make_sync_dict


export const sync_dict_strongest = (sync_dict: SyncDict) => {
  return new Map<string, any>(sync_dict.sync_dict.entries().map(([key, value]) => {
    return [key, cell_strongest(value)]
  }))
}

export const l_sync_dict_strongest = make_layered_procedure("sync_dict_strongest", 1, sync_dict_strongest)

export const p_get_link = primitive_propagator((d: SyncDict, key: string) => {return d.sync_dict.has(key) ? d.sync_dict.get(key) : no_compute}, "get_link")

export const ce_get_link = make_ce_arithmetical(p_get_link)

export const c_sync_cell_dict = (cell: Cell<any>, dict_cell: Cell<SyncDict>, key: Cell<string>) => 
  compound_propagator([cell, dict_cell, key], [cell], () => {
    const link = ce_get_link(dict_cell, key)
    p_sync_to_link(cell, link)
  }, "sync_cell_dict")

export const p_sync_dict_entry = (dict_cell: Cell<SyncDict>, key: Cell<string>, value: Cell<any>) => primitive_propagator(
   (key: string) => {
    return make_sync_dict_entry([[key, create_observer_link(value)]])
  }, "sync_dict_entry")(key, dict_cell)

export const dynamic_bi_sync = (cell: Cell<any> , dict_cell: Cell<SyncDict>, key_to: Cell<string>, key_from: Cell<string>) => 
  compound_propagator(
    [dict_cell, key_to],
    [cell],
    () => {
      c_sync_cell_dict(cell, dict_cell, key_to)
      p_sync_dict_entry(dict_cell, key_from, cell)
    },
    "dynamic_bi_sync"
  )

export const install_observer_link_extension = (merge: (value1: any, value2: any) => any) => {


  define_generic_procedure_handler(
    identify_by,
    match_args(is_link),
    (x: any) => {
      return x.link
    }
  )

  define_generic_procedure_handler(
    merge,
    one_of_args_match(is_sync_dict),
    (value1: any, value2: any) => {
      if (is_sync_dict(value1) && is_sync_dict(value2)) {
        return merge_sync_dict(value1, value2)
      }
      else if ((is_sync_dict(value1)) && (is_nothing(value2))) {
        return value1
      }
      else if ((is_sync_dict(value2)) && (is_nothing(value1))) {
        return value2
      }
      else {
        return the_contradiction
      }
    }
  )

  define_generic_procedure_handler(
    cell_strongest,
    match_args(is_sync_dict),
    sync_dict_strongest
  )
}