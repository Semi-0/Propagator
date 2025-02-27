import { Primitive_Relation, make_relation } from "../DataTypes/Relation";
import { type Cell, add_cell_content, cell_id, cell_strongest } from "../Cell/Cell";
import { set_global_state, get_global_parent} from "../Shared/PublicState";


import { force_load_arithmatic } from "../AdvanceReactivity/Generics/GenericArith";
import { PublicStateCommand } from "../Shared/PublicState";

import {combine_latest, type Reactor } from "../Shared/Reactivity/Reactor";

import {  subscribe } from "../Shared/Reactivity/Reactor";

import { register_predicate } from "generic-handler/Predicates";

import { get_propagator_behavior } from "./PropagatorBehavior";
import { pipe } from "fp-ts/lib/function";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
//TODO: a minimalistic revision which merge based info provided by data?
//TODO: analogous to lambda for c_prop?
// TODO: memory leak?

force_load_arithmatic();

export interface Propagator {
  get_name: () => string;
  getRelation: () => Primitive_Relation;
  getInputsID: () => string[];
  getOutputsID: () => string[];
  summarize: () => string;
}

export const is_propagator = register_predicate("is_propagator", (propagator: any): propagator is Propagator => {
    return propagator && typeof propagator === 'object' && 'get_name' in propagator && 'getRelation' in propagator && 'getInputsID' in propagator && 'getOutputsID' in propagator && 'getActivator' in propagator && 'summarize' in propagator;
})

export function construct_propagator(name: string, 
                                 inputs: Cell<any>[], 
                                 outputs: Cell<any>[], 
                                 activate: () => void): Propagator {
  const relation = make_relation(name, get_global_parent()) 


  const inputs_ids = inputs.map(cell => cell_id(cell));
  const outputs_ids = outputs.map(cell => cell_id(cell));

  activate();

  const propagator: Propagator = {
    get_name: () => name,
    getRelation: () => relation,
    getInputsID: () => inputs_ids,
    getOutputsID: () => outputs_ids,
    summarize: () => `propagator: ${name} inputs: ${inputs_ids} outputs: ${outputs_ids}`
  };
  
  set_global_state(PublicStateCommand.ADD_CHILD, propagator.getRelation())
  set_global_state(PublicStateCommand.ADD_PROPAGATOR, propagator);
  return propagator;
}

export function primitive_propagator(f: (...inputs: any[]) => any, name: string){
    return (...cells: Cell<any>[]): Propagator => {
        if (cells.length > 1){
            const last_index = cells.length - 1;
            const output = cells[last_index];
            const inputs = cells.slice(0, last_index);
            const inputs_reactors = inputs.map(cell => cell_strongest(cell));

            // this has different meaning than filtered out nothing from compound propagator
            return construct_propagator(name, inputs, [output], () => {
                const activator = get_propagator_behavior(combine_latest(...inputs_reactors), f)

                subscribe((result: any) => {
                    add_cell_content(output, result);
                })(activator)

            })
        }
        else{
            throw new Error("Primitive propagator must have at least one input");
        }
    }
}

// just make_function layered procedure
export function function_to_primitive_propagator(name: string, f: (...inputs: any[]) => any){
    // limitation: does not support rest or optional parameters
    const rf = make_layered_procedure(name, f.length, f)

    return primitive_propagator(rf, name)
}



export function compound_propagator(inputs: Cell<any>[], outputs: Cell<any>[], to_build: () => void, name: string): Propagator{

    // TODO: handles parents relationship explicitly 
    const propagator = construct_propagator(name, inputs, outputs, () => {
        to_build();
    });
    return propagator;
}


export function constraint_propagator(cells: Cell<any>[],  to_build: () => void, name: string): Propagator{
    return construct_propagator(name, cells, cells, () => {
        to_build();
    });
}


export function propagator_id(propagator: Propagator): string{
    return propagator.getRelation().get_id();
}

export function propagator_name(propagator: Propagator): string{
    return propagator.get_name();
}