import { simple_scheduler } from "./SimpleScheduler";
import type { Propagator } from '../../Propagator/Propagator';
import type { Scheduler } from './SchedulerType';
import { describe_propagator_frame, type PropagatorFrame } from "./RuntimeFrame";
import { make_hookable, type Hookable, type HookableConfig } from "../../Helper/Hooks";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";

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

export function replay_propagators(logger: (frame: PropagatorFrame) => void) {
    Current_Scheduler.replay_propagators(logger)
}

export function steppable_run_task(error_handler: (e: Error) => void) {
      Current_Scheduler.steppable_run(error_handler)
}

export function alert_propagator(propagator: Propagator){
    Current_Scheduler.alert_propagator(propagator)
}

export function alert_propagators(propagators: Propagator[]){
    Current_Scheduler.alert_propagators(propagators)
    return propagators
} 

export function set_scheduler(scheduler: Scheduler){
    Current_Scheduler = scheduler
}

export function mark_for_disposal(id: string) {
    Current_Scheduler.mark_for_disposal(id)
}

export function has_pending_task(){
    return Current_Scheduler.pending_propagators().length > 0
}

export function set_record_alerted_propagator(value: boolean){
    Current_Scheduler.record_alerted_propagator(value)
}


export function disposal_queue_size(){
    return Current_Scheduler.disposal_queue().length
}

export const run_scheduler_and_replay = (error_handler: (e: Error) => void) => {
    set_record_alerted_propagator(true);
    execute_all_tasks_sequential(error_handler);
    replay_propagators((frame) => {
        console.log(describe_propagator_frame(frame));
    });
    clear_all_tasks()
}

/**
 * Creates a hookable scheduler wrapper that allows intercepting all scheduler operations
 * 
 * @param baseScheduler - The base scheduler to wrap
 * @param config - Optional hook configuration
 * @returns A hookable scheduler with the same interface
 */
export function make_hookable_scheduler(
    baseScheduler: Scheduler,
    config?: HookableConfig
): Hookable<Scheduler> & Scheduler {
    return make_hookable(baseScheduler, config) as Hookable<Scheduler> & Scheduler;
}

/**
 * Creates a traced scheduler that logs all operations to a logger function
 * Similar to trace_function pattern, but for scheduler operations
 * 
 * @param logger - Function to log scheduler operations (can output to console or file)
 * @param baseScheduler - Optional base scheduler (defaults to simple_scheduler)
 * @returns A hookable scheduler with tracing hooks installed
 * 
 * @example
 * // Log to console
 * const traced = trace_scheduler(console.log);
 * set_scheduler(traced);
 * 
 * // Log to file
 * const logs: string[] = [];
 * const traced = trace_scheduler((msg) => logs.push(msg));
 * set_scheduler(traced);
 */
export function trace_scheduler(
    logger: (log: string) => void,
    baseScheduler: Scheduler = simple_scheduler()
): Hookable<Scheduler> & Scheduler {
    const config: HookableConfig = {
        pre: [
            (methodName: string, args: any[]) => {
                // args is the array of arguments passed to the method
                logger(`[SCHEDULER] → ${methodName}(${format_args(args)})`);
            }
        ],
        post: [
            (methodName: string, args: any[], result: any) => {
                // args is the array of arguments, result is the return value
                if (methodName === 'execute_sequential' || methodName === 'steppable_run') {
                    logger(`[SCHEDULER] ← ${methodName}() completed`);
                } else if (methodName === 'alert_propagator') {
                    const propagator = args[0] as Propagator;
                    logger(`[SCHEDULER] ← ${methodName}() - propagator: ${propagator?.getName() || 'unknown'}`);
                } else if (methodName === 'alert_propagators') {
                    const propagators = args[0] as Propagator[];
                    logger(`[SCHEDULER] ← ${methodName}() - ${Array.isArray(propagators) ? propagators.length : 0} propagators`);
                } else if (methodName === 'summarize') {
                    logger(`[SCHEDULER] ← ${methodName}() = ${result}`);
                } else if (methodName === 'has_pending_tasks') {
                    logger(`[SCHEDULER] ← ${methodName}() = ${result}`);
                } else if (methodName === 'has_disposal_queue_size') {
                    logger(`[SCHEDULER] ← ${methodName}() = ${result}`);
                } else {
                    logger(`[SCHEDULER] ← ${methodName}() = ${to_string(result)}`);
                }
            }
        ],
        error: [
            (methodName: string, args: any[], error: Error) => {
                logger(`[SCHEDULER] ✗ ${methodName}() ERROR: ${error?.message || 'unknown error'}\n${error?.stack || ''}`);
            }
        ],
        debug: false
    };

    return make_hookable_scheduler(baseScheduler, config);
}

/**
 * Helper to format arguments for logging
 */
function format_args(args: any[]): string {
    if (args.length === 0) return '';
    
    return args.map((arg, index) => {
        if (arg && typeof arg === 'object' && 'getName' in arg) {
            // Propagator
            return `propagator(${arg.getName()})`;
        } else if (Array.isArray(arg)) {
            // Array of propagators
            return `[${arg.length} items]`;
        } else if (typeof arg === 'function') {
            return `function(${arg.name || 'anonymous'})`;
        } else {
            return to_string(arg);
        }
    }).join(', ');
}

/**
 * Sets up a traced scheduler with the given logger
 * This is a convenience function that creates a traced scheduler and sets it as current
 * 
 * @param logger - Function to log scheduler operations
 * @param baseScheduler - Optional base scheduler (defaults to simple_scheduler)
 * @returns The traced scheduler that was set
 */
export function set_traced_scheduler(
    logger: (log: string) => void,
    baseScheduler: Scheduler = simple_scheduler()
): Hookable<Scheduler> & Scheduler {

    const pending_propagators = baseScheduler.pending_propagators();

    const traced = trace_scheduler(logger, baseScheduler);
    Current_Scheduler = traced;

    // transfer tasks
    traced.alert_propagators(pending_propagators);

    return traced;
}
