


// carried cell in form of stream?

import { match_args, register_predicate } from "generic-handler/Predicates"
import { is_map } from "../Helper/Helper"
import { cell_strongest, cell_strongest_base_value, update_cell, type Cell } from "@/cell/Cell"
import { construct_propagator } from "../Propagator/Propagator"
import { any_unusable_values } from "@/cell/CellValue"
import { is_array } from "generic-handler/built_in_generics/generic_predicates"
import type { LayeredObject } from "sando-layer/Basic"
import { is_trie, is_trie_patch, make_trie, merge_trie_patch, type Trie } from "./trie"
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure"


export type DelayedCarriedCell = Trie

export const is_delayed_carried_cell = register_predicate(
    "is_delayed_carried_cell",
    (value: any) => {
        return is_trie(value)
    }
)

// the reason of delayed carried cell is treat compound data as potential dataflow or possibilities

// so maybe this is treated as a specialized case of trie?
// trie might have different possibilities?
// and also the new information might subsume the old one?

export const install_compound_cell_extension = (merge: (value1: any, value2: any) => any) => {
     // cell merge would encounter 3 situation
     // 0.1 two array, then it will merge it use the general method 
     // 0.2 one array, and partial information of cell and patch, then it will patch it 
     // 0.3 contradictions(of unresolved arrays)

     // i think the simplest way is not thinking about this question as array
     // but treating cell as trie! 
     // so cell merge merge a trie 
     // trie would includes or the possibility space of an array
     // then cell strongest decides whether to maintain that possibility space 
     // collapse that into array 
     // or not 

     // still we should seperate cell merge and cell strongest value 

     // in cell merge it just mindlessly maintain all the partial information
     // but in cell strongest it merge everything together 
     // the aim of delayed carried cell is to treat compound data as potential dataflow or traced information


    define_generic_procedure_handler(
        merge,
        match_args(
            is_delayed_carried_cell,
            is_trie_patch,
        ),
        merge_trie_patch
    )

}

export const delayed_map_get_observers = (delayed_carried_cell: DelayedCarriedCell, key: number, value: Cell<any>) => {
    // this is not good because it merged set cells and send information together
    const maybe_cells = delayed_carried_cell.get_child(key)
    if (maybe_cells && is_trie(maybe_cells)) {
        return maybe_cells.iter_children()
    }
    else {
        return make_trie().iter_children()
    }
}

export const alert_observers = (observers: IterableIterator<readonly [number, Cell<any>]>, value: Cell<any>) => {

}

export const p_sync_delayed_carried_cell = (
    cell: Cell<any>,
    delayed_carried_cell: Cell<DelayedCarriedCell>,
    key: Cell<string>
) => construct_propagator(
    [cell, delayed_carried_cell],
    [delayed_carried_cell],
    () => {
        if (any_unusable_values(...[cell, delayed_carried_cell, key])) {
            return 
        }
        else {

            // we need to register the cell to the delayed carried cell
            // not done in here 

            // because we have not decide how do we merge the strongest value 
            // the simplest way is to just merge the strongest value as layered object 
            // with array 
            // then we can simple alert all the observers
            
            // or a more generic way is to merge it into a much shallower trie 

            const k = cell_strongest_base_value(key) as number
            const observers = delayed_map_get_observers(
                cell_strongest_base_value(delayed_carried_cell) as DelayedCarriedCell,
                k,
                cell
            ) 

            alert_observers(observers, cell)      
        }
    },
    "sync_delayed_carried_cell"
)