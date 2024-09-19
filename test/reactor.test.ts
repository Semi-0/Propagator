import { expect, test, jest } from "bun:test";
import { construct_reactor, simple_scheduler, cancellable_execute } from "../Reactor";

test("cancellable_execute", async () => {
    const mockTasks = [
        jest.fn(() => new Promise<void>(resolve => setTimeout(() => { resolve(); }, 100))),
        jest.fn(() => new Promise<void>(resolve => setTimeout(() => { resolve(); }, 200))),
        jest.fn(() => new Promise<void>(resolve => setTimeout(() => { resolve(); }, 300)))
    ];

    const cancel = cancellable_execute(mockTasks);

    // Allow some time for the first task to start
    await new Promise(resolve => setTimeout(resolve, 50));

    cancel.next();

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

    const step = scheduler.steppable_run();

    await step();
    expect(mockTasks[0]).toHaveBeenCalled();
    expect(mockTasks[1]).not.toHaveBeenCalled();
    expect(mockTasks[2]).not.toHaveBeenCalled();

    await step();
    expect(mockTasks[1]).toHaveBeenCalled();
    expect(mockTasks[2]).not.toHaveBeenCalled();

    await step();
    expect(mockTasks[2]).toHaveBeenCalled();
});

