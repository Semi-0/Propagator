import { Primitive_Relation, make_relation } from "../DataTypes/Relation";
import { type Cell, add_cell_content, cell_id, cell_strongest, cell_dispose } from "../Cell/Cell";
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
import { markForDisposal } from "../Shared/Scheduler/Scheduler";
import { trace_func } from "../helper";
import { any_unusable_values } from "../Cell/CellValue";

//TODO: a minimalistic revision which merge based info provided by data?
//TODO: analogous to lambda for c_prop?
// TODO: memory leak?

export interface Propagator {
  get_name: () => string;
  getRelation: () => Primitive_Relation;
  getInputsID: () => string[];
  getOutputsID: () => string[];
  summarize: () => string;
  activate: () => void;
  dispose: () => void;
}

export const is_propagator = register_predicate("is_propagator", (propagator: any): propagator is Propagator => {
    return (
        propagator &&
        typeof propagator === 'object' &&
        'get_name' in propagator &&
        'getRelation' in propagator &&
        'getInputsID' in propagator &&
        'getOutputsID' in propagator &&
        'summarize' in propagator &&
        'dispose' in propagator
    );
});

export function summarize_cells(cells: Cell<any>[]): string{
    return cells.reduce((acc, cell) => acc + "/n" + to_string(cell), "")
}

export function construct_propagator(inputs: Cell<any>[], 
                                 outputs: Cell<any>[], 
                                 activate: () => void,
                                 name: string,
                                 id: string | null = null): Propagator {
  const relation = make_relation(name, get_global_parent(), id);

  const inputs_ids = inputs.map(cell => cell_id(cell));
  const outputs_ids = outputs.map(cell => cell_id(cell));

  activate();

  const propagator: Propagator = {
    get_name: () => name,
    getRelation: () => relation,
    getInputsID: () => inputs_ids,
    getOutputsID: () => outputs_ids,
    summarize: () => `propagator: ${name} inputs: ${summarize_cells(inputs)} outputs: ${summarize_cells(outputs)}`,
    activate: () => {
      // Check if any inputs are disposed
      const hasDisposedInput = inputs.some(cell => is_disposed(cell_strongest(cell)));
      const hasDisposedOutput = outputs.some(cell => is_disposed(cell_strongest(cell)));
      
      if (hasDisposedInput || hasDisposedOutput) {
        // Mark propagator for disposal
        markForDisposal(propagator_id(propagator));
        // Propagate disposal to outputs
        outputs.forEach(cell => {
          if (!is_disposed(cell_strongest(cell))) {
            cell.addContent(the_disposed);
          }
        });
        return;
      }
      
      // Normal activation
      parameterize_parent(relation)(() => {
        activate();
      })
    },
    dispose: () => {
      [...inputs, ...outputs].forEach(cell => {
        const neighbors = cell.getNeighbors();
        if (neighbors.has(relation.get_id())) {
          neighbors.delete(relation.get_id());
        }
      });
      // Mark for cleanup
      markForDisposal(propagator_id(propagator));
    }
  };

  inputs.forEach(cell => {
    cell.addNeighbor(propagator);
  })
  
  set_global_state(PublicStateCommand.ADD_CHILD, propagator.getRelation())
  set_global_state(PublicStateCommand.ADD_PROPAGATOR, propagator);
  return propagator;
}

export function primitive_propagator(f: (...inputs: any[]) => any, name: string) {
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
                        add_cell_content(output as Cell<any>, output_value);
                    }
                }
           }, 
            name
        );

        return prop;
    };
}

// export const error_logged_primitive_propagator = (f: (...args: any[]) => any, name: string) => 
//     primitive_propagator(
//         error_handling_function(name, f),
//         name
//     )

export function function_to_primitive_propagator(name: string, f: (...inputs: any[]) => any){
    // limitation: does not support rest or optional parameters
    const rf = install_propagator_arith_pack(name, f.length, f)

    return primitive_propagator(rf, name)
}

// compound propagator might need virtualized inner cells

export function compound_propagator(inputs: Cell<any>[], outputs: Cell<any>[], to_build: () => void, name: string, id: string | null = null): Propagator {
    // Create the propagator first without calling to_build
    const relation = make_relation(name, get_global_parent(), id);
    const inputs_ids = inputs.map(cell => cell_id(cell));
    const outputs_ids = outputs.map(cell => cell_id(cell));
    
    var built = false
    
    const propagator: Propagator = {
        get_name: () => name,
        getRelation: () => relation,
        getInputsID: () => inputs_ids,
        getOutputsID: () => outputs_ids,
        summarize: () => `propagator: ${name} inputs: ${summarize_cells(inputs)} outputs: ${summarize_cells(outputs)}`,
        activate: () => {
            // Check if any inputs are disposed
            const hasDisposedInput = inputs.some(cell => is_disposed(cell_strongest(cell)));
            const hasDisposedOutput = outputs.some(cell => is_disposed(cell_strongest(cell)));
            
            if (hasDisposedInput || hasDisposedOutput) {
                // Mark propagator for disposal
                markForDisposal(propagator_id(propagator));
                // Propagate disposal to outputs
                outputs.forEach(cell => {
                    if (!is_disposed(cell_strongest(cell))) {
                        cell.addContent(the_disposed);
                    }
                });
                return;
            }
            
            // Build if not built yet, with proper parent context
            // Build happens on FIRST activation, regardless of input values
            // Once built, the internal propagators handle all subsequent updates automatically
            if (!built) {
                parameterize_parent(relation)(() => {
                    to_build();
                });
                built = true;
            }
        },
        dispose: () => {
            [...inputs, ...outputs].forEach(cell => {
                const neighbors = cell.getNeighbors();
                if (neighbors.has(relation.get_id())) {
                    neighbors.delete(relation.get_id());
                }
            });
            // Mark for cleanup
            markForDisposal(propagator_id(propagator));
        }
    };
    
    inputs.forEach(cell => {
        cell.addNeighbor(propagator);
    });
    
    set_global_state(PublicStateCommand.ADD_CHILD, propagator.getRelation());
    set_global_state(PublicStateCommand.ADD_PROPAGATOR, propagator);
    
    // Override the dispose method to include child disposal
    const original_dispose = propagator.dispose;
    propagator.dispose = () => {
        // First, dispose all child propagators and cells
        const children = propagator.getRelation().get_children();
        
        // Separate children into propagators and cells
        const childPropagators: Propagator[] = [];
        const childCells: Cell<any>[] = [];
        
        children.forEach(childRelation => {
            const childId = childRelation.get_id();
            const childProp = find_propagator_by_id(childId);
            const childCell = find_cell_by_id(childId);
            
            if (childProp) {
                childPropagators.push(childProp);
            }
            if (childCell) {
                childCells.push(childCell);
            }
        });
        
        // Dispose propagators first (in case they reference cells)
        childPropagators.forEach(childProp => {
            childProp.dispose();
        });
        
        // Then dispose cells
        childCells.forEach(childCell => {
            cell_dispose(childCell);
        });
        
        // Finally, dispose the compound propagator itself
        original_dispose();
        
        // Immediately remove children from global state
        childPropagators.forEach(childProp => {
            set_global_state(PublicStateCommand.REMOVE_PROPAGATOR, childProp);
        });
        childCells.forEach(childCell => {
            set_global_state(PublicStateCommand.REMOVE_CELL, childCell);
        });
    };
    
    return propagator;
}

export function constraint_propagator(cells: Cell<any>[], to_build: () => void, name: string): Propagator {
    // This is essentially a compound propagator with inputs and outputs being the same set of cells
    return compound_propagator(cells, cells, to_build, name);
}

export function propagator_id(propagator: Propagator): string{
    return propagator.getRelation().get_id();
}

export function propagator_name(propagator: Propagator): string{
    return propagator.get_name();
}

export function propagator_dispose(propagator: Propagator){
    propagator.dispose();
}

export function propagator_level(propagator: Propagator): number{
    return propagator.getRelation().get_level();
}

export function propagator_inputs(propagator: Propagator): Cell<any>[] {
    return propagator.getInputsID().map(id => find_cell_by_id(id) as Cell<any>).filter(cell => cell !== undefined);
}

export function propagator_outputs(propagator: Propagator): Cell<any>[] {
    return propagator.getOutputsID().map(id => find_cell_by_id(id) as Cell<any>).filter(cell => cell !== undefined);
}

export function propagator_activate(propagator: Propagator){
    propagator.activate()
}

define_generic_procedure_handler(to_string, match_args(is_propagator), (propagator: Propagator) => {
    return propagator.summarize()
})

define_generic_procedure_handler(identify_by, match_args(is_propagator), propagator_id)