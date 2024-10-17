import { Relation, make_relation } from "./DataTypes/Relation";
import { Cell, add_cell_content, cell_id, cell_strongest } from "./Cell/Cell";
import { set_global_state, get_global_parent } from "./PublicState";

import { type Either, right, left } from "fp-ts/Either";
import { force_load_arithmatic } from "./Cell/GenericArith";
import { PublicStateCommand } from "./PublicState";
import { scheduled_reactor } from "./Scheduler";
import { combine_latest, construct_reactor, tap, type Reactor } from "./Reactivity/Reactor";
import { pipe } from "fp-ts/function";
import { map, subscribe } from "./Reactivity/Reactor";
import type { StringLiteralType } from "typescript";
force_load_arithmatic();

export class Propagator{
 private relation : Relation; 
 private inputs_ids : string[] = []; 
 private outputs_ids : string[] = []; 
 private name : string;
 private activator : Reactor<any>;


 constructor(name: string, 
            inputs: Cell[], 
            outputs: Cell[], 
            activate: () => Reactor<any>){
    this.name = name;

    this.relation = get_global_parent();
    set_global_state(PublicStateCommand.ADD_CHILD, this.relation);

    this.inputs_ids = inputs.map(cell => cell_id(cell));
    this.outputs_ids = outputs.map(cell => cell_id(cell));

    // activation is a flag to tell the propagator is activated
   
    this.activator = activate();

    
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

 getActivator(){
    return this.activator;
 }

 summarize(){
    return "propagator: " + this.name + " inputs: " + this.inputs_ids + " outputs: " + this.outputs_ids;
 }
}

export function primitive_propagator(f: (...inputs: any[]) => any, name: string){
    return (...cells: Cell[]): Propagator => {
        if (cells.length > 1){

            const output = cells[cells.length - 1];
            const inputs = cells.slice(0, -1);
            const inputs_reactors = inputs.map(cell => cell_strongest(cell));
            
            // @ts-ignore
            return new Propagator(name, inputs, [output], () => {

                const activator = pipe(combine_latest(...inputs_reactors),
                    map(values => {
                        return f(...values);
                    }))


                    subscribe((result: any) => {
                        console.log("get result", result)
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
    const me = new Propagator(name, inputs, outputs, () => {
        // TODO: this is not good, in typescript there is no equivalent of parameterize in scheme, perhaps use readerMonad?
        set_global_state(PublicStateCommand.SET_PARENT, me.getRelation());
        return to_build();
    });
    return me;
}

export function constraint_propagator(cells: Cell[],  to_build: () => Reactor<any>, name: string): Propagator{
    return new Propagator(name, cells, cells, () => {
        return to_build();
    });
}