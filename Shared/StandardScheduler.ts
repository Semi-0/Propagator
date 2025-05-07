import { compose } from "generic-handler/built_in_generics/generic_combinator";
import type { Propagator } from "../Propagator/Propagator";
import { make_informativeness_sorted_scheduler } from "./ExperimentalScheduler";
import { find_cell_by_id } from "./GraphTraversal";
import { cell_strongest_base_value } from "@/cell/Cell";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { is_fresh } from "../AdvanceReactivity/traced_timestamp/Predicates";
import { reduce } from "generic-handler/built_in_generics/generic_array_operation";

export interface StandardScheduler{
   alert_propagator: (propagator: Propagator) => void;
   run_scheduler: () => void;
   run_scheduler_step: () => void; 
   alert_propagators: (propagators: Propagator[]) => void;
}


export const make_reactive_scheduler = (): StandardScheduler => {
    const scheduler = make_informativeness_sorted_scheduler()
    return {
        alert_propagator: (propagator: Propagator) => {
            const cell_values =  propagator.getInputsID()
                                         .map(compose(find_cell_by_id, cell_strongest_base_value)) 
        
            const all_fresh = reduce(cell_values, true, (acc: boolean, v: LayeredObject<any>) => acc && is_fresh(v))
            if (all_fresh){
                scheduler.alert_propagator(propagator)
            }
        },
        run_scheduler: scheduler.run_scheduler,
        run_scheduler_step: scheduler.run_scheduler_step,
        alert_propagators: scheduler.alert_propagators 
    }
}

export const configure_scheduler = (scheduler: StandardScheduler) => {
    schedule = scheduler
} 

export const configure_reactive_scheduler = () => {
    schedule = make_reactive_scheduler()
}

export var schedule: StandardScheduler = make_informativeness_sorted_scheduler()