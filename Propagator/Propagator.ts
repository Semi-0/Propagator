import { Primitive_Relation, make_relation } from "../DataTypes/Relation";
import { type Cell, update_cell, cell_id, cell_strongest, cell_dispose, summarize_cells } from "../Cell/Cell";
import { set_global_state, get_global_parent, parameterize_parent} from "../Shared/PublicState";
import { PublicStateCommand } from "../Shared/PublicState";
import { match_args, register_predicate } from "generic-handler/Predicates";
import { install_propagator_arith_pack } from "../AdvanceReactivity/Generics/GenericArith";
import { error_handling_function } from "./ErrorHandling";
import { find_cell_by_id, find_propagator_by_id } from "../Shared/GraphTraversal";
import { is_not_no_compute, no_compute } from "../Helper/noCompute";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { identify_by } from "generic-handler/built_in_generics/generic_better_set";
import { the_disposed, is_disposed, is_unusable_value } from "../Cell/CellValue";

import { trace_func } from "../helper";
import { any_unusable_values } from "../Cell/CellValue";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { get_children, get_id, mark_for_disposal} from "../Shared/Generics";
import { alert_propagator } from "../Shared/Scheduler/Scheduler";

//TODO: a minimalistic revision which merge based info provided by data?
//TODO: analogous to lambda for c_prop?
// TODO: memory leak?

export interface Propagator {
  getName: () => string;
  getRelation: () => Primitive_Relation;
  getInputs: () => Cell<any>[];
  getOutputs: () => Cell<any>[];
  summarize: () => string;
  activate: () => void;
  dispose: () => void;
}

export const is_propagator = register_predicate("is_propagator", (propagator: any): propagator is Propagator => {
    return (
        propagator &&
        propagator.getName !== undefined &&
        propagator.getRelation !== undefined &&
        propagator.getInputs !== undefined &&
        propagator.getOutputs !== undefined &&
        propagator.summarize !== undefined &&
        propagator.activate !== undefined &&
        propagator.dispose !== undefined
    );
});
// Note: Generic procedure handlers are registered in Propagator/PropagatorGenerics.tso
// Register get_id handler for Propagator
define_generic_procedure_handler(get_id, match_args(is_propagator), propagator_id);

// Register get_children handler for Propagator
define_generic_procedure_handler(get_children, match_args(is_propagator), propagator_children);

// Note: Generic procedure handlers for Propagator are registered in Propagator/PropagatorGenerics.ts
// to avoid circular dependency issues

export const disposing_scan = (cells: Cell<any>[]) => {
    return cells.some((c: any) => c === undefined || c === null || is_disposed(cell_strongest(c)))
}

// dispose is too low level, we need to abstract it away!!!
export function construct_propagator(
                                 inputs: Cell<any>[], 
                                 outputs: Cell<any>[], 
                                 activate: () => void,
                                 name: string,
                                 id: string | null = null,
                                 interested_in: string[] = ["update"]
                                ): Propagator {
  const relation = make_relation(name, get_global_parent(), id);



  const propagator: Propagator = {
    getName: () => name,
    getRelation: () => relation,
    getInputs: () => inputs,
    getOutputs: () => outputs,
    summarize: () => `propagator: ${name} inputs: ${summarize_cells(inputs)} outputs: ${summarize_cells(outputs)}`,
    activate: () => {

      if (disposing_scan([...inputs, ...outputs])) {
        propagator.dispose();
      }
      else {
        activate();
      }
    },
    dispose: () => {
      [...inputs, ...outputs].forEach(cell => {
        const neighbors = cell.getNeighbors();
        if (neighbors.has(relation.get_id())) {
          cell.removeNeighbor(propagator);
        }
      });
      // Mark for cleanup
      mark_for_disposal(propagator);
    }
  };


  alert_propagator(propagator)
  inputs.forEach(cell => {
    cell.addNeighbor(propagator, interested_in);
  })
  
  set_global_state(PublicStateCommand.ADD_PROPAGATOR, propagator);
  return propagator;
}

export function primitive_propagator(f: (...inputs: any[]) => any, name: string, interested_in: string[] = ["update"]) {
    return (...cells: Cell<any>[]): Propagator => {
        if (cells.length === 0) {
            throw new Error("Primitive propagator must have at least one input");
        }

        const [inputs, output] = cells.length > 1
            ? [cells.slice(0, -1), cells[cells.length - 1]]
            : [cells, null];

        const prop = construct_propagator(
            inputs,
            output ? [output] : [],
            () => {
                const inputs_values = inputs.map(cell => cell_strongest(cell));

                if (any_unusable_values(inputs_values)){
                    // do nothing
                }
                else{
                    const output_value = f(...inputs_values);

                    if ((output) && (is_not_no_compute(output_value))){
                        update_cell(output as Cell<any>, output_value);
                    }
                }
           }, 
            name
        );

        return prop;
    };
}

 

export function function_to_primitive_propagator(name: string, f: (...inputs: any[]) => any){
    // limitation: does not support rest or optional parameters
    const rf = install_propagator_arith_pack(name, f.length, f)

    return primitive_propagator(rf, name)
}

// compound propagator might need virtualized inner cells

export function compound_propagator(inputs: Cell<any>[], outputs: Cell<any>[], to_build: () => void, name: string, id: string | null = null): Propagator {
    // Create the propagator first without calling to_build
    
    var built = false
    
    const propagator: Propagator = construct_propagator(
        inputs,
        outputs,
        () => {
           if (!built) {
                parameterize_parent(propagator.getRelation())(() => {
                    to_build();
                });
                built = true;
           }
        },
        name,
        id
    )
    
    return propagator;
}

export function constraint_propagator(cells: Cell<any>[], to_build: () => void, name: string): Propagator {
    // This is essentially a compound propagator with inputs and outputs being the same set of cells
    return compound_propagator(cells, cells, to_build, name);
}

export function propagator_id(propagator: Propagator): string{
    return propagator.getRelation().get_id();
}

export function propagator_children(propagator: Propagator){
    return propagator.getRelation().get_children();
}

export function propagator_name(propagator: Propagator): string{
    return propagator.getName();
}

export function propagator_dispose(propagator: Propagator){
    propagator.dispose();
}

export function propagator_level(propagator: Propagator): number{
    return propagator.getRelation().get_level();
}

export function propagator_inputs(propagator: Propagator): Cell<any>[] {
    return propagator.getInputs();
}

export function propagator_outputs(propagator: Propagator): Cell<any>[] {
    return propagator.getOutputs();
}

export function propagator_activate(propagator: Propagator){
    propagator.activate()
}

