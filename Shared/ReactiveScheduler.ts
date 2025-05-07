



// a more reasonable scheduler would have depth 
// and calculate on informativeness
// if propagator is in depth depth, then it should calculate first 
// and it should also considered cycles
// if the propagators is already in the queue, then it should move to the end

import { construct_better_set, set_add_item, set_remove_item, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { propagator_id as _propagator_id, type Propagator } from "../Propagator/Propagator";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { get_base_value } from "sando-layer/Basic/Layer";
import { is_layered_object, type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args } from "generic-handler/Predicates";
import { cell_id, cell_strongest_base_value } from "@/cell/Cell";
import { type Cell } from "@/cell/Cell";
import { find_cell_by_id } from "./GraphTraversal";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { reduce } from "generic-handler/built_in_generics/generic_array_operation";
import { is_fresh } from "../AdvanceReactivity/traced_timestamp/Predicates";

const l_propagator_id = make_layered_procedure("propagator_id", 1, _propagator_id)

const propagator_id = construct_simple_generic_procedure("propagator_id", 1, _propagator_id) 

define_generic_procedure_handler(propagator_id, match_args(is_layered_object), (propagator: LayeredObject<Propagator>) => get_base_value(l_propagator_id(propagator)))

const record_alerted_propagator = false

interface SimpleSet<T> {
    add: (item: T) => void
    remove: (item: T) => void
    get_items: () => T[]
    clear: () => void
    copy: () => T[]
    has: (item: T) => boolean
    sort: (sort_function: (item: T) => number) => void
}

export const make_easy_set = <T>(identifier: (item: T) => string): SimpleSet<T> => {
    const items: T[] = [] 
    const added_ids = new Set<string>()

    return {
        add: (item: T) => {
            if (!added_ids.has(identifier(item))) {
                items.push(item)
                added_ids.add(identifier(item))
            }
        },
        remove: (item: T) => {
            items.splice(items.indexOf(item), 1)
            added_ids.delete(identifier(item))
        },
        get_items: () => items,
        clear: () => {
            items.length = 0
            added_ids.clear()
        },
        copy: () => {
            return items.map(i => i)
        },
        has: (item: T) => {
            return added_ids.has(identifier(item))
        },
        sort: (sort_function: (item: T) => number) => {
            items.sort((a, b) => {
                // in descending order
                return sort_function(b) - sort_function(a)
            })
        }
    }
}


const propagators_to_alert: SimpleSet<Propagator> = make_easy_set(propagator_id) 
const propagators_alerted: SimpleSet<Propagator> = make_easy_set(propagator_id)




const activate_propagator = make_layered_procedure("activate_propagator", 1, (propagator: Propagator) => {
    propagator.activate()
})


export const execute_propagator = (propagator: Propagator) => {
    activate_propagator(propagator)
    if (record_alerted_propagator){
        propagators_alerted.add(propagator)
    }
    propagators_to_alert.remove(propagator)

}

export const alert_propagator = (propagator: Propagator) => {
    const cell_values =  propagator.getInputsID()
                                 .map(compose(find_cell_by_id, cell_strongest_base_value)) 

    const all_fresh = reduce(cell_values, true, (acc: boolean, v: LayeredObject<any>) => acc && is_fresh(v))
    if (all_fresh){
        propagators_to_alert.add(propagator)
    }
}

export const alert_propagators = (propagators: Propagator[]) => {
    for (const propagator of propagators){
        alert_propagator(propagator)
    }
}


export const run_scheduler = () => {
    while (propagators_to_alert.get_items().length > 0){
        const propagator = propagators_to_alert.get_items()[0]
        execute_propagator(propagator)
    }
} 

export const run_scheduler_step = () => {
    const propagator = propagators_to_alert.get_items()[0]
    execute_propagator(propagator)
}