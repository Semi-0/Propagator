import { is_number } from "generic-handler/built_in_generics/generic_predicates";
import { register_predicate } from "generic-handler/Predicates";
import type { DiffCollection, DiffRecord } from "./diffAlgebra";
import { diff_collection } from "./diffAlgebra";
import type { AntichainFrontier, Version } from "./versionFrontier";
import { same_version, version_is_closed_by_frontier, version_less_equal } from "./versionFrontier";

export interface VersionedCollection<T> {
  readonly kind: "versioned_collection";
  readonly version: Version;
  readonly collection: DiffCollection<T>;
}

export interface FrontierMessage {
  readonly kind: "frontier_message";
  readonly frontier: AntichainFrontier;
}

export type DiffMessage<T> = VersionedCollection<T> | FrontierMessage;

export interface DiffTrace<T> {
  readonly kind: "diff_trace";
  readonly messages: readonly DiffMessage<T>[];
}

export const versioned_collection = <T>(v: Version, collection: DiffCollection<T>): VersionedCollection<T> => ({
  kind: "versioned_collection",
  version: v,
  collection,
});

export const frontier_message = (f: AntichainFrontier): FrontierMessage => ({
  kind: "frontier_message",
  frontier: f,
});

export const empty_trace = <T>(): DiffTrace<T> => ({ kind: "diff_trace", messages: [] });

export const trace_merge = <T>(trace: DiffTrace<T>, message: DiffMessage<T>): DiffTrace<T> => ({
  kind: "diff_trace",
  messages: [...trace.messages, message],
});

export const is_diff_record = register_predicate("is_diff_record", (v: any): v is DiffRecord<any> =>
  v != null && "record" in v && is_number(v.multiplicity));

export const is_diff_collection = register_predicate("is_diff_collection", (v: any): v is DiffCollection<any> =>
  v?.kind === "diff_collection" && Array.isArray(v.records) && v.records.every(is_diff_record));

export const is_version = register_predicate("is_diff_version", (v: any): v is Version =>
  v?.kind === "diff_version" && v.clock instanceof Map);

export const is_frontier = register_predicate("is_antichain_frontier", (v: any): v is AntichainFrontier =>
  v?.kind === "antichain_frontier" && Array.isArray(v.versions) && v.versions.every(is_version));

export const is_versioned_collection = register_predicate(
  "is_versioned_collection",
  (v: any): v is VersionedCollection<any> =>
    v?.kind === "versioned_collection" && is_version(v.version) && is_diff_collection(v.collection),
);

export const is_frontier_message = register_predicate("is_frontier_message", (v: any): v is FrontierMessage =>
  v?.kind === "frontier_message" && is_frontier(v.frontier));

export const is_diff_message = register_predicate("is_diff_message", (v: any): v is DiffMessage<any> =>
  is_versioned_collection(v) || is_frontier_message(v));

export const is_diff_trace = register_predicate("is_diff_trace", (v: any): v is DiffTrace<any> =>
  v?.kind === "diff_trace" && Array.isArray(v.messages));

export const trace_data_messages = <T>(trace: DiffTrace<T>): readonly VersionedCollection<T>[] =>
  trace.messages.filter(is_versioned_collection) as readonly VersionedCollection<T>[];

export const trace_frontiers = <T>(trace: DiffTrace<T>): readonly AntichainFrontier[] =>
  trace.messages.filter(is_frontier_message).map((m) => (m as FrontierMessage).frontier);

export const trace_latest = <T>(trace: DiffTrace<T>): DiffMessage<T> | null =>
  (trace.messages[trace.messages.length - 1] as DiffMessage<T> | undefined) ?? null;

export const difference_at = <T>(trace: DiffTrace<T>, v: Version): DiffCollection<T> =>
  diff_collection(
    trace_data_messages(trace)
      .filter((m) => same_version(m.version, v))
      .flatMap((m) => m.collection.records),
  );

export const collection_at = <T>(trace: DiffTrace<T>, v: Version): DiffCollection<T> =>
  diff_collection(
    trace_data_messages(trace)
      .filter((m) => version_less_equal(m.version, v))
      .flatMap((m) => m.collection.records),
  );

export const consolidate_version = difference_at;

export const compact_trace_by_frontier = <T>(trace: DiffTrace<T>, f: AntichainFrontier): DiffTrace<T> => ({
  kind: "diff_trace",
  messages: trace.messages.filter(
    (m) => is_frontier_message(m) || !version_is_closed_by_frontier((m as VersionedCollection<T>).version, f),
  ),
});
