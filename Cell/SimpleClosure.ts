


// simple closure is a datastructure that stores a propagator constructor and a map of cells

import type { Cell } from "./Cell";
import type { Propagator, PropagatorConstructor } from "../Propagator/Propagator";
import { cell_strongest, compound_propagator, construct_propagator, function_to_primitive_propagator, generic_merge, get_base_value, inspect_strongest, is_nothing, match_args, propagator, propagator_dispose, register_predicate, the_nothing } from "..";
import { install_propagator_arith_pack } from "../AdvanceReactivity/Generics/GenericArith";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { is_contradiction } from "ppropogator";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import type { the_contradiction_type, the_nothing_type } from "./CellValue";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import type { CellValue } from "ppropogator";
import { p_constant } from "../Propagator/BuiltInProps";
import { is_array } from "generic-handler/built_in_generics/generic_predicates";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { make_ce_arithmetical } from "ppropogator/Propagator/Sugar";
import { to_array } from "generic-handler/built_in_generics/generic_collection";

export type SimpleClosure = {
    propagator_constructor: (...args: Cell<any>[]) => Propagator 
    cells: Cell<any>[]
}

export const is_simple_closure = register_predicate("is_simple_closure", (value: any): value is SimpleClosure => {
    return value != undefined && value != null && typeof value.propagator_constructor === "function" && is_array(value.cells)
})

// in the future we can merge incomplete closures
// define_generic_procedure_handler(generic_merge, match_args(is_simple_closure, is_simple_closure), (a: SimpleClosure, b: SimpleClosure) => {


// }

export const closure_get_propagator_constructor = (closure: SimpleClosure) => closure.propagator_constructor

export const closure_get_cells = (closure: SimpleClosure) => closure.cells

export const apply_closure = (closure: SimpleClosure) => {
    return closure.propagator_constructor(...closure_get_cells(closure))
}

export const l_apply_closure: (
    closure: CellValue<LayeredObject<SimpleClosure>>
) => CellValue<LayeredObject<Propagator>> =
    install_propagator_arith_pack(
        "apply_closure",
        1,
        apply_closure
    );



export const apply_closure_from_cell = compose(cell_strongest, l_apply_closure)


export const p_depot_cell = (...cells: Cell<any>[]) => p_constant(cells)

export const ce_depot_cell = (...cells: Cell<any>[]) => make_ce_arithmetical(p_depot_cell(...cells), "depot_cell")

export const p_make_closure = (depoted: Cell<Cell<any>[]>, constructor_cell: Cell<PropagatorConstructor>, output: Cell<SimpleClosure>) => 
    function_to_primitive_propagator("make_closure", (depoted: Cell<any>[], constructor_cell: PropagatorConstructor) => {

        return {
            propagator_constructor: constructor_cell,
            cells: to_array(depoted)
        }
    })(depoted, constructor_cell, output) 

export const ce_make_closure  = make_ce_arithmetical(p_make_closure, "make_closure")

export const p_apply_closure = (closure_cell: Cell<SimpleClosure>, output: Cell<WeakRef<Propagator>>) => {
  
    var built_propagator: CellValue<Propagator> = the_nothing
    var last_closure: CellValue<SimpleClosure>  = the_nothing
    return construct_propagator(
    [closure_cell],
    [output],
    () => {
        const strongest: CellValue<SimpleClosure> = cell_strongest(closure_cell)

        const apply_closure_internal = () => {
            // @ts-ignore
            const new_propagator = l_apply_closure(strongest) 
            // @ts-ignore
            built_propagator = new_propagator 
            last_closure = strongest 
            output.update(
                // @ts-ignore
                new WeakRef(built_propagator) as unknown as CellValue<Propagator>
            )
        }

        if (is_nothing(strongest)){
            return 
        }
        else if (is_contradiction(strongest)){
            if (built_propagator !== the_nothing){
                propagator_dispose(get_base_value(built_propagator))
                apply_closure_internal()
            }
            else{
                return
            }
        }
        else if (is_equal(strongest, last_closure)){
            return 
        }
        else {
            if (built_propagator !== the_nothing){
                console.log("try disposing")
                console.log(get_base_value(built_propagator))
                propagator_dispose(get_base_value(built_propagator))
                apply_closure_internal()
            }
            else{
                apply_closure_internal()
            }
        }
    },
    "apply_closure"
)
}

export const p_apply_propagator = (propagator_constructor_cell: Cell<PropagatorConstructor>, inputs: Cell<any>[], outputs: Cell<any>[], receptor_cell: Cell<WeakRef<Propagator>>) => 
    compound_propagator([propagator_constructor_cell, ...inputs], [...outputs, receptor_cell], () => {
        console.log("build")
        inspect_strongest(propagator_constructor_cell)
        const args = [...inputs, ...outputs]
        const depoted = ce_depot_cell(...args)(propagator_constructor_cell)

        inspect_strongest(depoted)


        const closure = ce_make_closure(depoted, propagator_constructor_cell)
        inspect_strongest(closure)
        // @ts-ignore
        p_apply_closure(closure, receptor_cell)
    }, "apply_propagator")