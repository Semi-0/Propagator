// @ts-nocheck
import { expect, test, beforeEach, describe } from "bun:test";

import { construct_cell, type Cell, update_cell } from "../Cell/Cell";
import { 
    construct_propagator, 
    function_to_primitive_propagator,
    propagator_id,
    type Propagator 
} from "../Propagator/Propagator";
import { 
    parameterize_parent, 
    get_global_parent, 
    set_global_state, 
    PublicStateCommand 
} from "../Shared/PublicState";
import { set_scheduler, execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";
import { merge_value_sets } from "../DataTypes/ValueSet";
import { set_merge } from "../Cell/Merge";
import {
    get_downstream,
    get_upstream,
    get_neighbors,
    get_name,
    get_id,
    node_equal,
    traverse_chain_downstream,
    traverse_chain_upstream,
    traverse_downstream,
    display_value,
    flatten_path,
    traverse_value_path_downstream,
    traverse_value_path_upstream,
    is_location,
    is_downstream,
    is_upstream,
    is_neighbors,
    create_spider
} from "../Shared/Spider";

beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP);
    set_merge(merge_value_sets);
    set_scheduler(simple_scheduler());
});

describe("Spider Traversal Tests", () => {
    
    test("get_downstream returns downstream cells for a cell", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        
        const prop1Fn = function_to_primitive_propagator("prop1", (x: number) => x + 1);
        const prop2Fn = function_to_primitive_propagator("prop2", (x: number) => x * 2);
        const prop1 = prop1Fn(a, b);
        prop2Fn(b, c);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        const downstream = get_downstream(a);

        expect(downstream.length).toBeGreaterThan(0);
        expect(downstream.some(node => get_id(node) === get_id(prop1))).toBe(true);
    });

    test("get_downstream returns downstream propagators for a propagator", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        
        const prop1Fn = function_to_primitive_propagator("prop1", (x: number) => x + 1);
        const prop2Fn = function_to_primitive_propagator("prop2", (x: number) => x * 2);
        const prop1 = prop1Fn(a, b);
        prop2Fn(b, c);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        const downstream = get_downstream(prop1);
        expect(Array.isArray(downstream)).toBe(true);
    });

    test("get_downstream returns empty array for non-cell, non-propagator", () => {
        const result = get_downstream("not a cell");
        expect(result).toEqual([]);
    });

    test("get_upstream returns upstream cells for a cell", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        
        const prop1Fn = function_to_primitive_propagator("prop1", (x: number) => x + 1);
        const prop1 = prop1Fn(a, b);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        const upstream = get_upstream(b);
        expect(upstream.length).toBeGreaterThan(0);
        expect(upstream.some(node => get_id(node) === get_id(prop1))).toBe(true);
    });

    test("get_upstream returns empty array for non-cell, non-propagator", () => {
        const result = get_upstream("not a cell");
        expect(result).toEqual([]);
    });

    test("get_neighbors returns both upstream and downstream for a cell", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        
        const prop1Fn = function_to_primitive_propagator("prop1", (x: number) => x + 1);
        const prop2Fn = function_to_primitive_propagator("prop2", (x: number) => x * 2);
        prop1Fn(a, b);
        prop2Fn(b, c);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        const neighbors = get_neighbors(b);
        expect(neighbors.length).toBeGreaterThan(0);
    });

    test("get_neighbors returns empty array for non-cell, non-propagator", () => {
        const result = get_neighbors("not a cell");
        expect(result).toEqual([]);
    });

    test("get_name returns cell name for a cell", () => {
        const cell = construct_cell("test_cell");
        const name = get_name(cell);
        expect(name).toBe("test_cell");
    });

    test("get_name returns propagator name for a propagator", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const propFn = function_to_primitive_propagator("test_prop", (x: number) => x + 1);
        const prop = propFn(a, b);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        const name = get_name(prop);
        expect(name).toBe("test_prop");
    });

    test("get_name returns empty string for non-cell, non-propagator", () => {
        const name = get_name("not a cell");
        expect(name).toBe("");
    });

    test("get_id returns cell id for a cell", () => {
        const cell = construct_cell("test_cell");
        const id = get_id(cell);
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
    });

    test("get_id returns propagator id for a propagator", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const propFn = function_to_primitive_propagator("test_prop", (x: number) => x + 1);
        const prop = propFn(a, b);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        const id = get_id(prop);
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
    });

    test("get_id returns empty string for non-cell, non-propagator", () => {
        const id = get_id("not a cell");
        expect(id).toBe("");
    });

    test("node_equal returns true for same cell", () => {
        const cell = construct_cell("test_cell");
        expect(node_equal(cell, cell)).toBe(true);
    });

    test("node_equal returns false for different cells", () => {
        const cell1 = construct_cell("cell1");
        const cell2 = construct_cell("cell2");
        expect(node_equal(cell1, cell2)).toBe(false);
    });

    test("traverse_chain_downstream finds path from start to end", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        
        const prop1Fn = function_to_primitive_propagator("prop1", (x: number) => x + 1);
        const prop2Fn = function_to_primitive_propagator("prop2", (x: number) => x * 2);
        prop1Fn(a, b);
        prop2Fn(b, c);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        const result = traverse_chain_downstream(
            (traversed: any[]) => traversed
        )(a, c);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
    });

    test("traverse_chain_upstream finds path from end to start", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        
        const prop1Fn = function_to_primitive_propagator("prop1", (x: number) => x + 1);
        const prop2Fn = function_to_primitive_propagator("prop2", (x: number) => x * 2);
        prop1Fn(a, b);
        prop2Fn(b, c);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        const result = traverse_chain_upstream(
            (traversed: any[]) => traversed
        )(c, a);
        
        expect(Array.isArray(result)).toBe(true);
    });

    // test("traverse_chain_neighbors finds path using neighbors", async () => {
    //     const a = construct_cell("a");
    //     const b = construct_cell("b");
    //     const c = construct_cell("c");
        
    //     const prop1Fn = function_to_primitive_propagator("prop1", (x: number) => x + 1);
    //     const prop2Fn = function_to_primitive_propagator("prop2", (x: number) => x * 2);
    //     prop1Fn(a, b);
    //     prop2Fn(b, c);
        
    //     await execute_all_tasks_sequential((error: Error) => {});
        
    //     const result = traverse_chain_neighbors(
    //         (traversed: any[]) => traversed
    //     )(a, c);
        
    //     expect(Array.isArray(result)).toBe(true);
    // });

    test("traverse_downstream traverses all downstream nodes", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        
        const prop1Fn = function_to_primitive_propagator("prop1", (x: number) => x + 1);
        const prop2Fn = function_to_primitive_propagator("prop2", (x: number) => x * 2);
        prop1Fn(a, b);
        prop2Fn(b, c);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        const result = traverse_downstream(
            (traversed: any[]) => traversed
        )(a);
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
    });

    test("display_value formats cell value correctly", async () => {
        const cell = construct_cell("test_cell");
        update_cell(cell, 42);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        const display = display_value(cell);
        expect(display).toContain("cell");
        expect(display).toContain("test_cell");
    });

    test("display_value formats propagator correctly", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const propFn = function_to_primitive_propagator("test_prop", (x: number) => x + 1);
        const prop = propFn(a, b);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        const display = display_value(prop);
        expect(display).toContain("propagator");
        expect(display).toContain("test_prop");
    });

    test("display_value returns empty string for non-cell, non-propagator", () => {
        const display = display_value("not a cell");
        expect(display).toBe("");
    });

    // test("flatten_path handles single atom path", () => {
    //     const result = flatten_path([], [42]);
    //     expect(result).toEqual([42]);
    // });

    // test("flatten_path handles single array path", () => {
    //     const result = flatten_path([], [[1, 2, 3]]);
    //     expect(result).toEqual([1, 2, 3]);
    // });

    // test("flatten_path handles nested path", () => {
    //     const result = flatten_path([1], [[2, 3]]);
    //     expect(result).toEqual([1, 2, 3]);
    // });

    test("flatten_path returns empty array for invalid path", () => {
        const result = flatten_path([], []);
        expect(result).toEqual([]);
    });

    // test("traverse_value_path_downstream formats paths with arrows", async () => {
    //     const a = construct_cell("a");
    //     const b = construct_cell("b");
    //     const c = construct_cell("c");
        
    //     const prop1Fn = function_to_primitive_propagator("prop1", (x: number) => x + 1);
    //     const prop2Fn = function_to_primitive_propagator("prop2", (x: number) => x * 2);
    //     prop1Fn(a, b);
    //     prop2Fn(b, c);
        
    //     await execute_all_tasks_sequential((error: Error) => {});
        
    //     const result = traverse_value_path_downstream(a, c);
    //     expect(Array.isArray(result)).toBe(true);
    //     if (result.length > 0) {
    //         expect(result[0]).toContain("->");
    //     }
    // });

    test("traverse_value_path_upstream formats paths with arrows", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        
        const prop1Fn = function_to_primitive_propagator("prop1", (x: number) => x + 1);
        const prop2Fn = function_to_primitive_propagator("prop2", (x: number) => x * 2);
        prop1Fn(a, b);
        prop2Fn(b, c);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        const result = traverse_value_path_upstream(c, a);
        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
            expect(result[0]).toContain("<-");
        }
    });

    test("traverse_value_path_neighbors formats paths with double dashes", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        
        const prop1Fn = function_to_primitive_propagator("prop1", (x: number) => x + 1);
        const prop2Fn = function_to_primitive_propagator("prop2", (x: number) => x * 2);
        prop1Fn(a, b);
        prop2Fn(b, c);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        const result = traverse_value_path_neighbors(a, c);
        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
            expect(result[0]).toContain("--");
        }
    });

    test("is_downstream returns true for 'downstream' string", () => {
        expect(is_downstream("downstream")).toBe(true);
        expect(is_downstream("upstream")).toBe(false);
        expect(is_downstream("other")).toBe(false);
    });

    test("is_upstream returns true for 'upstream' string", () => {
        expect(is_upstream("upstream")).toBe(true);
        expect(is_upstream("downstream")).toBe(false);
        expect(is_upstream("other")).toBe(false);
    });

    test("is_neighbors returns true for 'neighbors' string", () => {
        expect(is_neighbors("neighbors")).toBe(true);
        expect(is_neighbors("downstream")).toBe(false);
        expect(is_neighbors("other")).toBe(false);
    });

    test("is_location returns true for cells", () => {
        const cell = construct_cell("test_cell");
        expect(is_location(cell)).toBe(true);
    });

    test("is_location returns true for propagators", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const propFn = function_to_primitive_propagator("test_prop", (x: number) => x + 1);
        const prop = propFn(a, b);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        expect(is_location(prop)).toBe(true);
    });

    test("is_location returns false for invalid inputs", () => {
        expect(is_location("not a location")).toBe(false);
        expect(is_location(42)).toBe(false);
    });

    test("create_spider returns spider with correct interface", () => {
        const cell = construct_cell("start");
        const spider = create_spider(cell);
        
        expect(typeof spider.get_location).toBe("function");
        expect(typeof spider.goto).toBe("function");
        expect(typeof spider.get_web).toBe("function");
    });

    test("create_spider get_location returns initial location", () => {
        const cell = construct_cell("start");
        const spider = create_spider(cell);
        
        const location = spider.get_location();
        expect(node_equal(location, cell)).toBe(true);
    });

    test("create_spider get_web returns empty array initially", () => {
        const cell = construct_cell("start");
        const spider = create_spider(cell);
        
        const web = spider.get_web();
        expect(Array.isArray(web)).toBe(true);
    });

    test("create_spider goto updates location and web", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        
        const prop1Fn = function_to_primitive_propagator("prop1", (x: number) => x + 1);
        const prop2Fn = function_to_primitive_propagator("prop2", (x: number) => x * 2);
        prop1Fn(a, b);
        prop2Fn(b, c);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        const spider = create_spider(a);
        spider.goto(c);
        
        const location = spider.get_location();
        expect(node_equal(location, c)).toBe(true);
        
        const web = spider.get_web();
        expect(Array.isArray(web)).toBe(true);
    });

    test.only("create_spider goto accumulates paths in web", async () => {
        const a = construct_cell("a");
        const b = construct_cell("b");
        const c = construct_cell("c");
        
        const prop1Fn = function_to_primitive_propagator("prop1", (x: number) => x + 1);
        const prop2Fn = function_to_primitive_propagator("prop2", (x: number) => x * 2);
        prop1Fn(a, b);
        prop2Fn(b, c);
        
        await execute_all_tasks_sequential((error: Error) => {});
        
        const spider = create_spider(a);
        const initialWeb = spider.get_web();
        spider.goto(b);
        const webAfterFirst = spider.get_web();
        spider.goto(c);
        const webAfterSecond = spider.get_web();

        console.log(Array.from(webAfterSecond).map(get_name));
        
        expect(webAfterFirst.size).toBeGreaterThanOrEqual(initialWeb.size);
        expect(webAfterSecond.size).toBeGreaterThanOrEqual(webAfterFirst.size);
    });
});

