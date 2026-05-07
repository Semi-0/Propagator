import { is_number } from "generic-handler/built_in_generics/generic_predicates";
import { register_predicate } from "generic-handler/Predicates";
import { make_unprocedural_layer, type Layer } from "sando-layer/Basic/Layer";
import { is_layered_object, type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { vector_clock_layer } from "sando-layer/Specified/VectorClockLayer";
import type { DiffCollection, DiffRecord, VersionClock } from "./diffAlgebra";
import { dc_records, diff_collection, diff_collection_marker_layer } from "./diffAlgebra";
import type { AntichainFrontier, Version } from "./versionFrontier";
import {
  same_version,
  version,
  version_clock,
  version_is_closed_by_frontier,
  version_less_equal,
  version_marker_layer,
} from "./versionFrontier";

export type VersionedCollection<T> = LayeredObject<readonly DiffRecord<T>[]>;

export const versioned_collection_marker_layer: Layer<true> = make_unprocedural_layer<true>(
  "versioned_collection_marker",
  () => true,
);

export interface FrontierMessage {
  readonly kind: "frontier_message";
  readonly frontier: AntichainFrontier;
}

export type DiffMessage<T> = VersionedCollection<T> | FrontierMessage;

export interface DiffTrace<T> {
  readonly kind: "diff_trace";
  readonly messages: readonly DiffMessage<T>[];
}

export const versioned_collection = <T>(
  v: Version,
  c: DiffCollection<T>,
): VersionedCollection<T> =>
  c
    .update_layer(vector_clock_layer, version_clock(v))
    .update_layer(versioned_collection_marker_layer, true) as VersionedCollection<T>;

export const vc_records = <T>(vc: VersionedCollection<T>): readonly DiffRecord<T>[] =>
  dc_records(vc);

export const vc_clock = <T>(vc: VersionedCollection<T>): VersionClock =>
  vector_clock_layer.get_value(vc) as VersionClock;

export const vc_version = <T>(vc: VersionedCollection<T>): Version => version(vc_clock(vc));

export const vc_collection = <T>(vc: VersionedCollection<T>): DiffCollection<T> =>
  diff_collection(vc_records(vc));

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

export const is_version = register_predicate("is_diff_version", (v: any): v is Version =>
  is_layered_object(v) && version_marker_layer.has_value(v));

export const is_frontier = register_predicate("is_antichain_frontier", (v: any): v is AntichainFrontier =>
  v?.kind === "antichain_frontier" && Array.isArray(v.versions) && v.versions.every(is_version));

export const is_versioned_collection = register_predicate(
  "is_versioned_collection",
  (v: any): v is VersionedCollection<any> =>
    is_layered_object(v) && versioned_collection_marker_layer.has_value(v),
);

export const is_diff_collection = register_predicate(
  "is_diff_collection",
  (v: any): v is DiffCollection<any> =>
    is_layered_object(v) &&
    diff_collection_marker_layer.has_value(v) &&
    !versioned_collection_marker_layer.has_value(v),
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
      .filter((m) => same_version(vc_version(m), v))
      .flatMap((m) => vc_records(m)),
  );

export const collection_at = <T>(trace: DiffTrace<T>, v: Version): DiffCollection<T> =>
  diff_collection(
    trace_data_messages(trace)
      .filter((m) => version_less_equal(vc_version(m), v))
      .flatMap((m) => vc_records(m)),
  );

export const consolidate_version = difference_at;

export const compact_trace_by_frontier = <T>(trace: DiffTrace<T>, f: AntichainFrontier): DiffTrace<T> => ({
  kind: "diff_trace",
  messages: trace.messages.filter(
    (m) => is_frontier_message(m) || !version_is_closed_by_frontier(vc_version(m as VersionedCollection<T>), f),
  ),
});

