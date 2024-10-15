import { construct_reactor, construct_scheduled_reactor, construct_scheduled_stateful_reactor, type StandardReactor } from "./Reactivity/Reactor";
export interface Scheduler{
    schedule: (f: () => Promise<void>) => void;
    execute_sequential: (error_handler: (e: Error) => void) => ExecutionHandler;
    execute_simultaneous: (error_handler: (e: Error) => void) => void;
    steppable_run:  (error_handler: (e: Error) => void) => void;
    summarize: () => string;
    clear_all_tasks: () => void;
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

export function simple_scheduler(): Scheduler {

    var queue: Set<(() => Promise<void>)> = new Set() 
    var executed: Set<(() => Promise<void>)> = new Set()
    var immediate_execute: boolean = false

    function schedule(f: () => Promise<void>){
        if (immediate_execute){
            f()
            executed.add(f)
        }
        else{
            queue.add(f)
        }
    }

    function set_immediate_execute(value: boolean){
        immediate_execute = value
    }

    function dequeue(): () => Promise<void>{
        var f = queue.values().next().value
        queue.delete(f)
        return f
    } 

    function summarize(): string{
        return "in_queue: " +  queue.size.toString() + " " 
                + "executed: " + executed.size.toString()
    }
     
   


    function clear_all_tasks(){
        queue.clear()
        executed.clear()
    }


    function execute_task(task: () => Promise<void>, error_handler: (e: Error) => void): () => Promise<void>{
        return async () => {
            await task().then(() => {
                executed.add(task)
            }).catch((e) => {
                error_handler(e)
            })
        }
    }

    // what if error occurs in execute_task?
    // set buffer for executed tasks
    function execute_sequential(error_handler: (e: Error) => void): ExecutionHandler{
        // this failed to considered when new task poped up during execution
        // still needs cancellable promise
        var running = true

        async function exec(){
            while ((queue.size !== 0) && (running)){
                await execute_task(dequeue(), error_handler)()
            }
        }

        const promise = exec()

        return construct_execution_handler(promise, () => {
            running = false
        })
    }

    async function execute_simultaneous(error_handler: (e: Error) => void){
        // TODO:
        var running = true
        async function exec(){
            if (running ){
            const tasksToExecute = Array.from(queue);
            queue.clear(); // Clear the queue immediately
            const tasks = tasksToExecute.map(async (f) => {
                execute_task(f, error_handler)()
            });

            await Promise.all(tasks);
            }
        }
        while (queue.size !== 0){
            await exec()
        }

        return () => {
            running = false
        }
    }

    function steppable_run(error_handler: (e: Error) => void){ 
        if (queue.size !== 0){
            return execute_task(dequeue(), error_handler)()
        }
    }

 

    return {
        schedule,
        execute_sequential,
        execute_simultaneous,
        steppable_run,
        summarize,
        clear_all_tasks
    }
}

export const SimpleScheduler = simple_scheduler()

export function summarize_scheduler_state(){
    return SimpleScheduler.summarize()
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

export async function execute_all_tasks_simultaneous(error_handler: (e: Error) => void) {
    return SimpleScheduler.execute_simultaneous(error_handler)
}

export function steppable_run_task(error_handler: (e: Error) => void) {
      SimpleScheduler.steppable_run(error_handler)
}

export const scheduled_reactor = construct_scheduled_reactor(SimpleScheduler.schedule)

export const scheduled_reactive_state = construct_scheduled_stateful_reactor(SimpleScheduler.schedule)
