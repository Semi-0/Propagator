import { Primitive_Relation, make_relation } from "../DataTypes/Relation";
import { type Cell, add_cell_content, cell_id, cell_strongest } from "../Cell/Cell";
import { set_global_state, get_global_parent} from "../Shared/PublicState";


import { PublicStateCommand } from "../Shared/PublicState";

import {combine_latest, type Reactor } from "../Shared/Reactivity/Reactor";

import {  subscribe } from "../Shared/Reactivity/Reactor";

import { register_predicate } from "generic-handler/Predicates";

import { get_primtive_propagator_behavior } from "./PropagatorBehavior";
import { pipe } from "fp-ts/lib/function";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { transform_to_legit_propagator_function } from "../AdvanceReactivity/Generics/GenericArith";
//TODO: a minimalistic revision which merge based info provided by data?
//TODO: analogous to lambda for c_prop?
// TODO: memory leak?


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

export function construct_propagator(inputs: Cell<any>[], 
                                 outputs: Cell<any>[], 
                                 activate: () => void,
                                 name: string): Propagator {
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

export function primitive_propagator(f: (...inputs: any[]) => any, name: string) {
    return (...cells: Cell<any>[]): Propagator => {
        if (cells.length === 0) {
            throw new Error("Primitive propagator must have at least one input");
        }

        const propagator_behavior = get_primtive_propagator_behavior();
        const [inputs, output] = cells.length > 1 
            ? [cells.slice(0, -1), cells[cells.length - 1]]
            : [cells, null];

        const create_activator = () => {
            const reactors = inputs.map(cell_strongest);
            const activator = propagator_behavior(combine_latest(...reactors), f);
            
            if (output) {
                subscribe((result: any) => add_cell_content(output, result))(activator);
            }
            return activator;
        };

        return construct_propagator(
            inputs,
            output ? [output] : [],
            create_activator,
            name
        );
    };
}

// just make_function layered procedure
export function function_to_primitive_propagator(name: string, f: (...inputs: any[]) => any){
    // limitation: does not support rest or optional parameters
    const rf = transform_to_legit_propagator_function(name, f.length, f)

    return primitive_propagator(rf, name)
}



export function compound_propagator(inputs: Cell<any>[], outputs: Cell<any>[], to_build: () => void, name: string): Propagator{

    // TODO: handles parents relationship explicitly 
    const propagator = construct_propagator(inputs, outputs, () => {
        to_build();
    }, name);
    return propagator;
}


export function constraint_propagator(cells: Cell<any>[],  to_build: () => void, name: string): Propagator{
    return construct_propagator(cells, cells, () => {
        to_build();
    }, name);
}


export function propagator_id(propagator: Propagator): string{
    return propagator.getRelation().get_id();
}

export function propagator_name(propagator: Propagator): string{
    return propagator.get_name();
}