// a more reasonable scheduler would have depth 
// and calculate on informativeness
// if propagator is in depth depth, then it should calculate first 
// and it should also considered cycles
// if the propagators is already in the queue, then it should move to the end

import { construct_better_set, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { add_item, remove_item } from "generic-handler/built_in_generics/generic_collection";
import { propagator_id as _propagator_id, propagator_id, type Propagator } from "../../Propagator/Propagator";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { get_base_value } from "sando-layer/Basic/Layer";
import { is_layered_object, type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args } from "generic-handler/Predicates";
import { cell_id } from "@/cell/Cell";
import { type Cell } from "@/cell/Cell";
import type { Scheduler } from "./SchedulerType";
import { PropagatorError } from "../../Error/PropagatorError";
import { propagator_activate } from "../../Propagator/Propagator";
import type { SimpleSet } from "../../helper";
import { make_easy_set } from "../../helper";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";





//TODO: merge simple_scheduler & reactive_scheduler
export const simple_scheduler = (): Scheduler => {

    const propagators_to_alert: SimpleSet<Propagator> = make_easy_set(propagator_id)
    const propagators_alerted: SimpleSet<Propagator> = make_easy_set(propagator_id)
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
    }

    const alert_propagators = (propagators: Propagator[]) => {
        for (const propagator of propagators){
            alert_propagator(propagator)
        }
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
        }
    }
}