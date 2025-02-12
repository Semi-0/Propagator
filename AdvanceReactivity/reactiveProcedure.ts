import { fresher, get_traced_timestamp } from "./tracedTimestampLayer";
import { is_fresh } from "./tracedTimestampLayer";
import { no_compute } from "../Helper/noCompute";
import { annotate_timestamp } from "./tracedTimestampLayer";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import type { Propagator } from "../Propagator/Propagator";
import { primitive_propagator } from "../Propagator/Propagator";
import type { Cell } from "@/cell/Cell";

export function reactive_procedure<T extends LayeredObject[], A extends LayeredObject>(
  f: (...args: T) => A
): (...args: T) => A | typeof no_compute {
  return (...args: T) => {
    if (args.every(is_fresh)) {
      const freshest_timestamp = get_traced_timestamp(
        args.reduce((a, b) => (fresher(a, b) ? a : b))
      ).timestamp;
      // You may need to assert that the annotated value is of type A.
      return annotate_timestamp(f(...args), freshest_timestamp) as A;
    } else {
      return no_compute;
    }
  };
}


export function construct_reactive_propagator<T extends LayeredObject[], A extends LayeredObject>(
  f: (...args: T) => A,
  name: string
): (...cells: Cell<any>[]) => Propagator {
  return primitive_propagator(reactive_procedure(f), name);
}