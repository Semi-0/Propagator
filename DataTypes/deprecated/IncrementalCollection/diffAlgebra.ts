import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { make_unprocedural_layer, get_base_value, type Layer } from "sando-layer/Basic/Layer";
import { type LayeredObject } from "sando-layer/Basic/LayeredObject";

export type VersionClockValue = number | string;
export type VersionClock = Map<string, VersionClockValue>;

export interface DiffRecord<T> {
  readonly record: T;
  readonly multiplicity: number;
}

export type DiffCollection<T> = LayeredObject<readonly DiffRecord<T>[]>;

export const diff_collection_marker_layer: Layer<true> = make_unprocedural_layer<true>(
  "diff_collection_marker",
  () => true,
);

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

export const diff_collection = <T>(records: readonly DiffRecord<T>[] = []): DiffCollection<T> =>
  construct_layered_datum(
    consolidate_records(records),
    diff_collection_marker_layer,
    true,
  ) as DiffCollection<T>;

export const dc_records = <T>(c: LayeredObject<readonly DiffRecord<T>[]>): readonly DiffRecord<T>[] =>
  get_base_value(c) as readonly DiffRecord<T>[];

export const empty_diff_collection = <T>(): DiffCollection<T> => diff_collection<T>([]);

export const diff_concat = <T>(a: DiffCollection<T>, b: DiffCollection<T>): DiffCollection<T> =>
  diff_collection([...dc_records(a), ...dc_records(b)]);

export const diff_negate = <T>(c: DiffCollection<T>): DiffCollection<T> =>
  diff_collection(dc_records(c).map(({ record, multiplicity }) => diff_record(record, -multiplicity)));

export const diff_map = <A, B>(c: DiffCollection<A>, f: (record: A) => B): DiffCollection<B> =>
  diff_collection(dc_records(c).map(({ record, multiplicity }) => diff_record(f(record), multiplicity)));

export const diff_filter = <T>(c: DiffCollection<T>, predicate: (record: T) => boolean): DiffCollection<T> =>
  diff_collection(dc_records(c).filter(({ record }) => predicate(record)));

