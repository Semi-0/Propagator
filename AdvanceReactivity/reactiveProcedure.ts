// import { generic_timestamp_set_merge } from "./traced_timestamp/TimeStampSetMerge";
// import { is_fresh } from "./traced_timestamp/Predicates";
// import { no_compute } from "../Helper/noCompute";
// import { get_traced_timestamp_layer } from "./traced_timestamp/tracedTimestampLayer";
// import { patch_traced_timestamps } from "./traced_timestamp/Annotater";
// import type { Propagator } from "../Propagator/Propagator";
// import { primitive_propagator } from "../Propagator/Propagator";
// import type { Cell } from "@/cell/Cell";
// import { construct_better_set } from "generic-handler/built_in_generics/generic_better_set";
// import  type { traced_timestamp } from "./traced_timestamp/type";

// export function reactive_procedure<T extends [], A >(
//   f: (...args: T) => A
// ): (...args: T) => A | typeof no_compute {
//   return (...args: T) => {
//     args.forEach((arg) => {
//     })
//     if (is_fresh(args)) {
//       const merge_timestamps = args.reduce((acc, curr) => generic_timestamp_set_merge(acc, get_traced_timestamp_layer(curr)), 
//          construct_better_set<traced_timestamp>([], (a: traced_timestamp) => a.id.toString()))
//       const result = patch_traced_timestamps(f(...args), merge_timestamps)

//       return result as A;
//     } else {
//       return no_compute;
//     }
//   };
// }


// export function construct_reactive_propagator<T extends [], A>(
//   f: (...args: T) => A,
//   name: string
// ): (...cells: Cell<any>[]) => Propagator {
//   return primitive_propagator(reactive_procedure(f), name);
// }