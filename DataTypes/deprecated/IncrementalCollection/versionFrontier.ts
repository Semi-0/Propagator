import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { make_unprocedural_layer, type Layer } from "sando-layer/Basic/Layer";
import { type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { vector_clock_layer } from "sando-layer/Specified/VectorClockLayer";
import {
  merge_vector_clocks,
  vector_clock_forward,
  vector_clock_get_source_direct,
} from "../../../AdvanceReactivity/vector_clock";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import type { VersionClock, VersionClockValue } from "./diffAlgebra";

export type Version = LayeredObject<undefined>;

export const version_marker_layer: Layer<true> = make_unprocedural_layer<true>(
  "diff_version_marker",
  () => true,
);

export interface AntichainFrontier {
  readonly kind: "antichain_frontier";
  readonly versions: readonly Version[];
}

type VersionRelation = "less" | "equal" | "greater" | "incomparable";

const to_clock = (
  clock: VersionClock | Record<string, VersionClockValue> | number[],
): VersionClock => {
  if (clock instanceof Map) return new Map(clock);
  if (Array.isArray(clock)) return new Map(clock.map((v, i) => [String(i), v]));
  return new Map(Object.entries(clock));
};

export const version = (
  clock: VersionClock | Record<string, VersionClockValue> | number[] = new Map(),
): Version =>
  construct_layered_datum(
    undefined,
    vector_clock_layer,
    to_clock(clock),
    version_marker_layer,
    true,
  ) as Version;

export const version_clock = (v: Version): VersionClock =>
  vector_clock_layer.get_value(v) as VersionClock;

export const initial_version = (): Version => version([0]);

export const version_forward = (v: Version, channel: string): Version =>
  version(vector_clock_forward(version_clock(v) as any, channel) as VersionClock);

export const least_upper_bound = (a: Version, b: Version): Version =>
  version(merge_vector_clocks(version_clock(a) as any, version_clock(b) as any) as VersionClock);

const compare_clock_value = (a: VersionClockValue, b: VersionClockValue): number => {
  if (a === b) return 0;
  if (a === "constant") return b === "constant" ? 0 : -1;
  if (b === "constant") return 1;
  return a < b ? -1 : 1;
};

export const version_relation = (a: Version, b: Version): VersionRelation => {
  const ac = version_clock(a);
  const bc = version_clock(b);
  const keys = new Set([...ac.keys(), ...bc.keys()]);
  let aGreater = false;
  let bGreater = false;
  for (const key of keys) {
    const cmp = compare_clock_value(
      vector_clock_get_source_direct(key, ac),
      vector_clock_get_source_direct(key, bc),
    );
    if (cmp < 0) bGreater = true;
    if (cmp > 0) aGreater = true;
    if (aGreater && bGreater) return "incomparable";
  }
  return aGreater ? "greater" : bGreater ? "less" : "equal";
};

export const version_less_equal = (a: Version, b: Version): boolean => {
  const r = version_relation(a, b);
  return r === "less" || r === "equal";
};

export const version_less_than = (a: Version, b: Version): boolean => version_relation(a, b) === "less";

export const same_version = (a: Version, b: Version): boolean => version_relation(a, b) === "equal";

export const version_key = (v: Version): string => to_string(v);

export const normalize_antichain = (versions: readonly Version[]): Version[] => {
  const out: Version[] = [];
  for (const candidate of versions) {
    if (out.some((existing) => version_less_equal(existing, candidate))) continue;
    for (let i = out.length - 1; i >= 0; i--) {
      if (version_less_than(candidate, out[i])) out.splice(i, 1);
    }
    out.push(candidate);
  }
  return out;
};

export const frontier = (versions: readonly Version[]): AntichainFrontier => ({
  kind: "antichain_frontier",
  versions: normalize_antichain(versions),
});

export const frontier_less_equal_version = (f: AntichainFrontier, v: Version): boolean =>
  f.versions.some((fv) => version_less_equal(fv, v));

export const version_is_closed_by_frontier = (v: Version, f: AntichainFrontier): boolean =>
  !frontier_less_equal_version(f, v);

export const frontier_less_equal = (a: AntichainFrontier, b: AntichainFrontier): boolean =>
  b.versions.every((bv) => frontier_less_equal_version(a, bv));

export const frontier_join = (a: AntichainFrontier, b: AntichainFrontier): AntichainFrontier =>
  frontier([...a.versions, ...b.versions]);

