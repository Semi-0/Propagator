import { Relation, make_relation } from "./DataTypes/Relation";
import { Cell, add_cell_content, cell_id, cell_strongest } from "./Cell/Cell";
import { set_global_state, get_global_parent } from "./PublicState";

import { type Either, right, left } from "fp-ts/Either";
import { force_load_arithmatic } from "./Cell/GenericArith";
import { PublicStateCommand } from "./PublicState";
import { scheduled_reactor } from "./Scheduler";
import { combine_latest, construct_reactor, tap, type Reactor } from "./Reactor";
import { pipe } from "fp-ts/function";
import { map, subscribe } from "./Reactor";
import type { StringLiteralType } from "typescript";
force_load_arithmatic();

export class Propagator{
 private relation : Relation; 
 private inputs_ids : string[] = []; 
 private outputs_ids : string[] = []; 
 private name : string;


 constructor(name: string, 
            inputs: Cell[], 
            outputs: Cell[], 
            activate: () => void){
    this.name = name;

    this.relation = get_global_parent();
    set_global_state(PublicStateCommand.ADD_CHILD, this.relation);

    this.inputs_ids = inputs.map(cell => cell_id(cell));
    this.outputs_ids = outputs.map(cell => cell_id(cell));

    // activation is a flag to tell the propagator is activated
   
    activate();

    
    set_global_state(PublicStateCommand.ADD_PROPAGATOR, this);
 }

 get_name(){
    return this.name;
 }

 getRelation(){
    return this.relation;
 }

 getInputsID(){
    return this.inputs_ids;
 }

 getOutputsID(){
    return this.outputs_ids;
 }

 summarize(){
    return "propagator: " + this.name + " inputs: " + this.inputs_ids + " outputs: " + this.outputs_ids;
 }
}

export function primitive_propagator(f: (...inputs: any[]) => any, name: string){
    return (...cells: Cell[]): Either<string, Propagator> => {
        if (cells.length > 1){

            const output = cells[cells.length - 1];
            const inputs = cells.slice(0, -1);
            const inputs_reactors = inputs.map(cell => cell_strongest(cell));
            
            // @ts-ignore
            return right(new Propagator(name, inputs, [output], () => {
                 pipe(combine_latest(...inputs_reactors),
                    map(values => {
                        return f(...values);
                    }),
                    subscribe((result: any) => {
                        add_cell_content(output, result);
                    })
                )
            }))
        }
        else{
            return left("Primitive propagator must have at least two inputs");
        }
    }
}


export function compound_propagator(inputs: Cell[], outputs: Cell[], to_build: () => void, name: string): Either<string, Propagator>{
    const me = new Propagator(name, inputs, outputs, () => {
        // TODO: this is not good, in typescript there is no equivalent of parameterize in scheme, perhaps use readerMonad?
        set_global_state(PublicStateCommand.SET_PARENT, me.getRelation());
        return to_build();
    });
    return right(me);
}

export function constraint_propagator(cells: Cell[],  to_build: () => void, name: string): Either<string, Propagator>{
    return right(new Propagator(name, cells, cells, () => {
        return to_build();
    }));
}