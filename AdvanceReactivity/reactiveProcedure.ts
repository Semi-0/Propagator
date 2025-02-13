import { fresher, get_traced_timestamp_layer, generic_timestamp_set_merge, annotate_now } from "./tracedTimestampLayer";
import { is_fresh } from "./tracedTimestampLayer";
import { no_compute } from "../Helper/noCompute";
import { annotate_timestamp } from "./tracedTimestampLayer";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import type { Propagator } from "../Propagator/Propagator";
import { primitive_propagator } from "../Propagator/Propagator";
import type { Cell } from "@/cell/Cell";
import { reduce } from "fp-ts/lib/pipeable";
import { construct_better_set } from "generic-handler/built_in_generics/generic_better_set";
import  type { traced_timestamp } from "./tracedTimestampLayer";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { is_nothing } from "@/cell/CellValue";

export function reactive_procedure<T extends [], A >(
  f: (...args: T) => A
): (...args: T) => A | typeof no_compute {
  return (...args: T) => {


    if (is_fresh(args)) {
      const merge_timestamps = args.reduce((acc, curr) => generic_timestamp_set_merge(acc, get_traced_timestamp_layer(curr)), 
         construct_better_set<traced_timestamp>([], (a: traced_timestamp) => a.id.toString()))
      // You may need to assert that the annotated value is of type A.
 
      return annotate_timestamp(f(...args), merge_timestamps) as A;
    } else {
      return no_compute;
    }
  };
}


export function construct_reactive_propagator<T extends [], A>(
  f: (...args: T) => A,
  name: string
): (...cells: Cell<any>[]) => Propagator {
  return primitive_propagator(reactive_procedure(f), name);
}