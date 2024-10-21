import { construct_reactor, construct_scheduled_reactor, construct_scheduled_stateful_reactor, type StandardReactor } from "./Reactivity/Reactor";
import { v4 as uuidv4 } from 'uuid';

// MAIN PROBLEM LIES IN EXECUTION ORDER
export interface Scheduler{
    schedule: (f: () => Promise<void>) => void;
    execute_sequential: (error_handler: (e: Error) => void) => ExecutionHandler;
    execute_simultaneous: (error_handler: (e: Error) => void) => ExecutionHandler;
    steppable_run:  (error_handler: (e: Error) => void) => void;
    summarize: () => string;
    clear_all_tasks: () => void;
    set_immediate_execute: (value: boolean) => void; 
}


export interface ExecutionHandler{
    task: Promise<void>;
    cancel: () => void;
}

function construct_execution_handler(task: Promise<void>, cancel: () => void): ExecutionHandler{
    return {
        task,
        cancel
    }
}


var trace_scheduler = false; 
var trace_new_scheduled_task = false; 
var trace_executed_task = false;  
var trace_scheduler_state_updates = false; 

export function configure_trace_scheduler(trace: boolean){
    trace_scheduler = trace;
    trace_new_scheduled_task = trace;
    trace_executed_task = trace;
    trace_scheduler_state_updates = trace;
}

export function configure_trace_new_scheduled_task(trace: boolean){
    trace_new_scheduled_task = trace;
} 

export function configure_trace_executed_task(trace: boolean){
    trace_executed_task = trace;
} 

export function configure_trace_scheduler_state_updates(trace: boolean){
    trace_scheduler_state_updates = trace;
} 

export function simple_scheduler(): Scheduler {
    var queue: Array<[string, () => Promise<void>]> = []
    var executed: Map<string, () => Promise<void>> = new Map()
    var immediate_execute: boolean = false



    function schedule(f: () => Promise<void>) {
        const taskId = uuidv4();
        queue.push([taskId, f]);


        if (trace_new_scheduled_task){
            console.log("scheduled", taskId)
        }

        if (immediate_execute) {
            execute_sequential(error_handler => {
                console.error("Error during immediate execution:", error_handler);
            });
        }
    }

    function set_immediate_execute(value: boolean){
        immediate_execute = value
    }

    function dequeue(): [string, () => Promise<void>] {
        const [taskId, f] = queue.shift()!
        return [taskId, f]
    } 

    function summarize(): string{
        return "in_queue: " + queue.length.toString() + " " 
                + "executed: " + executed.size.toString()
    }
     
    function clear_all_tasks(){
        queue = []
        executed.clear()
    }

    function execute_task(taskId: string, task: () => Promise<void>, error_handler: (e: Error) => void): () => Promise<void> {
        return async () => {
            try {

                if (trace_executed_task){
                    console.log("executing", taskId)
                }

                if (trace_scheduler_state_updates){
                    console.log("state:", summarize())
                }

                await task();
                executed.set(taskId, task);
            } catch (e) {
                error_handler(e as Error);
                // Optionally re-throw the error if you want it to propagate
                // throw e;
            }
        }
    }

    function execute_sequential(error_handler: (e: Error) => void): ExecutionHandler {
        let running = true;

        async function exec() {
            while (queue.length !== 0 && running) {
                const [taskId, task] = dequeue();
                await execute_task(taskId, task, error_handler)();
            }
        }

        const promise = exec();

        return construct_execution_handler(promise, () => {
            running = false;

        });
    }

    function execute_simultaneous(error_handler: (e: Error) => void): ExecutionHandler {
        let running = true;

        async function exec() {
            while (running && queue.length > 0) {
                const tasksToExecute = queue.map(task => execute_task(task[0], task[1], error_handler)());
                queue = []; // Clear the queue immediately

                await Promise.all(tasksToExecute);
            }
            running = false;
        }

        const exec_promise = exec(); // Start execution

        return construct_execution_handler(exec_promise, () => {
            running = false;
        });
    }

    function steppable_run(error_handler: (e: Error) => void){ 
        if (queue.length !== 0){
            const [taskId, task] = dequeue()
            return execute_task(taskId, task, error_handler)()
        }
    }

    return {
        schedule,
        execute_sequential,
        execute_simultaneous,
        steppable_run,
        summarize,
        clear_all_tasks,
        set_immediate_execute
    }
}

export const SimpleScheduler = simple_scheduler()


export function clear_all_tasks(){
    SimpleScheduler.clear_all_tasks()
}

export function summarize_scheduler_state(){
    return SimpleScheduler.summarize()
}


export function set_immediate_execute(value: boolean){
    SimpleScheduler.set_immediate_execute(value)
}

export function report_executed_length(){
    return SimpleScheduler
}
export function reset_scheduler(){
    SimpleScheduler.clear_all_tasks()
}

export function schedule_task(task: () => Promise<void>){
    SimpleScheduler.schedule(task)
} 

export function execute_all_tasks_sequential(error_handler: (e: Error) => void) {
    return SimpleScheduler.execute_sequential(error_handler)
}

export function execute_all_tasks_simultaneous(error_handler: (e: Error) => void) {
    return SimpleScheduler.execute_simultaneous(error_handler)
}

export function steppable_run_task(error_handler: (e: Error) => void) {
      SimpleScheduler.steppable_run(error_handler)
}

export const scheduled_reactor = construct_scheduled_reactor<any>(SimpleScheduler.schedule)

export const scheduled_reactive_state = construct_scheduled_stateful_reactor(SimpleScheduler.schedule)

