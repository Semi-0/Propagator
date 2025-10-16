import { propagator_activate, propagator_id, type Propagator } from "../../Propagator/Propagator";
import type { Scheduler } from "./SchedulerType";
import { simple_scheduler } from "./SimpleScheduler";

interface StagedScheduler extends Scheduler{
    commit: (action: () => void) => void
    mark_as_effected_propagator : (propagator: Propagator) => Propagator
}




export const staged_scheduler = (): StagedScheduler => {

    const commit_actions = new Set<() => void>()
    const effectful_propagators = new Map<string, Propagator>()

    const scheduler = simple_scheduler()

    const commit = (action: () => void) => {
        commit_actions.add(action)
    }

    const mark_as_effected_propagator = (propagator: Propagator) => {
        effectful_propagators.set(propagator_id(propagator), propagator)
       return propagator
    }


    const alert_propagator = (propagator: Propagator) => {
        if (effectful_propagators.has(propagator_id(propagator))){
           // do nothing
        }
        else{
            scheduler.alert_propagator(propagator)
        }
    }

    const alert_propagators = (propagators: Propagator[]) => {
        for (const propagator of propagators){
            alert_propagator(propagator)
        }
    }

    const cleanup = () => {
        effectful_propagators.clear()
        commit_actions.clear()
        scheduler.cleanup_disposed_items()
    }

    const run_scheduler = (error_handler: (e: Error) => void) => {
        commit_actions.forEach(action => action())
        scheduler.execute_sequential(error_handler)
        effectful_propagators.values().forEach(propagator => propagator_activate(propagator))
        cleanup()
    }
    
    const clear_all_tasks = () => {
        scheduler.clear_all_tasks()
        cleanup()
    }
    

    const summarize = () => {
        return scheduler.summarize() + "\n" + commit_actions.size + " commit actions" + "\n" + effectful_propagators.size + " effectful propagators"
    }

    const has_pending_tasks = () => {
        return commit_actions.size > 0 || effectful_propagators.size > 0 || scheduler.has_pending_tasks()
    }

    const steppable_run = (error_handler: (e: Error) => void) => {
        if (commit_actions.size > 0){
            commit_actions.forEach(action => action())
            steppable_run(error_handler)
        }
        else if (scheduler.has_pending_tasks()){
            scheduler.steppable_run(error_handler)
        }
        else{
            effectful_propagators.values().forEach(propagator => propagator_activate(propagator))
            cleanup()
        }
    }
    
    return {
        commit,
        mark_as_effected_propagator,
        alert_propagator,
        alert_propagators,
        execute_sequential: run_scheduler,
        steppable_run,
        summarize,
        clear_all_tasks,
        has_pending_tasks: has_pending_tasks,
        set_immediate_execute: scheduler.set_immediate_execute,
        record_alerted_propagator: scheduler.record_alerted_propagator,
        mark_for_disposal: scheduler.mark_for_disposal,
        cleanup_disposed_items: scheduler.cleanup_disposed_items,
        has_disposal_queue_size: scheduler.has_disposal_queue_size
    }
}


