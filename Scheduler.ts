import { construct_reactor, construct_scheduled_reactor, construct_scheduled_stateful_reactor, type StandardReactor } from "./Reactor";
export interface Scheduler{
    schedule: (f: () => Promise<void>) => void;
    execute_sequential: (error_handler: (e: Error) => void) => (() => void);
    execute_simultaneous: (error_handler: (e: Error) => void) => void;
    steppable_run:  (error_handler: (e: Error) => void) => void;
    get_executed_length: () => number;
    clear_all_tasks: () => void;
}


export function simple_scheduler(): Scheduler {

    var queue: Set<(() => Promise<void>)> = new Set() 
    var executed: Set<(() => Promise<void>)> = new Set()

    function schedule(f: () => Promise<void>){
        queue.add(f)
    }

    function dequeue(): () => Promise<void>{
        var f = queue.values().next().value
        queue.delete(f)
        return f
    } 


    function get_executed_length(): number {
        return executed.size
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
    function execute_sequential(error_handler: (e: Error) => void): () => void{
        var running = true

        async function exec(){
            while ((queue.size !== 0) && (running)){
                await execute_task(dequeue(), error_handler)()
            }
        }

        exec()

        return () => {
            running = false
        }
    }

    async function execute_simultaneous(error_handler: (e: Error) => void){
        var running = true
        async function exec(){
            if (running){
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
        return execute_task(dequeue(), error_handler)()
    }

 

    return {
        schedule,
        execute_sequential,
        execute_simultaneous,
        steppable_run,
        get_executed_length,
        clear_all_tasks
    }
}

export const SimpleScheduler = simple_scheduler()

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
