import { is_nothing, is_unusable_value } from "@/cell/CellValue";
import { generic_merge } from "@/cell/Merge";
import { strongest_value } from "@/cell/StrongestValue";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { all_match, match_args, one_of_args_match } from "generic-handler/Predicates";
import { diff_collection, diff_concat } from "./diffAlgebra";
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
  type DiffTrace,
  type VersionedCollection,
} from "./messagesTrace";
import { version_relation, type AntichainFrontier, type Version } from "./versionFrontier";

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
  (collection) => diff_collection(collection.records),
);

define_generic_procedure_handler(is_unusable_value, one_of_args_match(is_diff_trace), (trace: DiffTrace<any>) =>
  trace_latest(trace) === null,
);

define_generic_procedure_handler(is_unusable_value, one_of_args_match(is_diff_message), () => false);

define_generic_procedure_handler(is_equal, match_args(is_version, is_version), (a: Version, b: Version) =>
  version_relation(a, b) === "equal",
);

define_generic_procedure_handler(
  is_equal,
  match_args(is_diff_collection, is_diff_collection),
  (a, b) => {
    const left = diff_collection(a.records).records;
    const right = diff_collection(b.records).records;
    return (
      left.length === right.length &&
      left.every((r) =>
        right.some((c) => r.multiplicity === c.multiplicity && is_equal(r.record, c.record)),
      )
    );
  },
);

define_generic_procedure_handler(
  to_string,
  match_args(is_version),
  (v: Version) => `Version(${Array.from(v.clock.entries()).map(([k, x]) => `${k}:${x}`).join(",")})`,
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
    `DiffCollection(${c.records
      .map(({ record, multiplicity }) => `${to_string(record)}@${multiplicity}`)
      .join(", ")})`,
);

define_generic_procedure_handler(
  to_string,
  match_args(is_versioned_collection),
  (v: VersionedCollection<any>) => `Versioned(${to_string(v.version)}, ${to_string(v.collection)})`,
);
