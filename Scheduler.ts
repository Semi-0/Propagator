import { construct_reactor, construct_scheduled_reactor, construct_scheduled_stateful_reactor, type StandardReactor } from "./Reactor";
export interface Scheduler{
    schedule: (f: () => Promise<void>) => void;
    execute_sequential: (error_handler: (e: Error) => void) => (() => void);
    execute_simultaneous: (error_handler: (e: Error) => void) => void;
    steppable_run: () => void;
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


    function execute_task(): () => Promise<void>{
        const f = dequeue()
        return async () => {
            await f().then(() => {
                executed.add(f)
            })
        }
    }

    // what if error occurs in execute_task?
    // set buffer for executed tasks
    function execute_sequential(error_handler: (e: Error) => void): () => void{
        var running = true

        async function exec(){
            while ((queue.size !== 0) && (running)){
                const f = queue.values().next().value 

                try {
                    await f() 
                } catch (e) {
                    error_handler(e)
                }
                queue.delete(f)
                executed.add(f)

            }
        }

        exec()

        return () => {
            running = false
        }
    }

    async function execute_simultaneous(error_handler: (e: Error) => void){
        const tasks = Array.from(queue).map(async (f) => {
            try {
                await f();
                queue.delete(f);
                executed.add(f);
            } catch (e) {
                error_handler(e)
            }
        });

        await Promise.all(tasks);
    }

    function steppable_run(){
        return execute_task()()
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


export function steppable_execute( execute_tasks:  () => Promise<void>): () => Promise<void> {
    return async () => {
        await execute_tasks()
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

export function steppable_run_task() {
      SimpleScheduler.steppable_run()
}

export const scheduled_reactor = construct_scheduled_reactor(SimpleScheduler.schedule)


export const scheduled_reactive_state = construct_scheduled_stateful_reactor(SimpleScheduler.schedule)

// schedule_task(async () => {
//     console.log("Hello")
// })

// schedule_task(async () => {
//     return new Promise((resolve, reject) => {
//         setTimeout(() => {
//             console.log("1000 timeout")
//             resolve()
//         }, 1000)
//     })
// })

// schedule_task(async () => {
//     return new Promise((resolve, reject) => {
//         setTimeout(() => {
//             console.log("2000 timeout")
//             resolve()
//         }, 2000)
//     })
// })

// setTimeout(() => {
//     console.log("simultaneous count 2000")
// }, 2000)

// const cancel =  execute_all_tasks_sequential((e) => {
//     console.log("error in task", e)
// })
// console.log("do other stuff")


// setTimeout(() => {
//     console.log("cancel")
//     cancel()
// }, 1000)



// await execute_all_tasks_simultaneous((e) => {
//     console.log("error in task", e)
// })

