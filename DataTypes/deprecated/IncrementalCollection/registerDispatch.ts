import { any_unusable_values, is_nothing, is_unusable_value } from "@/cell/CellValue";
import { generic_merge } from "@/cell/Merge";
import { strongest_value } from "@/cell/StrongestValue";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { all_match, match_args, one_of_args_match, register_predicate } from "generic-handler/Predicates";
import { dc_records, diff_collection, diff_concat } from "./diffAlgebra";
import {
  empty_trace,
  is_diff_collection,
  is_diff_message,
  is_diff_trace,
  is_frontier,
  is_frontier_message,
  is_version,
  is_versioned_collection,
  trace_latest,
  trace_merge,
  vc_records,
  vc_version,
  type DiffTrace,
  type VersionedCollection,
} from "./messagesTrace";
import { version_clock, version_relation, type AntichainFrontier, type Version } from "./versionFrontier";

define_generic_procedure_handler(
  generic_merge,
  match_args(is_nothing, is_versioned_collection),
  (_content, message) => trace_merge(empty_trace(), message),
);

define_generic_procedure_handler(
  generic_merge,
  match_args(is_nothing, is_frontier_message),
  (_content, message) => trace_merge(empty_trace(), message),
);

define_generic_procedure_handler(generic_merge, match_args(is_diff_trace, is_diff_message), trace_merge);

define_generic_procedure_handler(generic_merge, all_match(is_diff_collection), diff_concat);

define_generic_procedure_handler(strongest_value, match_args(is_diff_trace), (trace: DiffTrace<any>) =>
  trace_latest(trace) ?? trace,
);

define_generic_procedure_handler(
  strongest_value,
  match_args(is_diff_collection),
  (collection) => diff_collection(dc_records(collection)),
);

define_generic_procedure_handler(is_unusable_value, one_of_args_match(is_diff_trace), (trace: DiffTrace<any>) =>
  trace_latest(trace) === null,
);

define_generic_procedure_handler(is_unusable_value, one_of_args_match(is_diff_message), () => false);

const is_diff_message_array = register_predicate(
  "is_diff_message_array",
  (v: any) => Array.isArray(v) && v.every(is_diff_message),
);

define_generic_procedure_handler(any_unusable_values, match_args(is_diff_message_array), () => false);

define_generic_procedure_handler(is_equal, match_args(is_version, is_version), (a: Version, b: Version) =>
  version_relation(a, b) === "equal",
);

const records_equal = (a: any, b: any): boolean => {
  const left = dc_records(a);
  const right = dc_records(b);
  return (
    left.length === right.length &&
    left.every((r) =>
      right.some((c) => r.multiplicity === c.multiplicity && is_equal(r.record, c.record)),
    )
  );
};

define_generic_procedure_handler(is_equal, match_args(is_diff_collection, is_diff_collection), records_equal);
define_generic_procedure_handler(
  is_equal,
  match_args(is_versioned_collection, is_versioned_collection),
  (a: VersionedCollection<any>, b: VersionedCollection<any>) =>
    version_relation(vc_version(a), vc_version(b)) === "equal" && records_equal(a, b),
);

define_generic_procedure_handler(
  to_string,
  match_args(is_version),
  (v: Version) =>
    `Version(${Array.from(version_clock(v).entries())
      .map(([k, x]) => `${k}:${x}`)
      .join(",")})`,
);

define_generic_procedure_handler(
  to_string,
  match_args(is_frontier),
  (f: AntichainFrontier) => `Frontier(${f.versions.map(to_string).join(", ")})`,
);

define_generic_procedure_handler(
  to_string,
  match_args(is_diff_collection),
  (c) =>
    `DiffCollection(${dc_records(c)
      .map(({ record, multiplicity }) => `${to_string(record)}@${multiplicity}`)
      .join(", ")})`,
);

define_generic_procedure_handler(
  to_string,
  match_args(is_versioned_collection),
  (v: VersionedCollection<any>) =>
    `Versioned(${to_string(vc_version(v))}, [${vc_records(v)
      .map(({ record, multiplicity }) => `${to_string(record)}@${multiplicity}`)
      .join(", ")}])`,
);

