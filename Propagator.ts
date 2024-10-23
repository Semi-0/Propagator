import { Relation, make_relation } from "./DataTypes/Relation";
import { type Cell, add_cell_content, cell_id, cell_strongest } from "./Cell/Cell";
import { set_global_state, get_global_parent } from "./PublicState";

import { type Either, right, left } from "fp-ts/Either";
import { force_load_arithmatic } from "./Cell/GenericArith";
import { PublicStateCommand } from "./PublicState";
import { scheduled_reactor } from "./Scheduler";
import { combine_latest, construct_reactor, tap, type Reactor } from "./Reactivity/Reactor";
import { pipe } from "fp-ts/function";
import { map, subscribe } from "./Reactivity/Reactor";
import type { StringLiteralType } from "typescript";
import { register_predicate } from "generic-handler/Predicates";
force_load_arithmatic();

export interface Propagator {
  get_name: () => string;
  getRelation: () => Relation;
  getInputsID: () => string[];
  getOutputsID: () => string[];
  getActivator: () => Reactor<any>;
  summarize: () => string;
}

export const is_propagator = register_predicate("is_propagator", (propagator: any): propagator is Propagator => {
    return propagator && typeof propagator === 'object' && 'get_name' in propagator && 'getRelation' in propagator && 'getInputsID' in propagator && 'getOutputsID' in propagator && 'getActivator' in propagator && 'summarize' in propagator;
})

export function construct_propagator(name: string, 
                                 inputs: Cell[], 
                                 outputs: Cell[], 
                                 activate: () => Reactor<any>): Propagator {
  const relation = get_global_parent();
  set_global_state(PublicStateCommand.ADD_CHILD, relation);

  const inputs_ids = inputs.map(cell => cell_id(cell));
  const outputs_ids = outputs.map(cell => cell_id(cell));

  const activator = activate();

  const propagator: Propagator = {
    get_name: () => name,
    getRelation: () => relation,
    getInputsID: () => inputs_ids,
    getOutputsID: () => outputs_ids,
    getActivator: () => activator,
    summarize: () => `propagator: ${name} inputs: ${inputs_ids} outputs: ${outputs_ids}`
  };

  set_global_state(PublicStateCommand.ADD_PROPAGATOR, propagator);
  return propagator;
}

export function primitive_propagator(f: (...inputs: any[]) => any, name: string){
    return (...cells: Cell[]): Propagator => {
        if (cells.length > 1){
            const last_index = cells.length - 1;
            const output = cells[last_index];
            const inputs = cells.slice(0, last_index);
            const inputs_reactors = inputs.map(cell => cell_strongest(cell));
            
            return construct_propagator(name, inputs, [output], () => {
                const activator = pipe(combine_latest(...inputs_reactors),
                    map(values => {
                        return f(...values);
                    }))

                subscribe((result: any) => {
                    add_cell_content(output, result);
                })(activator)

                return activator;
            })
        }
        else{
           throw new Error("Primitive propagator must have at least two inputs");
        }
    }
}

export function compound_propagator(inputs: Cell[], outputs: Cell[], to_build: () => Reactor<any>, name: string): Propagator{
    const propagator = construct_propagator(name, inputs, outputs, () => {
        set_global_state(PublicStateCommand.SET_PARENT, propagator.getRelation());
        return to_build();
    });
    return propagator;
}

export function constraint_propagator(cells: Cell[],  to_build: () => Reactor<any>, name: string): Propagator{
    return construct_propagator(name, cells, cells, () => {
        return to_build();
    });
}