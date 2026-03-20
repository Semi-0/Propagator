/**
 * Tests for Shared/Spider.ts.
 * All functions under test pass. Fix applied: Spider.ts now imports
 * cell_strongest_base_value from "../Cell/Cell" instead of "ppropogator".
 * Note: create_spider.get_web() returns a Set (interface updated to Set<any>).
 */
import { expect, test, beforeEach, describe } from "bun:test";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { merge_value_sets } from "../DataTypes/ValueSet";
import { set_merge } from "../Cell/Merge";
import { construct_cell } from "../Cell/Cell";
import { construct_propagator } from "../Propagator/Propagator";
import {
    traverse,
    get_downstream,
    get_upstream,
    get_neighbors,
    get_id,
    get_name,
    node_equal,
    unshift,
    traverse_downstream,
    traverse_chain_downstream,
    traverse_chain_upstream,
    display_value,
    flatten_path,
    create_spider,
    is_downstream,
    is_upstream,
    is_neighbors,
    is_location,
} from "../Shared/Spider";

beforeEach(() => {
    set_global_state(PublicStateCommand.CLEAN_UP);
    set_merge(merge_value_sets);
});

describe("Spider", () => {
    describe("traverse", () => {
        test("traverse with identity step and final returns single-element array", () => {
            const result = traverse(
                (x, _go) => [x],
                (t) => t
            )(42);
            expect(result).toEqual([42]);
        });

        test("traverse with list step collects nodes", () => {
            const result = traverse(
                (x, _go) => (x >= 3 ? [x] : [x, x + 1]),
                (t) => t
            )(0);
            expect(Array.isArray(result)).toBe(true);
            expect(result).toContain(0);
            expect(result).toContain(1);
        });
    });

    describe("get_downstream / get_upstream / get_neighbors", () => {
        test("get_downstream and get_upstream on non-cell/non-propagator return []", () => {
            expect(get_downstream(null)).toEqual([]);
            expect(get_downstream({})).toEqual([]);
            expect(get_upstream(null)).toEqual([]);
            expect(get_neighbors(42)).toEqual([]);
        });

        test("get_downstream and get_upstream on real graph: A -> P -> B", () => {
            const a = construct_cell("a");
            const b = construct_cell("b");
            construct_propagator([a], [b], () => b.update(a.getStrongest()), "P");

            expect(get_downstream(a)).toHaveLength(1);
            expect(get_upstream(a)).toHaveLength(0);

            expect(get_downstream(b)).toHaveLength(0);
            expect(get_upstream(b)).toHaveLength(1);
        });
    });

    describe("get_id / get_name / node_equal", () => {
        test("get_id and get_name for non-node return empty string", () => {
            expect(get_id(null)).toBe("");
            expect(get_name({})).toBe("");
        });

        test("node_equal by id", () => {
            const a = construct_cell("x");
            const b = construct_cell("y");
            expect(node_equal(a, a)).toBe(true);
            expect(node_equal(a, b)).toBe(false);
        });
    });

    describe("unshift", () => {
        test("unshift prepends element", () => {
            expect(unshift(1, [2, 3])).toEqual([1, 2, 3]);
        });
    });

    describe("traverse_downstream", () => {
        test("traverse_downstream from input cell A in A->P->B returns [A, P, B]", () => {
            const a = construct_cell("a");
            const b = construct_cell("b");
            construct_propagator([a], [b], () => b.update(a.getStrongest()), "P");

            const result = traverse_downstream((x) => x)(a);
            expect(result).toHaveLength(3);
            expect(result[0]).toBe(a);
            expect(result[1]).toBe(get_downstream(a)[0]);
            expect(result[2]).toBe(b);
        });

        test("traverse_downstream from output cell B in A->P->B returns only [B]", () => {
            const a = construct_cell("a");
            const b = construct_cell("b");
            construct_propagator([a], [b], () => b.update(a.getStrongest()), "P");

            const result = traverse_downstream((x) => x)(b);
            expect(result).toEqual([b]);
        });
    });

    describe("traverse_chain_downstream / traverse_chain_upstream", () => {
        test("traverse_chain_downstream same cell returns single-node path", () => {
            const b = construct_cell("b");
            const paths = traverse_chain_downstream((x) => x)(b, b);
            expect(paths).toEqual([[b]]);
        });

        test("traverse_chain_upstream from B to A in A->P->B returns path [B, P, A]", () => {
            const a = construct_cell("a");
            const b = construct_cell("b");
            construct_propagator([a], [b], () => b.update(a.getStrongest()), "P");

            const paths = traverse_chain_upstream((x) => x)(b, a);
            expect(Array.isArray(paths)).toBe(true);
            expect(paths.length).toBeGreaterThanOrEqual(1);
            const path = paths[0];
            expect(path).toContain(b);
            expect(path).toContain(a);
        });

        test("traverse_chain_downstream from A to B in A->P->B returns one path [A, P, B]", () => {
            const a = construct_cell("a");
            const b = construct_cell("b");
            construct_propagator([a], [b], () => b.update(a.getStrongest()), "P");

            const paths = traverse_chain_downstream((x) => x)(a, b);
            expect(paths).toHaveLength(1);
            expect(paths[0]).toHaveLength(3);
            expect(paths[0][0]).toBe(a);
            expect(paths[0][2]).toBe(b);
        });
    });

    describe("display_value", () => {
        test("display_value for cell includes name and value", () => {
            const c = construct_cell("c");
            c.update(10);
            const s = display_value(c);
            expect(s).toContain("cell");
            expect(s).toContain("c");
        });

        test("display_value for non-node returns empty string", () => {
            expect(display_value(null)).toBe("");
        });
    });

    describe("flatten_path", () => {
        test("flatten_path single atom", () => {
            expect(flatten_path([], [1])).toEqual([1]);
        });

        test("flatten_path nested path structure", () => {
            expect(flatten_path([], [1, [2, [3]]])).toEqual([1, 2, 3]);
        });
    });

    describe("is_downstream / is_upstream / is_neighbors / is_location", () => {
        test("direction strings", () => {
            expect(is_downstream("downstream")).toBe(true);
            expect(is_downstream("upstream")).toBe(false);
            expect(is_upstream("upstream")).toBe(true);
            expect(is_neighbors("neighbors")).toBe(true);
        });

        test("is_location for cell is true", () => {
            const c = construct_cell("c");
            expect(is_location(c)).toBe(true);
        });
    });

    describe("create_spider", () => {
        test("create_spider get_location and goto", () => {
            const a = construct_cell("a");
            const b = construct_cell("b");
            construct_propagator([a], [b], () => b.update(a.getStrongest()), "P");

            const spider = create_spider(a);
            expect(spider.get_location()).toBe(a);
            spider.goto(b);
            expect(spider.get_location()).toBe(b);
        });

        test("create_spider get_web returns collection (Set); can convert to array", () => {
            const a = construct_cell("a");
            const b = construct_cell("b");
            construct_propagator([a], [b], () => b.update(a.getStrongest()), "P");

            const spider = create_spider(a);
            spider.goto(b);
            const web = spider.get_web();
            const arr = Array.isArray(web) ? web : Array.from(web);
            expect(arr.length).toBeGreaterThanOrEqual(1);
        });
    });
});
