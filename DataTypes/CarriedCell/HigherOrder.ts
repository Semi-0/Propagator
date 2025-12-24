import { construct_cell } from "@/cell/Cell";
import { compound_propagator, primitive_propagator } from "../../Propagator/Propagator";
import { ce_constant, p_constant } from "../../Propagator/BuiltInProps";
import type { Cell } from "@/cell/Cell";
import type { Propagator } from "../../Propagator/Propagator";
import { make_ce_arithmetical } from "../../Propagator/Sugar";
import { ce_switch } from "../../Propagator/BuiltInProps";
import { ce_cons, ce_car, ce_cdr, p_cons, ce_is_atom, ce_copy_list } from "./List";
import { p_dict_pair } from "./Dict";
import { diff_map } from "./Core";

export const p_zip = (combine: (...cells: Cell<any>[]) => Propagator) => (list_A: Cell<Map<string, any>>, list_B: Cell<Map<string, any>>, output: Cell<Map<string, any>>) => compound_propagator(
    [list_A, list_B],
    [output],
    () => {
        const current = ce_cons(
            ce_car(list_A),
            ce_car(list_B)
        )

        const next = construct_cell("next") as Cell<Map<string, any>>

        combine(
            ce_cdr(list_A) as Cell<Map<string, any>>, 
            ce_cdr(list_B) as Cell<Map<string, any>>, 
            next
        )

        p_cons(current, next, output)

        // if last 
        // we dont need to consider that because if last is none it already be handled by compound propagator
    },
    "p_list_zip"
)

export const p_list_zip = p_zip(p_cons)

export const p_dict_zip = p_zip(p_dict_pair)

export const ce_list_zip = make_ce_arithmetical(p_list_zip, "list_zip") as (list_A: Cell<Map<string, any>>, list_B: Cell<Map<string, any>>) => Cell<Map<string, any>>

export const ce_dict_zip = make_ce_arithmetical(p_dict_zip, "dict_zip") as (dict_A: Cell<Map<string, any>>, dict_B: Cell<Map<string, any>>) => Cell<Map<string, any>>

// untested
export const p_combine_list = (
    list_A: Cell<Map<string, any>>,
    list_B: Cell<Map<string, any>>,
    output: Cell<Map<string, any>>
) => compound_propagator(
    [list_A, list_B],
    [output],
    () => {

        const copied = ce_copy_list(list_A)

        const internal = (A: Cell<Map<string, any>>, B: Cell<Map<string, any>>) => compound_propagator(
            [A, B],
            [output],
            () => {
                const is_end = ce_is_atom(ce_cdr(A))
              

                p_constant(B)(construct_cell("Nothing"), ce_switch(is_end, ce_cdr(A)))

                internal(ce_cdr(A), B)
            },
            "p_combine_list_internal"
        )
      

        internal(copied, list_B)
    },
    "p_combine_list"
)

export const ce_combine_list = make_ce_arithmetical(p_combine_list, "combine_list") as (list_A: Cell<Map<string, any>>, list_B: Cell<any>) => Cell<any>

export const carrier_map = (closureCell: Cell<(...args: any[]) => Propagator>, input: Cell<Map<string, any>>, output: Cell<any>) => {
    const built = new Map<string, Cell<any>>()
  
    primitive_propagator((closureFn, inputMap) => {
      const diffed = diff_map(built, inputMap)
      for (const [key, inputCell] of diffed) {
        const outCell = construct_cell(key)
        closureFn(inputCell, outCell)
        built.set(key, outCell)
      }
      // 把 built 本身當成新的 carrier 輸出
      return built
    }, "carrier_map")(closureCell, input, output)
  }

