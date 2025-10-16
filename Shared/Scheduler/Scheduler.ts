import { v4 as uuidv4 } from 'uuid';
import { simple_scheduler } from "./SimpleScheduler";
import type { Propagator } from '../../Propagator/Propagator';
import type { Scheduler } from './SchedulerType';

export var Current_Scheduler = simple_scheduler()

export function clear_all_tasks(){
    Current_Scheduler.clear_all_tasks()
}

export function summarize_scheduler_state(){
    return Current_Scheduler.summarize()
}

export function set_immediate_execute(value: boolean){
    Current_Scheduler.set_immediate_execute(value)
}

export function report_executed_length(){
    return Current_Scheduler
}

export function reset_scheduler(){
    Current_Scheduler.clear_all_tasks()
}

export function execute_all_tasks_sequential(error_handler: (e: Error) => void) {
    const result = Current_Scheduler.execute_sequential(error_handler)
    // Clean up disposed items after execution
    Current_Scheduler.cleanup_disposed_items()
    return result
}

export function steppable_run_task(error_handler: (e: Error) => void) {
      Current_Scheduler.steppable_run(error_handler)
}

export function alert_propagator(propagator: Propagator){
    Current_Scheduler.alert_propagator(propagator)
}

export function alert_propagators(propagators: Propagator[]){
    Current_Scheduler.alert_propagators(propagators)
} 

export function set_scheduler(scheduler: Scheduler){
    Current_Scheduler = scheduler
}

export function markForDisposal(id: string) {
    Current_Scheduler.mark_for_disposal(id)
}

export function hasPendingTasks(){
    return Current_Scheduler.has_pending_tasks()
}