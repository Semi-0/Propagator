import type { Cell } from "@/cell/Cell";
import { compound_propagator } from "../../Propagator/Propagator";
import { make_ce_arithmetical } from "../../Propagator/Sugar";
import { ce_switch, ce_equal } from "../../Propagator/BuiltInProps";
import { ce_cons, ce_car, ce_cdr, p_cons, p_list_map } from "./List";

export const p_pair_lookup = (key: Cell<string>, paired_list: Cell<Map<string, any>>, output: Cell<any>) => compound_propagator(
    [key, paired_list],
    [output],
    () => {
        const internal = (pair: Cell<Map<string, any>>) => ce_switch(
            ce_equal(
                ce_car(pair), key
            ), 
            ce_cdr(pair)
        )

        p_list_map(internal, paired_list, output) 
    },
    "p_lookup"
)

export const ce_pair_lookup = make_ce_arithmetical(p_pair_lookup, "pair_lookup") as (key: Cell<string>, paired_list: Cell<Map<string, any>>) => Cell<any>

export const p_assv = (key: Cell<string>, value: Cell<any>, paired_list: Cell<Map<string, any>>, output: Cell<any>) => compound_propagator(
    [key, value, paired_list],
    [output],
    () => {
       p_cons(ce_cons(key, value), paired_list, output)
    },
    "p_assv"
)

export const ce_assv = make_ce_arithmetical(p_assv, "assv") as (key: Cell<string>, value: Cell<any>, paired_list: Cell<Map<string, any>>) => Cell<Map<string, any>>


