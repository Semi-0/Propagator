import { expect, test, jest } from "bun:test";
import { construct_reactor } from "../Shared/Reactivity/Reactor";
import { scheduled_reactor, execute_all_tasks_sequential, execute_all_tasks_simultaneous, steppable_run_task, schedule_task, reset_scheduler, simple_scheduler } from "../Shared/Reactivity/Scheduler";
import { zip, merge } from "../Shared/Reactivity/Reactor";
import { filter, map, scan, combine_latest } from "../Shared/Reactivity/Reactor";
import { compact_map } from "../Shared/Reactivity/Reactor";


test("filter", () => {
    const reactor = construct_reactor<number>();
    const filteredReactor = filter<number>(v => v % 2 === 0)(reactor);

    const observer = jest.fn();
    filteredReactor.subscribe(observer);

    reactor.next(1);
    reactor.next(2);
    reactor.next(3);
    reactor.next(4);

    expect(observer).toHaveBeenCalledTimes(2);
    expect(observer).toHaveBeenCalledWith(2);
    expect(observer).toHaveBeenCalledWith(4);
});

test("map", () => {
    const reactor = construct_reactor<number>();
    const mappedReactor = map<number>(v => v * 2)(reactor);

    const observer = jest.fn();
    mappedReactor.subscribe(observer);

    reactor.next(1);
    reactor.next(2);
    reactor.next(3);

    expect(observer).toHaveBeenCalledTimes(3);
    expect(observer).toHaveBeenCalledWith(2);
    expect(observer).toHaveBeenCalledWith(4);
    expect(observer).toHaveBeenCalledWith(6);
});

test("scan", () => {
    const reactor = construct_reactor<number>();
    const scannedReactor = scan<number>((v, acc) => (acc || 0) + v)(reactor);

    const observer = jest.fn();
    scannedReactor.subscribe(observer);

    reactor.next(1);
    reactor.next(2);
    reactor.next(3);

    expect(observer).toHaveBeenCalledTimes(3);
    expect(observer).toHaveBeenCalledWith(1);
    expect(observer).toHaveBeenCalledWith(3);
    expect(observer).toHaveBeenCalledWith(6);
});

test("combineLatest", () => {
    const reactor1 = construct_reactor<number>();
    const reactor2 = construct_reactor<number>();
    const combinedReactor = combine_latest<number>(reactor1, reactor2);

    const observer = jest.fn((...args: any[]) => {
        console.log("args", args)
    });
    combinedReactor.subscribe(observer);

    reactor1.next(1);
    reactor2.next(2);
    reactor1.next(3);
    reactor2.next(4);

    expect(observer).toHaveBeenCalledTimes(3);
    expect(observer).toHaveBeenCalledWith([1, 2]);
    expect(observer).toHaveBeenCalledWith([3, 4]);
});

test("combineLatest with single input", () => {
    const reactor1 = construct_reactor<number>();

    const combinedReactor = combine_latest<number>(reactor1);

    const observer = jest.fn((...args: any[]) => {
        console.log("args", args)
    });
    combinedReactor.subscribe(observer);

    reactor1.next(1);
    reactor1.next(3);

    expect(observer).toHaveBeenCalledTimes(2);
    expect(observer).toHaveBeenNthCalledWith(1, [1]);
    expect(observer).toHaveBeenNthCalledWith(2, [3]);
});

test("zip", () => {
    const reactor1 = construct_reactor<number>();
    const reactor2 = construct_reactor<string>();
    const zippedReactor = zip(reactor1, reactor2);

    const observer = jest.fn();
    zippedReactor.subscribe(observer);

    reactor1.next(1);
    reactor2.next("a");
    reactor1.next(2);
    reactor2.next("b");
    reactor1.next(3);
    reactor2.next("c");

    expect(observer).toHaveBeenCalledTimes(3);
    expect(observer).toHaveBeenNthCalledWith(1, [1, "a"]);
    expect(observer).toHaveBeenNthCalledWith(2, [2, "b"]);
    expect(observer).toHaveBeenNthCalledWith(3, [3, "c"]);
});

test("merge", () => {
    const reactor1 = construct_reactor<number>();
    const reactor2 = construct_reactor<string>();
    const mergedReactor = merge(reactor1, reactor2);

    const observer = jest.fn();
    mergedReactor.subscribe(observer);

    reactor1.next(1);
    reactor2.next("a");
    reactor1.next(2);
    reactor2.next("b");

    expect(observer).toHaveBeenCalledTimes(4);
    expect(observer).toHaveBeenNthCalledWith(1, 1);
    expect(observer).toHaveBeenNthCalledWith(2, "a");
    expect(observer).toHaveBeenNthCalledWith(3, 2);
    expect(observer).toHaveBeenNthCalledWith(4, "b");
});

test("compact_map", () => {
    const reactor = construct_reactor<number | null | undefined>();
    // @ts-ignore
    const compact_mapper = compact_map((v) => v !== null && v !== undefined ? v * 2 : v)
    const observer = jest.fn();
    // @ts-ignore
    // console.log(inspect(compact_mapper, {showHidden: true}))
    compact_mapper(reactor).subscribe(observer);

    reactor.next(1);
    reactor.next(null);
    reactor.next(2);
    reactor.next(undefined);
    reactor.next(3);

    expect(observer).toHaveBeenCalledTimes(3);
    expect(observer).toHaveBeenNthCalledWith(1, 2);
    expect(observer).toHaveBeenNthCalledWith(2, 4);
    expect(observer).toHaveBeenNthCalledWith(3, 6);
});



test("reactor dispose stops calling observers", () => {
    const reactor = construct_reactor<number>();
    const observer = jest.fn();
    reactor.subscribe(observer);

    // Call next before dispose: observer should be triggered.
    reactor.next(10);
    expect(observer).toHaveBeenCalledTimes(1);
    expect(observer).toHaveBeenCalledWith(10);

    // Dispose the reactor.
    reactor.dispose();

    // Further calls to next should not invoke any observers.
    reactor.next(20);
    expect(observer).toHaveBeenCalledTimes(1);

    // Subscribing a new observer after dispose should have no effect.
    const observer2 = jest.fn();
    reactor.subscribe(observer2);
    reactor.next(30);
    expect(observer2).toHaveBeenCalledTimes(0);
});

test("subscribe no-op after dispose", () => {
    const reactor = construct_reactor<number>();

    // Dispose immediately.
    reactor.dispose();

    // Attempt to subscribe an observer after disposal.
    const observer = jest.fn();
    reactor.subscribe(observer);

    // Calling next should not trigger the new observer.
    reactor.next(100);
    expect(observer).toHaveBeenCalledTimes(0);
});

test("multiple dispose calls are safe", () => {
    const reactor = construct_reactor<number>();
    const observer = jest.fn();
    reactor.subscribe(observer);

    reactor.next(5);
    expect(observer).toHaveBeenCalledTimes(1);

    // Calling dispose more than once should not throw an error.
    expect(() => {
        reactor.dispose();
        reactor.dispose();
    }).not.toThrow();

    // After disposal, further next calls have no effect.
    reactor.next(10);
    expect(observer).toHaveBeenCalledTimes(1);
});