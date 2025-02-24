import { Primitive_Relation, make_relation } from "../DataTypes/Relation";
import { type Cell, add_cell_content, cell_id, cell_name, cell_strongest } from "../Cell/Cell";
import { set_global_state, get_global_parent, parameterize_parent } from "../Shared/PublicState";

import { type Either, right, left } from "fp-ts/Either";
import { force_load_arithmatic } from "../Cell/GenericArith";
import { PublicStateCommand } from "../Shared/PublicState";
import { scheduled_reactor } from "../Shared/Reactivity/Scheduler";
import { combine_latest, construct_reactor, filter, tap, type Reactor } from "../Shared/Reactivity/Reactor";
import { pipe } from "fp-ts/function";
import { map, subscribe } from "../Shared/Reactivity/Reactor";
import type { StringLiteralType } from "typescript";
import { register_predicate } from "generic-handler/Predicates";
import { values } from "fp-ts/lib/Map";
import { is_nothing } from "@/cell/CellValue";
import { every } from "fp-ts/lib/Array";
import { is_no_compute } from "../Helper/noCompute";

//TODO: a minimalistic revision which merge based info provided by data?
//TODO: analogous to lambda for c_prop?

force_load_arithmatic();

export interface Propagator {
  get_name: () => string;
  getRelation: () => Primitive_Relation;
  getInputsID: () => string[];
  getOutputsID: () => string[];
  getActivator: () => Reactor<any>;
  summarize: () => string;
}

export const is_propagator = register_predicate("is_propagator", (propagator: any): propagator is Propagator => {
    return propagator && typeof propagator === 'object' && 'get_name' in propagator && 'getRelation' in propagator && 'getInputsID' in propagator && 'getOutputsID' in propagator && 'getActivator' in propagator && 'summarize' in propagator;
})

export function construct_propagator(name: string, 
                                 inputs: Cell<any>[], 
                                 outputs: Cell<any>[], 
                                 activate: () => Reactor<any>): Propagator {
  const relation = make_relation(name, get_global_parent()) 


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
                const activator = pipe(combine_latest(...inputs_reactors),
                    map(values => {
                        return f(...values);
                    }),
                    filter(values => !is_no_compute(values)))

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


export function compound_propagator(inputs: Cell<any>[], outputs: Cell<any>[], to_build: () => Reactor<any>, name: string): Propagator{
    const propagator = construct_propagator(name, inputs, outputs, () => {
        return to_build();
    });
    return propagator;
}


export function constraint_propagator(cells: Cell<any>[],  to_build: () => Reactor<any>, name: string): Propagator{
    return construct_propagator(name, cells, cells, () => {
        return to_build();
    });
}


export function propagator_id(propagator: Propagator): string{
    return propagator.getRelation().get_id();
}

export function propagator_name(propagator: Propagator): string{
    return propagator.get_name();
}