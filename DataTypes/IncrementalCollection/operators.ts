import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import type { Cell } from "@/cell/Cell";
import type { Propagator } from "../../Propagator/Propagator";
import {
  consolidate_records,
  diff_collection,
  diff_concat,
  diff_filter,
  diff_map,
  diff_negate,
  diff_record,
  empty_diff_collection,
  type DiffCollection,
  type DiffRecord,
} from "./diffAlgebra";
import { make_diff_binary_operator, make_diff_operator } from "./operatorFactory";
import type { DiffMessage, VersionedCollection } from "./messagesTrace";
import { versioned_collection } from "./messagesTrace";
import { least_upper_bound, type Version } from "./versionFrontier";

const stateless_step = <A, B>(
  f: (message: VersionedCollection<A>) => DiffMessage<B>,
): ((state: null, message: VersionedCollection<A>) => readonly DiffMessage<B>[]) =>
  (_state, message) => [f(message)];

export const p_diff_map = <A, B>(f: (record: A) => B) =>
  make_diff_operator<null, A, B>(
    "p_diff_map",
    () => null,
    stateless_step((m) => versioned_collection(m.version, diff_map(m.collection, f))),
  );

export const p_diff_filter = <T>(predicate: (record: T) => boolean) =>
  make_diff_operator<null, T, T>(
    "p_diff_filter",
    () => null,
    stateless_step((m) => versioned_collection(m.version, diff_filter(m.collection, predicate))),
  );

export const p_diff_negate = make_diff_operator<null, any, any>(
  "p_diff_negate",
  () => null,
  stateless_step((m) => versioned_collection(m.version, diff_negate(m.collection))),
);

export const p_collection_map = p_diff_map;
export const p_collection_filter = p_diff_filter;

export const p_diff_concat = make_diff_binary_operator<null, any, any, any>(
  "p_diff_concat",
  () => null,
  (_state, message) => [message],
);

type DistinctState<T> = { totals: DiffRecord<T>[] };

export const p_diff_distinct = make_diff_operator<DistinctState<any>, any, any>(
  "p_diff_distinct",
  () => ({ totals: [] }),
  (state, message) => {
    const emitted: DiffRecord<any>[] = [];
    for (const diff of message.collection.records) {
      const existing = state.totals.find((c) => is_equal(c.record, diff.record));
      const before = existing?.multiplicity ?? 0;
      const after = before + diff.multiplicity;
      if (existing) {
        const idx = state.totals.indexOf(existing);
        if (after === 0) state.totals.splice(idx, 1);
        else state.totals[idx] = diff_record(existing.record, after);
      } else if (after !== 0) {
        state.totals.push(diff_record(diff.record, after));
      }
      if (before === 0 && after !== 0) emitted.push(diff_record(diff.record, 1));
      if (before !== 0 && after === 0) emitted.push(diff_record(diff.record, -1));
    }
    return [versioned_collection(message.version, diff_collection(emitted))];
  },
);

type ReduceState<K, V, O> = {
  inputByKey: Map<K, DiffRecord<V>[]>;
  outputByKey: Map<K, DiffRecord<O>[]>;
};

const isRecordPair = (value: any): value is readonly [any, any] =>
  Array.isArray(value) && value.length === 2;

export const p_diff_reduce = <K, V, O>(
  reduceFn: (values: readonly DiffRecord<V>[], key: K) => readonly DiffRecord<O>[],
) =>
  make_diff_operator<ReduceState<K, V, O>, readonly [K, V], readonly [K, O]>(
    "p_diff_reduce",
    () => ({ inputByKey: new Map(), outputByKey: new Map() }),
    (state, message) => {
      const touched = new Set<K>();
      for (const diff of message.collection.records) {
        if (!isRecordPair(diff.record)) continue;
        const [key, value] = diff.record as readonly [K, V];
        const current = state.inputByKey.get(key) ?? [];
        state.inputByKey.set(
          key,
          consolidate_records([...current, diff_record(value, diff.multiplicity)]),
        );
        touched.add(key);
      }

      const emitted: DiffRecord<readonly [K, O]>[] = [];
      for (const key of touched) {
        const previous = state.outputByKey.get(key) ?? [];
        const next = consolidate_records(reduceFn(state.inputByKey.get(key) ?? [], key));
        const delta = diff_concat(diff_collection(next), diff_negate(diff_collection(previous)));
        state.outputByKey.set(key, next);
        for (const r of delta.records) {
          emitted.push(diff_record([key, r.record] as const, r.multiplicity));
        }
      }
      return [versioned_collection(message.version, diff_collection(emitted))];
    },
  );

type ArrangementEntry<V> = { readonly version: Version; readonly value: V; readonly multiplicity: number };
type JoinState<K, A, B> = {
  leftArrangement: Map<K, ArrangementEntry<A>[]>;
  rightArrangement: Map<K, ArrangementEntry<B>[]>;
};

export const p_diff_join = <K, A, B>(
  left: Cell<any>,
  right: Cell<any>,
  output: Cell<any>,
): Propagator =>
  make_diff_binary_operator<
    JoinState<K, A, B>,
    readonly [K, A],
    readonly [K, B],
    readonly [K, readonly [A, B]]
  >(
    "p_diff_join",
    () => ({ leftArrangement: new Map(), rightArrangement: new Map() }),
    (state, message, side) => {
      const data = message as VersionedCollection<readonly [K, any]>;
      const ours: Map<K, ArrangementEntry<any>[]> =
        side === "left" ? state.leftArrangement : state.rightArrangement;
      const other: Map<K, ArrangementEntry<any>[]> =
        side === "left" ? state.rightArrangement : state.leftArrangement;
      const out: VersionedCollection<readonly [K, readonly [A, B]]>[] = [];

      for (const { record, multiplicity } of data.collection.records) {
        if (!isRecordPair(record)) continue;
        const [key, value] = record as readonly [K, any];
        for (const o of other.get(key) ?? []) {
          const v = least_upper_bound(data.version, o.version);
          const r: readonly [K, readonly [A, B]] = side === "left"
            ? [key, [value as A, o.value as B]]
            : [key, [o.value as A, value as B]];
          out.push(
            versioned_collection(v, diff_collection([diff_record(r, multiplicity * o.multiplicity)])),
          );
        }
        const entries = ours.get(key) ?? [];
        entries.push({ version: data.version, value, multiplicity });
        ours.set(key, entries);
      }
      return out;
    },
  )(left, right, output);

export const p_collection_zip = p_diff_join;

export interface DiffIterateOptions {
  readonly maxIterations?: number;
}

export const collections_equal = <T>(a: DiffCollection<T>, b: DiffCollection<T>): boolean =>
  is_equal(diff_collection(a.records), diff_collection(b.records));

export const iterate_diff_collection = <T>(
  initial: DiffCollection<T>,
  step: (collection: DiffCollection<T>) => DiffCollection<T>,
  options: DiffIterateOptions = {},
): DiffCollection<T> => {
  const max = options.maxIterations ?? 100;
  let current = diff_collection(initial.records);
  for (let i = 0; i < max; i++) {
    const next = diff_collection(step(current).records);
    if (collections_equal(current, next)) return current;
    current = next;
  }
  throw new Error(`p_diff_iterate did not reach a fixed point within ${max} iterations`);
};

type IterateState<T> = { input: DiffCollection<T>; output: DiffCollection<T> };

export const p_diff_iterate = <T>(
  step: (collection: DiffCollection<T>) => DiffCollection<T>,
  options: DiffIterateOptions = {},
) =>
  make_diff_operator<IterateState<T>, T, T>(
    "p_diff_iterate",
    () => ({ input: empty_diff_collection<T>(), output: empty_diff_collection<T>() }),
    (state, message) => {
      const nextInput = diff_concat(state.input, message.collection);
      const nextOutput = iterate_diff_collection(nextInput, step, options);
      const delta = diff_concat(nextOutput, diff_negate(state.output));
      state.input = nextInput;
      state.output = nextOutput;
      return [versioned_collection(message.version, delta)];
    },
  );
