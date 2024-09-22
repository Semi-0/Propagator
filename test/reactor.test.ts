import { expect, test, jest } from "bun:test";
import { construct_reactor } from "../Reactor";
import { scheduled_reactor, execute_all_tasks_sequential, execute_all_tasks_simultaneous, steppable_run_task, schedule_task, reset_scheduler, simple_scheduler } from "../Scheduler";

test("cancellable_execute", async () => {
    reset_scheduler()
    const mockTasks = [
        jest.fn(() => new Promise<void>(resolve => setTimeout(() => { resolve(); }, 100))),
        jest.fn(() => new Promise<void>(resolve => setTimeout(() => { resolve(); }, 200))),
        jest.fn(() => new Promise<void>(resolve => setTimeout(() => { resolve(); }, 300)))
    ];
   
    mockTasks.forEach(task => schedule_task(task));
    
    const cancel = execute_all_tasks_sequential((e) => {
        console.log("error in task", e)
    });

    // Allow some time for the first task to start
    await new Promise(resolve => setTimeout(resolve, 50));

    cancel();

    // Wait for all potential executions to finish
    await new Promise(resolve => setTimeout(resolve, 600));

    expect(mockTasks[0]).toHaveBeenCalled();
    expect(mockTasks[1]).not.toHaveBeenCalled();
    expect(mockTasks[2]).not.toHaveBeenCalled();
});

test("simple_scheduler with steppable_run", async () => {

    const scheduler = simple_scheduler();
    const mockTasks = [
        jest.fn(async () => { console.log(10); }),
        jest.fn(async () => { console.log(20); }),
        jest.fn(async () => { console.log(30); })
    ];

    mockTasks.forEach(task => scheduler.schedule(task));

   

    await scheduler.steppable_run((e) => {
        console.log("error in task", e)
    });
    expect(mockTasks[0]).toHaveBeenCalled();
    expect(mockTasks[1]).not.toHaveBeenCalled();
    expect(mockTasks[2]).not.toHaveBeenCalled();

    await scheduler.steppable_run((e) => {
        console.log("error in task", e)
    });
    expect(mockTasks[1]).toHaveBeenCalled();
    expect(mockTasks[2]).not.toHaveBeenCalled();

    await scheduler.steppable_run((e) => {
        console.log("error in task", e)
    });
    expect(mockTasks[2]).toHaveBeenCalled();
});

