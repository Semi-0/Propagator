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
import { cell_id } from "@/cell/Cell";
import { type Cell } from "@/cell/Cell";
import type { StandardScheduler } from "./StandardScheduler";

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

    }
}


export const make_informativeness_sorted_set = (get_propagator_informativeness: (propagator: Propagator) => number): SimpleSet<Propagator> => {
    const items: Propagator[] = [] 
    const added_ids = new Set<string>()
    let most_informative_propagator: Propagator | null = null

    return {
        add: (item: Propagator) => {
            if (!added_ids.has(propagator_id(item))) {
                if (most_informative_propagator === null || get_propagator_informativeness(item) > get_propagator_informativeness(most_informative_propagator)){
                    most_informative_propagator = item
                    items.unshift(item)
                }
                else{
                    items.push(item)
                }

                added_ids.add(propagator_id(item))
            }
        },
        remove: (item: Propagator) => {
            const idx = items.indexOf(item);
            if (idx >= 0) items.splice(idx, 1);
            added_ids.delete(propagator_id(item));
            if (items.length === 0) {
                most_informative_propagator = null;
            } else if (item === most_informative_propagator) {
                // only re-pick the head if you actually removed it
                most_informative_propagator = items[0];
            }
        },
        get_items: () => items,
        clear: () => {
            items.length = 0
            added_ids.clear()
            most_informative_propagator = null
        },
        copy: () => {
            return items.map(i => i)
        },
        has: (item: Propagator) => {
            return added_ids.has(propagator_id(item))
        },

    } 
}

export const make_informativeness_sorted_scheduler = (): StandardScheduler => {

    const propagator_informativeness: Map<string, number> = new Map()
    const propagators_to_alert: SimpleSet<Propagator> = make_informativeness_sorted_set((propagator: Propagator) => {
        const id = propagator_id(propagator)
        return propagator_informativeness.get(id) ?? 0 
    })


    const activate_propagator = make_layered_procedure("activate_propagator", 1, (propagator: Propagator) => {
        propagator.activate()
    })


     const execute_propagator = (propagator: Propagator) => {
        activate_propagator(propagator)
        if (record_alerted_propagator){
            propagators_to_alert.add(propagator)
        }
        propagators_to_alert.remove(propagator)
        propagator_informativeness.delete(propagator_id(propagator))
    }

     const get_propagator_informativeness = (propagator: Propagator) => {
        return propagator_informativeness.get(propagator_id(propagator))!
    }

     const alert_propagator = (p: Propagator) => {
        const id = propagator_id(p)
        const old = propagator_informativeness.get(id) ?? 0
        propagator_informativeness.set(id, old + 1)

        propagators_to_alert.remove(p)
        propagators_to_alert.add(p)
    }

     const alert_propagators = (propagators: Propagator[]) => {
        for (const propagator of propagators){
            alert_propagator(propagator)
        }
    }

    const run_scheduler = () => {
        while (propagators_to_alert.get_items().length) {
            const next = propagators_to_alert.get_items()[0]
            execute_propagator(next)
        }
    } 

     const run_scheduler_step = () => {
        const propagator = propagators_to_alert.get_items()[0]
        execute_propagator(propagator)
    }
  
    return {
        alert_propagator,
        run_scheduler,
        run_scheduler_step,
        alert_propagators 
    }
}