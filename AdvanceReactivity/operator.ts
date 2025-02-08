
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";

import { no_compute } from "../Helper/noCompute";
import { get_base_value } from "sando-layer/Basic/Layer";
import { map as generic_map } from "generic-handler/built_in_generics/generic_array_operation";
import { fresher, get_traced_timestamp } from "./tracedTimestampLayer";

import { cell_strongest, construct_cell, type Cell } from "@/cell/Cell";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { construct_reactive_propagator } from "./reactiveProcedure";


export const curried_generic_map  = (f: (a: any) => any) => (a: any[]) => generic_map(a, f);

export const make_operator = (name: string, f: (a: LayeredObject) => any) => {
    // syntax sugar
    return (...inputs: Cell<any>[]) => {
        const output = construct_cell(name);
        const rf = (a: LayeredObject) => f(get_base_value(a));

        construct_reactive_propagator(rf, name)(...inputs, output);
        
        return output;
    }
}

export const subscribe = (f: (a: any) => void) => (a: Cell<any>) => {
    cell_strongest(a).subscribe(compose(get_base_value, f));
}

export const func_e = (name: string, f: (a: any) => any) => {
    return make_operator(name, f);
}

export const apply_e = (f: (a: any) => any) => {
    return make_operator("apply", f);
}

export const map_e = (f: (a: any) => any) => {
   return make_operator("map", f);
}

export const filter_e = (f: (a: any) => boolean) => {
    return make_operator("filter", (base: any) => {
        if (f(base)){
            return base;
        }
        else{
            return no_compute;
        }
    });
}

export const reduce_e = (f: (a: any, b: any) => any, initial: any) => {
    let acc = initial;
    return make_operator("reduce", (base: any) => {
        acc = f(acc, base);
        return acc;
    });
}


export const until = (when: Cell<any>, then: Cell<any>) => {
    const output = construct_cell("until");
    construct_reactive_propagator((w: LayeredObject, t: LayeredObject) => {
        if (get_base_value(w) === true){
            return t
        }
        else{
            return no_compute
        }
    }, "until")(when, then, output);
    return output;
}

export const or = (a: Cell<any>, b: Cell<any>) => {
    const output = construct_cell("or");
    construct_reactive_propagator((a: LayeredObject, b: LayeredObject) => {
        if (fresher(a, b)){
            return a;
        }
        else if (fresher(b, a)){
            return b;
        }
        else{
            return a
        }
    }, "or")(a, b, output);
    return output;
}

