import { fresher, get_traced_timestamp } from "./tracedTimestampLayer";
import { is_fresh } from "./tracedTimestampLayer";
import { no_compute } from "../Helper/noCompute";
import { annotate_timestamp } from "./tracedTimestampLayer";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import type { Propagator } from "../Propagator/Propagator";
import { primitive_propagator } from "../Propagator/Propagator";
import type { Cell } from "@/cell/Cell";

export function reactive_procedure<A>(f: (...args: any[]) => A): (...args: LayeredObject[]) => LayeredObject | string {
    return (...args: LayeredObject[]) => {
        if (args.every(is_fresh)){
            const freshest_timestamp = get_traced_timestamp(args.reduce((a, b) => fresher(a, b) ? a : b)).timestamp;
            return annotate_timestamp(f(...args), freshest_timestamp);
        } else {
            return no_compute;
        }
    } 
}


export function construct_reactive_propagator<A>(f: (...args: any[]) => A, name: string): (...args: Cell[]) => Propagator {
   return primitive_propagator(reactive_procedure(f), name)
}