import { Primitive_Relation, make_relation } from "../DataTypes/Relation";
import { type Cell, add_cell_content, cell_id, cell_strongest } from "../Cell/Cell";
import { set_global_state, get_global_parent} from "../Shared/PublicState";


import { PublicStateCommand } from "../Shared/PublicState";

import { Reactive } from "../Shared/Reactivity/ReactiveEngine";

import { register_predicate } from "generic-handler/Predicates";

import { get_primtive_propagator_behavior } from "./PropagatorBehavior";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { install_propagator_arith_pack } from "../AdvanceReactivity/Generics/GenericArith";
import { error_handling_function } from "./ErrorHandling";
import { find_cell_by_id } from "../Shared/GraphTraversal";
//TODO: a minimalistic revision which merge based info provided by data?
//TODO: analogous to lambda for c_prop?
// TODO: memory leak?


export interface Propagator {
  get_name: () => string;
  getRelation: () => Primitive_Relation;
  getInputsID: () => string[];
  getOutputsID: () => string[];
  summarize: () => string;
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

export function construct_propagator(inputs: Cell<any>[], 
                                 outputs: Cell<any>[], 
                                 activate: () => void,
                                 name: string): Propagator {
  const relation = make_relation(name, get_global_parent());

  const inputs_ids = inputs.map(cell => cell_id(cell));
  const outputs_ids = outputs.map(cell => cell_id(cell));

  activate();

  const propagator: Propagator = {
    get_name: () => name,
    getRelation: () => relation,
    getInputsID: () => inputs_ids,
    getOutputsID: () => outputs_ids,
    summarize: () => `propagator: ${name} inputs: ${inputs_ids} outputs: ${outputs_ids}`,
    dispose: () => {
      [...inputs, ...outputs].forEach(cell => {
        const neighbors = cell.getNeighbors();
        if (neighbors.has(relation.get_id())) {
          neighbors.delete(relation.get_id());
        }
      });
      // Unregister this propagator from global state
      set_global_state(PublicStateCommand.REMOVE_PROPAGATOR, propagator);
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

        const propagator_behavior = get_primtive_propagator_behavior();
        const [inputs, output] = cells.length > 1
            ? [cells.slice(0, -1), cells[cells.length - 1]]
            : [cells, null];

        // Track subscription removal for cleanup
        let unsubscribeFunc: (() => void) | null = null;

        const activate = () => {
            // Build reactive pipeline using ReactiveEngine
            // Get last-value streams for inputs
            const inputStates = inputs.map(cell_strongest);
            const inputNodes = inputStates.map(state => state.node);
            // Combine latest values
            const combined = Reactive.combineLatest(...inputNodes);
            // Apply behavior (map and filter)
            const behaviorNode = propagator_behavior(combined, f);
            
            if (output) {
                // Subscribe to behavior output to add content to output cell
                const subscriptionNode = Reactive.subscribe((result: any) => add_cell_content(output, result))(behaviorNode as any);
                // Track removal: disconnect subscriptionNode from behaviorNode
                unsubscribeFunc = () => Reactive.disconnect(behaviorNode as any, subscriptionNode as any);
            }
        };

        const prop = construct_propagator(
            inputs,
            output ? [output] : [],
            activate,
            name
        );

        // Enhance the dispose method to also clean up reactor subscriptions
        const originalDispose = prop.dispose;
        prop.dispose = () => {
            // Call original dispose first
            originalDispose();
            // Clean up subscription in reactive graph
            if (unsubscribeFunc) {
                unsubscribeFunc();
            }
        };

        return prop;
    };
}



export const error_logged_primitive_propagator = (f: (...args: any[]) => any, name: string) => 
    primitive_propagator(
        error_handling_function(name, f),
        name
    )


 

// just make_function layered procedure
export function function_to_primitive_propagator(name: string, f: (...inputs: any[]) => any){
    // limitation: does not support rest or optional parameters
    const rf = install_propagator_arith_pack(name, f.length, f)

    return error_logged_primitive_propagator(rf, name)
}



export function compound_propagator(inputs: Cell<any>[], outputs: Cell<any>[], to_build: () => void, name: string): Propagator {
    // Create the propagator using the basic constructor
    const prop = construct_propagator(inputs, outputs, to_build, name);
    
    // Enhance the dispose method to properly handle cleanup
    const originalDispose = prop.dispose;
    prop.dispose = () => {
        // Call original dispose first
        originalDispose();
        
        // Additional cleanup could be added here in the future
        // For now we'll rely on the cell neighbor cleanup in the base implementation
    };
    
    return prop;
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

export function propagator_inputs(propagator: Propagator): Cell<any>[] {
    return propagator.getInputsID().map(id => find_cell_by_id(id) as Cell<any>).filter(cell => cell !== undefined);
}

export function propagator_outputs(propagator: Propagator): Cell<any>[] {
    return propagator.getOutputsID().map(id => find_cell_by_id(id) as Cell<any>).filter(cell => cell !== undefined);
}