import { cell_dispose, is_cell, type Cell } from "@/cell/Cell";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args } from "generic-handler/Predicates";
import { trace_cell } from "../GraphTraversal";
import type { Propagator } from "../../Propagator/Propagator";
import { is_propagator, propagator_dispose, propagator_inputs } from "../../Propagator/Propagator";
import { find_cell_by_id } from "../GraphTraversal";
import { for_each } from "../../Helper/Helper";

const dispose = construct_simple_generic_procedure("dispose", 1, (x: any) => {
    return x.dispose();
});

define_generic_procedure_handler(dispose, match_args(is_cell), (cell: Cell<any>) => {
   const tree = trace_cell(cell);
   for_each(tree.propagators.values(), propagator_dispose);
   for_each(tree.cells.values(), cell_dispose);
});

define_generic_procedure_handler(dispose, match_args(is_propagator), (propagator: Propagator) => {
   const any_input_cell = propagator_inputs(propagator)[0];
   if (any_input_cell) {
    dispose(any_input_cell);
   }
});



export { dispose };

