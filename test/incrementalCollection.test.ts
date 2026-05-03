import { beforeEach, describe, expect, test } from "bun:test";
import { construct_cell, cell_strongest, update_cell, type Cell } from "@/cell/Cell";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { get_support_layer_value, support_by } from "sando-layer/Specified/SupportLayer";
import { ce_pipe } from "../Propagator/Sugar";
import {
  diff_collection,
  diff_record,
  collection_at,
  diff_map,
  diff_filter,
  diff_concat,
  diff_negate,
  frontier,
  frontier_message,
  initial_version,
  least_upper_bound,
  normalize_antichain,
  p_collection_filter,
  p_collection_map,
  p_collection_zip,
  p_diff_concat,
  p_diff_distinct,
  p_diff_iterate,
  p_diff_map,
  p_diff_filter,
  p_diff_reduce,
  version,
  version_is_closed_by_frontier,
  version_relation,
  versioned_collection,
  type DiffCollection,
  type DiffRecord,
  type DiffTrace,
  type VersionedCollection,
} from "../DataTypes/IncrementalCollection";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
});

const latestVersioned = <T>(cell: Cell<any>): VersionedCollection<T> => {
  const message = cell_strongest(cell);
  expect(message.kind).toBe("versioned_collection");
  return message as VersionedCollection<T>;
};

const multiplicityOf = <T>(collection: DiffCollection<T>, record: T): number =>
  collection.records.find((candidate) => JSON.stringify(candidate.record) === JSON.stringify(record))?.multiplicity ?? 0;

const distinctCollection = <T>(collection: DiffCollection<T>): DiffCollection<T> => {
  const unique: DiffRecord<T>[] = [];
  for (const { record, multiplicity } of collection.records) {
    if (multiplicity !== 0 && !unique.some((candidate) => JSON.stringify(candidate.record) === JSON.stringify(record))) {
      unique.push(diff_record(record, 1));
    }
  }
  return diff_collection(unique);
};

const addOneBody = (collection: DiffCollection<number>): DiffCollection<number> => {
  const incremented = diff_map(collection, (data) => data + 1);
  const combined = diff_concat(incremented, collection);
  const filtered = diff_filter(combined, (data) => data <= 5);
  const keyed = diff_map(filtered, (data) => [data, null] as readonly [number, null]);
  const distinct = distinctCollection(keyed);
  return diff_map(distinct, (data) => data[0]);
};

const geometricBody = (collection: DiffCollection<number>): DiffCollection<number> => {
  const doubled = diff_map(collection, (data) => data * 2);
  const combined = diff_concat(doubled, collection);
  const filtered = diff_filter(combined, (data) => data <= 50);
  const keyed = diff_map(filtered, (data) => [data, null] as readonly [number, null]);
  const distinct = distinctCollection(keyed);
  return diff_map(distinct, (data) => data[0]);
};

const sortedRecords = <T>(records: readonly DiffRecord<T>[]): readonly DiffRecord<T>[] =>
  [...records].sort((a, b) => JSON.stringify(a.record).localeCompare(JSON.stringify(b.record)));

const sortedNumberRecords = (records: readonly DiffRecord<number>[]): readonly DiffRecord<number>[] =>
  [...records].sort((a, b) => a.record - b.record);

describe("IncrementalCollection differential primitives", () => {
  test("consolidation cancels positive and negative multiplicities", () => {
    const collection = diff_collection([
      diff_record("cat", 2),
      diff_record("dog", 1),
      diff_record("cat", -2),
    ]);

    expect(collection.records).toEqual([diff_record("dog", 1)]);
  });

  test("linear operators transform only the incoming difference collection", () => {
    const delta = diff_collection([diff_record(1, 1), diff_record(2, -1)]);

    expect(diff_map(delta, (n) => n * 10).records).toEqual([
      diff_record(10, 1),
      diff_record(20, -1),
    ]);
    expect(diff_filter(delta, (n) => n % 2 === 0).records).toEqual([diff_record(2, -1)]);
    expect(diff_negate(delta).records).toEqual([diff_record(1, -1), diff_record(2, 1)]);
  });

  test("versions form a product partial order and merge as least upper bound", () => {
    const v10 = version([1, 0]);
    const v01 = version([0, 1]);
    const lub = least_upper_bound(v10, v01);

    expect(version_relation(v10, v01)).toBe("incomparable");
    expect(Array.from(lub.clock.entries())).toEqual([
      ["0", 1],
      ["1", 1],
    ]);
  });

  test("frontiers are normalized antichains and close prior versions", () => {
    const v00 = version([0, 0]);
    const v10 = version([1, 0]);
    const v01 = version([0, 1]);
    const normalized = normalize_antichain([v10, v00, v01]);

    expect(normalized).toEqual([v00]);
    expect(frontier([v10, v01]).versions).toEqual([v10, v01]);
    expect(version_is_closed_by_frontier(v00, frontier([v10, v01]))).toBe(true);
  });
});

describe("IncrementalCollection propagator operators", () => {
  test("p_collection_map emits a mapped versioned difference", async () => {
    const input = construct_cell("diff-input");
    const output = construct_cell("diff-output");
    p_collection_map((n: number) => n * 2)(input, output);

    update_cell(input, versioned_collection(initial_version(), diff_collection([diff_record(10, 1)])));
    await execute_all_tasks_sequential(() => {});

    expect(latestVersioned<number>(output).collection.records).toEqual([diff_record(20, 1)]);
  });

  test("p_collection_filter forwards retractions that satisfy the predicate", async () => {
    const input = construct_cell("filter-input");
    const output = construct_cell("filter-output");
    p_collection_filter((n: number) => n % 2 === 0)(input, output);

    update_cell(input, versioned_collection(initial_version(), diff_collection([
      diff_record(3, 1),
      diff_record(2, -1),
    ])));
    await execute_all_tasks_sequential(() => {});

    expect(latestVersioned<number>(output).collection.records).toEqual([diff_record(2, -1)]);
  });

  test("p_collection_zip joins matching keys and emits at the least upper bound", async () => {
    const left = construct_cell("join-left");
    const right = construct_cell("join-right");
    const output = construct_cell("join-output");
    p_collection_zip<string, number, string>(left, right, output);

    update_cell(left, versioned_collection(version([1, 0]), diff_collection([
      diff_record(["k", 10] as const, 1),
    ])));
    update_cell(right, versioned_collection(version([0, 1]), diff_collection([
      diff_record(["k", "v"] as const, 1),
    ])));
    await execute_all_tasks_sequential(() => {});

    const latest = latestVersioned<readonly [string, readonly [number, string]]>(output);
    expect(Array.from(latest.version.clock.entries())).toEqual([
      ["0", 1],
      ["1", 1],
    ]);
    expect(latest.collection.records).toEqual([
      diff_record(["k", [10, "v"]] as const, 1),
    ]);
  });

  test("p_diff_distinct emits negative multiplicity when a record is retracted", async () => {
    const input = construct_cell("distinct-input");
    const output = construct_cell("distinct-output");
    p_diff_distinct(input, output);

    update_cell(input, versioned_collection(version([0]), diff_collection([diff_record("a", 1)])));
    await execute_all_tasks_sequential(() => {});
    expect(latestVersioned<string>(output).collection.records).toEqual([diff_record("a", 1)]);

    update_cell(input, versioned_collection(version([1]), diff_collection([diff_record("a", -1)])));
    await execute_all_tasks_sequential(() => {});
    expect(latestVersioned<string>(output).collection.records).toEqual([diff_record("a", -1)]);
  });

  test("p_diff_reduce recomputes only touched keys and emits output deltas", async () => {
    const input = construct_cell("reduce-input");
    const output = construct_cell("reduce-output");
    p_diff_reduce<string, number, number>((values) => [
      diff_record(values.reduce((sum, value) => sum + value.record * value.multiplicity, 0), 1),
    ])(input, output);

    update_cell(input, versioned_collection(version([0]), diff_collection([
      diff_record(["a", 2] as readonly [string, number], 1),
      diff_record(["b", 10] as readonly [string, number], 1),
    ])));
    await execute_all_tasks_sequential(() => {});

    let latest = latestVersioned<readonly [string, number]>(output);
    expect(multiplicityOf(latest.collection, ["a", 2] as const)).toBe(1);
    expect(multiplicityOf(latest.collection, ["b", 10] as const)).toBe(1);

    update_cell(input, versioned_collection(version([1]), diff_collection([
      diff_record(["a", 3] as readonly [string, number], 1),
    ])));
    await execute_all_tasks_sequential(() => {});

    latest = latestVersioned<readonly [string, number]>(output);
    expect(multiplicityOf(latest.collection, ["a", 2] as const)).toBe(-1);
    expect(multiplicityOf(latest.collection, ["a", 5] as const)).toBe(1);
    expect(multiplicityOf(latest.collection, ["b", 10] as const)).toBe(0);
  });

  test("frontier messages flow through linear operators", async () => {
    const input = construct_cell("frontier-input");
    const output = construct_cell("frontier-output");
    p_collection_map((n: number) => n)(input, output);

    const message = frontier_message(frontier([version([2])]));
    update_cell(input, message);
    await execute_all_tasks_sequential(() => {});

    expect(cell_strongest(output)).toEqual(message);
  });

  test("trace merge exposes the latest differential message as strongest", async () => {
    const input = construct_cell("trace-input");

    update_cell(input, versioned_collection(version([0]), diff_collection([diff_record("old", 1)])));
    await execute_all_tasks_sequential(() => {});
    expect(latestVersioned<string>(input).collection.records).toEqual([diff_record("old", 1)]);

    update_cell(input, versioned_collection(version([1]), diff_collection([diff_record("new", 1)])));
    await execute_all_tasks_sequential(() => {});
    expect(latestVersioned<string>(input).collection.records).toEqual([diff_record("new", 1)]);
  });

  test("operators preserve Sando support metadata when mapping by identity", async () => {
    const input = construct_cell("metadata-input");
    const output = construct_cell("metadata-output");
    const supported = support_by("record", "source-a");
    p_collection_map((value: any) => value)(input, output);

    update_cell(input, versioned_collection(initial_version(), diff_collection([diff_record(supported, 1)])));
    await execute_all_tasks_sequential(() => {});

    const [record] = latestVersioned<any>(output).collection.records;
    expect(get_support_layer_value(record.record)).toEqual(get_support_layer_value(supported));
  });

  test("linear collection operations scale across 100, 1000, and 10000 records", () => {
    for (const n of [100, 1000, 10000]) {
      const collection = diff_collection(
        Array.from({ length: n }, (_, index) => diff_record(index, 1)),
      );
      const mapped = diff_map(collection, (value) => value + 1);

      expect(mapped.records.length).toBe(n);
      expect(mapped.records[0]).toEqual(diff_record(1, 1));
      expect(mapped.records[n - 1]).toEqual(diff_record(n, 1));
    }
  });

  test("incremental map emits only the affected delta after the initial batch", async () => {
    const input = construct_cell("scale-input");
    const output = construct_cell("scale-output");
    p_collection_map((n: number) => n + 1)(input, output);

    update_cell(input, versioned_collection(version([0]), diff_collection(
      Array.from({ length: 1000 }, (_, index) => diff_record(index, 1)),
    )));
    await execute_all_tasks_sequential(() => {});
    expect(latestVersioned<number>(output).collection.records.length).toBe(1000);

    update_cell(input, versioned_collection(version([1]), diff_collection([diff_record(500, -1)])));
    await execute_all_tasks_sequential(() => {});
    expect(latestVersioned<number>(output).collection.records).toEqual([diff_record(501, -1)]);
  });

  test("acyclic add_one body preserves both concat inputs at the same version", async () => {
    const input = construct_cell("article-input");
    const incremented = construct_cell("article-incremented");
    const combined = construct_cell("article-combined");
    const filtered = construct_cell("article-filtered");
    const keyed = construct_cell("article-keyed");
    const distinct = construct_cell("article-distinct");
    const unkeyed = construct_cell("article-unkeyed");
    const squared = construct_cell("article-squared");

    p_collection_map((n: number) => n + 1)(input, incremented);
    p_diff_concat(incremented, input, combined);
    p_collection_filter((n: number) => n <= 5)(combined, filtered);
    p_collection_map((n: number) => [n, null] as readonly [number, null])(filtered, keyed);
    p_diff_distinct(keyed, distinct);
    p_collection_map(([n]: readonly [number, null]) => n)(distinct, unkeyed);
    p_collection_map((n: number) => [n, n * n] as readonly [number, number])(unkeyed, squared);

    update_cell(input, versioned_collection(initial_version(), diff_collection([diff_record(1, 1)])));
    await execute_all_tasks_sequential(() => {});

    expect(sortedRecords(collection_at<number>(unkeyed.getContent() as DiffTrace<number>, initial_version()).records)).toEqual([
      diff_record(1, 1),
      diff_record(2, 1),
    ]);
    expect(sortedRecords(collection_at<readonly [number, number]>(squared.getContent() as DiffTrace<readonly [number, number]>, initial_version()).records)).toEqual([
      diff_record([1, 1] as const, 1),
      diff_record([2, 4] as const, 1),
    ]);
  });

  test("p_diff_iterate reproduces the article add_one fixpoint and square result", async () => {
    const input = construct_cell("iterate-input");
    const iterated = construct_cell("iterate-output");
    const squared = construct_cell("iterate-squared");

    p_diff_iterate(addOneBody, { maxIterations: 10 })(input, iterated);
    p_collection_map((n: number) => [n, n * n] as readonly [number, number])(iterated, squared);

    update_cell(input, versioned_collection(initial_version(), diff_collection([diff_record(1, 1)])));
    await execute_all_tasks_sequential(() => {});

    expect(sortedRecords(latestVersioned<number>(iterated).collection.records)).toEqual([
      diff_record(1, 1),
      diff_record(2, 1),
      diff_record(3, 1),
      diff_record(4, 1),
      diff_record(5, 1),
    ]);
    expect(sortedRecords(latestVersioned<readonly [number, number]>(squared).collection.records)).toEqual([
      diff_record([1, 1] as const, 1),
      diff_record([2, 4] as const, 1),
      diff_record([3, 9] as const, 1),
      diff_record([4, 16] as const, 1),
      diff_record([5, 25] as const, 1),
    ]);
  });

  test("p_diff_iterate emits retractions when a fixpoint contribution is removed", async () => {
    const input = construct_cell("iterate-retract-input");
    const output = construct_cell("iterate-retract-output");

    p_diff_iterate(geometricBody, { maxIterations: 10 })(input, output);

    update_cell(input, versioned_collection(version([0]), diff_collection([diff_record(3, 1)])));
    await execute_all_tasks_sequential(() => {});
    expect(sortedNumberRecords(latestVersioned<number>(output).collection.records)).toEqual([
      diff_record(3, 1),
      diff_record(6, 1),
      diff_record(12, 1),
      diff_record(24, 1),
      diff_record(48, 1),
    ]);

    update_cell(input, versioned_collection(version([1]), diff_collection([diff_record(3, -1)])));
    await execute_all_tasks_sequential(() => {});
    expect(sortedNumberRecords(latestVersioned<number>(output).collection.records)).toEqual([
      diff_record(3, -1),
      diff_record(6, -1),
      diff_record(12, -1),
      diff_record(24, -1),
      diff_record(48, -1),
    ]);
  });

  test("ce_pipe chains diff operators just like make_ce_arithmetical does for arithmetic", async () => {
    const input = construct_cell("ce-pipe-input");
    const result = ce_pipe(
      input,
      p_diff_map((n: number) => n + 1),
      p_diff_filter((n: number) => n % 2 === 0),
      p_diff_distinct,
    );

    update_cell(input, versioned_collection(initial_version(), diff_collection([
      diff_record(1, 1), // +1 -> 2 (kept), distinct +1
      diff_record(2, 1), // +1 -> 3 (filtered out)
      diff_record(3, 1), // +1 -> 4 (kept), distinct +1
    ])));
    await execute_all_tasks_sequential(() => {});

    expect(sortedNumberRecords(latestVersioned<number>(result).collection.records)).toEqual([
      diff_record(2, 1),
      diff_record(4, 1),
    ]);

    // A retraction of the same source record should re-emit a -1 through the chain.
    update_cell(input, versioned_collection(version([1]), diff_collection([diff_record(1, -1)])));
    await execute_all_tasks_sequential(() => {});
    expect(latestVersioned<number>(result).collection.records).toEqual([diff_record(2, -1)]);
  });
});

