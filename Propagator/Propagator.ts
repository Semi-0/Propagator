import { Primitive_Relation, make_relation, type Relation, is_relation } from "../DataTypes/Relation";
import { type Cell, update_cell, cell_id, cell_strongest, cell_dispose, CellHooks, summarize_cells, cell_strongest_base_value } from "../Cell/Cell";
import { set_global_state, get_global_parent, parameterize_parent} from "../Shared/PublicState";
import { PublicStateCommand } from "../Shared/PublicState";
import { match_args, register_predicate } from "generic-handler/Predicates";
import { install_propagator_arith_pack } from "../AdvanceReactivity/Generics/GenericArith";
import { is_not_no_compute, no_compute } from "../Helper/noCompute";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { is_disposed } from "../Cell/CellValue";
import { any_unusable_values } from "../Cell/CellValue";
import { get_children, get_id, mark_for_disposal} from "../Shared/Generics";
import { alert_propagator } from "../Shared/Scheduler/Scheduler";


//TODO: a minimalistic revision which merge based info provided by data?
//TODO: analogous to lambda for c_prop?

export interface Propagator {
  getName: () => string;
  getRelation: () => Primitive_Relation;
  getInputs: () => Cell<any>[];
  getOutputs: () => Cell<any>[];
  summarize: () => string;
  activate: () => void;
  dispose: () => void;
}


export type PropagatorConstructor = (...inputs: Cell<any>[]) => Propagator

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

const default_interested_hooks = (): CellHooks[] => ["updated" as CellHooks];

// dispose is too low level, we need to abstract it away!!!
export function construct_propagator(
                                 inputs: Cell<any>[], 
                                 outputs: Cell<any>[], 
                                 activate: () => void,
                                 name: string,
                                 id: string | null = null,
                                 interested_in: CellHooks[] = [CellHooks.updated]
                                ): Propagator {
  const relation = make_relation(name, get_global_parent(), id);



  const propagator: Propagator = {
    getName: () => name,
    getRelation: () => relation,
    getInputs: () => inputs,
    getOutputs: () => outputs,
    summarize: () => {
      const inputSummary = summarize_cells(inputs, "    ");
      const outputSummary = summarize_cells(outputs, "    ");

      return [
        `propagator ${name}`,
        `  id: ${relation.get_id()}`,
        `  inputs (${inputs.length}):`,
        inputSummary,
        `  outputs (${outputs.length}):`,
        outputSummary
      ].join("\n");
    },
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
  
//   set_global_state(PublicStateCommand.ADD_PROPAGATOR, propagator);
  return propagator;
}





export { forward, apply_propagator, l_apply_propagator, apply_subnet } from "./HelperProps";


export function primitive_propagator(f: (...inputs: any[]) => any, name: string, interested_in: CellHooks[] = default_interested_hooks()) {
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

 

export function function_to_primitive_propagator(name: string, f: (...inputs: any[]) => any, interested_in: CellHooks[] = default_interested_hooks()){
    // limitation: does not support rest or optional parameters
    const rf = install_propagator_arith_pack(name, f.length, f)

    return primitive_propagator(rf, name, interested_in)
}

// compound propagator might need virtualized inner cells

export function compound_propagator(inputs: Cell<any>[], outputs: Cell<any>[], to_build: () => void, name: string, id: string | null = null): Propagator {
    // Create the propagator first without calling to_build
    
    var built = false
    
    const propagator: Propagator = construct_propagator(
        inputs,
        outputs,
        () => {
            // delay blue print gives one gotcha
            // if bi-directional propagation
            // we need to at least init all input and output once
            // other way? feedback or perhaps just give up the idea of tail recursion using propagator
           const should_build = !(built || any_unusable_values(inputs.map(cell_strongest)))
           if (should_build) {
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

// export function dynamic_propagator(controller: Cell<boolean>, inputs: Cell<any>[], outputs: Cell<any>[], to_build: () => void, name: string, id: string | null = null): Propagator {

//     // the problem of dynamic propagator is that this might reintroduce time into propagation
//     // let say in one frame
//     // there is some value passed into input also a false passed into contoller
//     // the result would totally be lost
//     // but isn't thw switch act exactly the same?
//     var built_childrens: Relation[] = []
//     const propagator: Propagator = construct_propagator(
//         [controller, ...inputs],
//         outputs,
//         () => {
//             if ((is_true(cell_strongest(controller)))) {
//                 if (length(built_childrens) == 0) {
//                     parameterize_parent(propagator.getRelation())(() => {
//                         to_build();
//                     });
//                 }
//                 built_childrens.push(...propagator.getRelation().get_children());
 
//             }
//             else  {
//                 built_childrens.forEach(child => {
//                     child.dispose();
//                 });
//                 built_childrens = [];
//             }
//         },
//         name,
//         id
//     )
//     return propagator;

// }

/// should we seperate them to a dynamic propagator?
// dynamic propagator is controlled by a boolean controller
// and it build when boolean is true unbuild when it is false
// it cant be the nothing because nothing should not be involved in computation



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

