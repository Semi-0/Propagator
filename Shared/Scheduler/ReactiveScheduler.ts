



// a more reasonable scheduler would have depth 
// and calculate on informativeness
// if propagator is in depth depth, then it should calculate first 
// and it should also considered cycles
// if the propagators is already in the queue, then it should move to the end

import { construct_better_set, set_add_item, set_remove_item, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { propagator_id as _propagator_id, propagator_activate, propagator_id, type Propagator } from "../../Propagator/Propagator";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { get_base_value } from "sando-layer/Basic/Layer";
import { is_layered_object, type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args } from "generic-handler/Predicates";
import { cell_id, cell_strongest, cell_strongest_base_value } from "@/cell/Cell";
import { type Cell } from "@/cell/Cell";
import { find_cell_by_id } from "../GraphTraversal";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { reduce } from "generic-handler/built_in_generics/generic_array_operation";
import { is_fresh } from "../../AdvanceReactivity/traced_timestamp/Predicates";
import type { SimpleSet } from "../../helper";
import { make_easy_set } from "../../helper";
import type { Scheduler } from "./SchedulerType";
import { PropagatorError } from "../../Error/PropagatorError";
import {to_string} from "generic-handler/built_in_generics/generic_conversation";


export const reactive_scheduler = (): Scheduler => {

    var record_alerted_propagator = false
    const propagators_to_alert: SimpleSet<Propagator> = make_easy_set(propagator_id)
    const propagators_alerted: SimpleSet<Propagator> = make_easy_set(propagator_id)
    var immediate_execute = false

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


    const alert_propagators = (propagators: Propagator[]) => {
        for (const propagator of propagators){
            alert_propagator(propagator)
        }
    }

    const alert_propagator = (propagator: Propagator) => {
        const cell_values =  propagator.getInputsID()
                                 .map(compose(find_cell_by_id, cell_strongest)) 

        const all_fresh = reduce(
            cell_values,
            (acc: boolean, v: LayeredObject<any>) => acc && is_fresh(v),
            true
        )
        if (all_fresh){
            propagators_to_alert.add(propagator)
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
            return `Immediate execute: ${immediate_execute}`
        },
        clear_all_tasks: () => {
            propagators_to_alert.clear()
        }
    }
}



