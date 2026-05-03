import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";

export type VersionClockValue = number | string;
export type VersionClock = Map<string, VersionClockValue>;

export interface DiffRecord<T> {
  readonly record: T;
  readonly multiplicity: number;
}

export interface DiffCollection<T> {
  readonly kind: "diff_collection";
  readonly records: readonly DiffRecord<T>[];
}

export const diff_record = <T>(record: T, multiplicity = 1): DiffRecord<T> => ({ record, multiplicity });

export const consolidate_records = <T>(records: readonly DiffRecord<T>[]): DiffRecord<T>[] => {
  const buckets = new Map<string, DiffRecord<T>[]>();
  for (const incoming of records) {
    if (incoming.multiplicity === 0) continue;
    const key = to_string(incoming.record);
    const bucket = buckets.get(key) ?? [];
    const existing = bucket.find((candidate) => is_equal(candidate.record, incoming.record));
    if (existing) {
      const next = existing.multiplicity + incoming.multiplicity;
      const idx = bucket.indexOf(existing);
      if (next === 0) bucket.splice(idx, 1);
      else bucket[idx] = diff_record(existing.record, next);
    } else {
      bucket.push(diff_record(incoming.record, incoming.multiplicity));
    }
    buckets.set(key, bucket);
  }
  return Array.from(buckets.values()).flat();
};

export const diff_collection = <T>(records: readonly DiffRecord<T>[] = []): DiffCollection<T> => ({
  kind: "diff_collection",
  records: consolidate_records(records),
});

export const empty_diff_collection = <T>(): DiffCollection<T> => diff_collection<T>([]);

export const diff_concat = <T>(a: DiffCollection<T>, b: DiffCollection<T>): DiffCollection<T> =>
  diff_collection([...a.records, ...b.records]);

export const diff_negate = <T>(c: DiffCollection<T>): DiffCollection<T> =>
  diff_collection(c.records.map(({ record, multiplicity }) => diff_record(record, -multiplicity)));

export const diff_map = <A, B>(c: DiffCollection<A>, f: (record: A) => B): DiffCollection<B> =>
  diff_collection(c.records.map(({ record, multiplicity }) => diff_record(f(record), multiplicity)));

export const diff_filter = <T>(c: DiffCollection<T>, predicate: (record: T) => boolean): DiffCollection<T> =>
  diff_collection(c.records.filter(({ record }) => predicate(record)));
