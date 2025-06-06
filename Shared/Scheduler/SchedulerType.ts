import type { Propagator } from "../../Propagator/Propagator";


export interface Scheduler{
    alert_propagator: (propagator: Propagator) => void;
    alert_propagators: (propagators: Propagator[]) => void;
    execute_sequential: (error_handler: (e: Error) => void) => void;
    steppable_run:  (error_handler: (e: Error) => void) => void;
    summarize: () => string;
    clear_all_tasks: () => void;
    set_immediate_execute: (value: boolean) => void; 
    record_alerted_propagator: (value: boolean) => void; 
}