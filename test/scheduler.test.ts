import { expect, test, jest } from "bun:test";
import { reset_scheduler, schedule_task, execute_all_tasks_sequential, simple_scheduler, steppable_run_task } from "../Scheduler";

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

// ... existing imports ...
import { scheduled_reactor, scheduled_reactive_state,  } from "../Scheduler";

// ... existing tests ...

test("scheduled_reactor", async () => {
    reset_scheduler();
    const reactor = scheduled_reactor();
    const mockObserver = jest.fn();
    
    reactor.subscribe(mockObserver);
    
    reactor.next(10);
    reactor.next(20);
    reactor.next(30);
    
    // At this point, no observers should have been called yet
    expect(mockObserver).not.toHaveBeenCalled();
    
    // Execute all scheduled tasks
    await new Promise<void>(resolve => {
        execute_all_tasks_sequential((e) => {
            console.error("Error in task:", e);
        });
        // Give some time for all tasks to complete
        setTimeout(resolve, 100);
    });
    
    // Now the observer should have been called three times
    expect(mockObserver).toHaveBeenCalledTimes(3);
    expect(mockObserver).toHaveBeenNthCalledWith(1, 10);
    expect(mockObserver).toHaveBeenNthCalledWith(2, 20);
    expect(mockObserver).toHaveBeenNthCalledWith(3, 30);
});

test("scheduled_reactive_state", async () => {
    reset_scheduler();
    const reactiveState = scheduled_reactive_state(0);
    const mockObserver = jest.fn();
    
    reactiveState.subscribe(mockObserver);
    
    reactiveState.next(10);
    
    reactiveState.next(20);
    
    reactiveState.next(30);
    
    // At this point, no observers should have been called yet
    expect(mockObserver).not.toHaveBeenCalled();
    
    // Execute all scheduled tasks
    await new Promise<void>(resolve => {
        execute_all_tasks_sequential((e) => {
            console.error("Error in task:", e);
        });
        // Give some time for all tasks to complete
        setTimeout(resolve, 100);
    });
    
    // Now the observer should have been called three times
    expect(mockObserver).toHaveBeenCalledTimes(3);
    expect(mockObserver).toHaveBeenNthCalledWith(1, 10);
    expect(mockObserver).toHaveBeenNthCalledWith(2, 20);
    expect(mockObserver).toHaveBeenNthCalledWith(3, 30);
    expect(reactiveState.get_value()).toBe(30);
});


test("steppable_running scheduled reactor", async () => {
    reset_scheduler()
    const reactor = scheduled_reactor()
    const mockObserver = jest.fn()
    reactor.subscribe(mockObserver)
    reactor.next(10)
    reactor.next(20)
    reactor.next(30)

    await steppable_run_task((e) => {
        console.log("error in task", e)
    })

    expect(mockObserver).toHaveBeenCalledTimes(1)

    await steppable_run_task((e) => {
        console.log("error in task", e)
    })

    expect(mockObserver).toHaveBeenCalledTimes(2)

    await steppable_run_task((e) => {
        console.log("error in task", e)
    })

    expect(mockObserver).toHaveBeenCalledTimes(3)
    expect(mockObserver).toHaveBeenNthCalledWith(1, 10)
    expect(mockObserver).toHaveBeenNthCalledWith(2, 20)
    expect(mockObserver).toHaveBeenNthCalledWith(3, 30)
})