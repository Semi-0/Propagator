// a more reasonable scheduler would have depth 
// and calculate on informativeness
// if propagator is in depth depth, then it should calculate first 
// and it should also considered cycles
// if the propagators is already in the queue, then it should move to the end


import { propagator_id as _propagator_id, propagator_id, type Propagator } from "../../Propagator/Propagator";

import type { Scheduler } from "./SchedulerType";
import { PropagatorError } from "../../Error/PropagatorError";
import { propagator_activate } from "../../Propagator/Propagator";
import type { SimpleSet } from "../../helper";
import { make_easy_set } from "../../helper";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { set_global_state, PublicStateCommand } from "../../Shared/PublicState";
import { find_cell_by_id, find_propagator_by_id } from "../../Shared/GraphTraversal";

//TODO: merge simple_scheduler & reactive_scheduler
export const simple_scheduler = (): Scheduler => {

    const propagators_to_alert: SimpleSet<Propagator> = make_easy_set(propagator_id)
    const propagators_alerted: SimpleSet<Propagator> = make_easy_set(propagator_id)
    const disposalQueue: Set<string> = new Set() // Track IDs of items to be disposed
    var immediate_execute = false
    var record_alerted_propagator = false

    const execute_propagator = (propagator: Propagator, error_handler: (e: Error) => void) => {
        try{
            propagator_activate(propagator)
            if (record_alerted_propagator){
                propagators_alerted.add(propagator)
            }
            propagators_to_alert.remove(propagator)
        }
        catch(e: any){

     
            error_handler(new PropagatorError("Error executing propagator", to_string(propagator), e))
    
        }
    }
    
    const set_immediate_execute = (value: boolean) => {
        immediate_execute = value
    }

    const alert_propagator = (p: Propagator) => {
        propagators_to_alert.add(p)

        if (immediate_execute){
            execute_propagator(p, (e) => {
                throw e
            })
        }
    }

    const alert_propagators = (propagators: Propagator[]) => {
        for (const propagator of propagators){
            alert_propagator(propagator)
        }
    }

    const markForDisposal = (id: string) => {
        disposalQueue.add(id)
    }

    const cleanupDisposedItems = () => {
        disposalQueue.forEach(id => {
            // Try to find and dispose cell
            const cell = find_cell_by_id(id)
            if (cell) {
                set_global_state(PublicStateCommand.REMOVE_CELL, cell)
            }
            
            // Try to find and dispose propagator
            const propagator = find_propagator_by_id(id)
            if (propagator) {
                set_global_state(PublicStateCommand.REMOVE_PROPAGATOR, propagator)
            }
        })
        disposalQueue.clear()
    }

    const getDisposalQueueSize = () => {
        return disposalQueue.size
    }

    const run_scheduler = (error_handler: (e: Error) => void) => {
        while (propagators_to_alert.get_items().length) {
            const next = propagators_to_alert.get_items()[0] as Propagator
            execute_propagator(next, error_handler)
        }
    } 

     const run_scheduler_step = (error_handler: (e: Error) => void) => {
        const propagator = propagators_to_alert.get_items()[0]
        execute_propagator(propagator, error_handler)
    }
  
    return {
        alert_propagator,
        alert_propagators,
        execute_sequential: run_scheduler,
        steppable_run: run_scheduler_step,
        set_immediate_execute,
        record_alerted_propagator: (value: boolean) => {
            record_alerted_propagator = value
        },
        summarize: () => {
            return propagators_to_alert.get_items().map(p => p.summarize()).join("\n")
        },
        clear_all_tasks: () => {
            propagators_to_alert.clear()
        },
        markForDisposal,
        cleanupDisposedItems,
        getDisposalQueueSize
    }
}