import {  make_relation, type Primitive_Relation } from '../DataTypes/Relation';
import { construct_simple_generic_procedure, define_generic_procedure_handler } from 'generic-handler/GenericProcedure';

import { all_match, match_args } from 'generic-handler/Predicates';
import {  guard, throw_error } from 'generic-handler/built_in_generics/other_generic_helper';
import { is_layered_object } from '../Helper/Predicate';
import { Reactive } from './Reactivity/ReactiveEngine';
import type { ReadOnly, ReactiveState } from './Reactivity/ReactiveEngine';
import { generic_merge, set_merge } from '../Cell/Merge';



//@ts-ignore
var parent: ReactiveState<Primitive_Relation> = Reactive.constructStateful(make_relation("root", null));
// Todo: make this read only
const all_cells: ReactiveState<any[]> = Reactive.constructStateful<any[]>([]);
const all_propagators: ReactiveState<any[]> = Reactive.constructStateful<any[]>([]);
const all_amb_propagators: ReactiveState<any[]> = Reactive.constructStateful<any[]>([]);
export const failed_count : ReactiveState<number> = Reactive.constructStateful(1);




export enum PublicStateCommand{
    ADD_CELL = "add_cell",
    ADD_PROPAGATOR = "add_propagator",
    ADD_CHILD = "add_child",
    SET_PARENT = "set_parent",
    ADD_AMB_PROPAGATOR = "add_amb_propagator",
    CLEAN_UP = "clean_up",
    FORCE_UPDATE_ALL = "force_update_all",
    SET_CELL_MERGE = "set_cell_merge",
    SET_HANDLE_CONTRADICTION = "set_handle_contradiction",
    INSTALL_BEHAVIOR_ADVICE = "install_behavior_advice",
    UPDATE_FAILED_COUNT = "update_failed_count",
    SET_SCHEDULER_NO_RECORD = "set_scheduler_no_record"
}

export interface PublicStateMessage{
    command: PublicStateCommand;
    args: any[];
    summarize: () => string;
}

export function public_state_message(command: PublicStateCommand, ...args: any[]): PublicStateMessage{
    return {
        command,
        args,
        summarize() {
            const [first] = args;
            const argDescr = is_cell(first) || is_propagator(first)
                ? first.summarize()
                : 'unknown args';
            return `command: ${command} args: ${argDescr}`;
        }
    };
}




const receiver : ReactiveState<PublicStateMessage> = Reactive.constructStateful(public_state_message(PublicStateCommand.ADD_CELL, []));



// avoid circular references
function is_cell(o: any): boolean{
    return o.getContent !== undefined && o.getRelation !== undefined && o.getStrongest !== undefined && o.getNeighbors !== undefined;
}

function is_propagator(o: any): boolean{
    return o.getInputsID !== undefined && o.getOutputsID !== undefined && o.summarize !== undefined;
}


Reactive.subscribe((msg: PublicStateMessage) => {
    switch(msg.command){

        case PublicStateCommand.SET_SCHEDULER_NO_RECORD:
            configure_scheduler_no_record(msg.args[0]);
            break;

        case PublicStateCommand.UPDATE_FAILED_COUNT:
          
            failed_count.next(failed_count.get_value() + 1)
            break;
        case PublicStateCommand.FORCE_UPDATE_ALL:
            all_cells.get_value().forEach((cell: any) => {
                cell.force_update();
            });
            break;

        case PublicStateCommand.ADD_CELL:
            if (msg.args.every(o => is_cell(o))) {
                all_cells.next([...all_cells.get_value(), ...msg.args]);
            }
            else{
                console.warn('ADD_CELL with invalid args', msg.args)
            }
            break;

        case PublicStateCommand.ADD_PROPAGATOR:
            if (msg.args.every(o => is_propagator(o))) {
                all_propagators.next([...all_propagators.get_value(), ...msg.args]);
            }
            else{
                console.warn('ADD_PROPAGATOR with invalid args')
            }
            
            break;

        case PublicStateCommand.ADD_CHILD:
            if (msg.args.length == 1){
                parent.next(parent.get_value().add_child(msg.args[0]));
            }
            else if (msg.args.length == 2){ 

                const parent_arg = msg.args[0];
                const child_arg = msg.args[1];
                parent_arg.add_child(child_arg);
            }
            else{
                throw_error(
                    'add_error:',
                    `add_child expects 1 or 2 args, got ${msg.args.length}`,
                    msg.summarize()
                );
            }
            break;
        case PublicStateCommand.SET_PARENT:
            guard(msg.args.length == 1, throw_error(
                'add_error:',
                `set_parent expects 1 arg, got ${msg.args.length}`,
                msg.summarize()
            ));
            parent = msg.args[0];
            break;
       
        case PublicStateCommand.ADD_AMB_PROPAGATOR:
            if (msg.args.every(o => is_propagator(o))) {
                all_amb_propagators.next([...all_amb_propagators.get_value(), ...msg.args]);
            }
            else{
                console.warn('ADD_AMB_PROPAGATOR with invalid args')
            }
            break;

        case PublicStateCommand.CLEAN_UP:
            all_cells.next([])
            all_propagators.next([])
            all_amb_propagators.next([])
            clean_premises_store()
            clean_hypothetical_store()
            clear_all_tasks()
            set_global_state(PublicStateCommand.SET_CELL_MERGE, generic_merge)
            
            break;

        case PublicStateCommand.SET_CELL_MERGE:
            if (msg.args.length == 1){
                set_merge(msg.args[0]);
            }
            else{
                throw_error(
                    'add_error:',
                    `set_cell_merge expects 1 arg, got ${msg.args.length}`,
                    msg.summarize()
                );
            }
            break;

        case PublicStateCommand.INSTALL_BEHAVIOR_ADVICE:
            install_behavior_advice(msg.args[0]);
            break;

        case PublicStateCommand.SET_HANDLE_CONTRADICTION:
            set_handle_contradiction(msg.args[0]);
            break;
    }
})(receiver.node);

export function set_global_state(type: PublicStateCommand, ...args: any[]){
    receiver.next(public_state_message(type, ...args));
} 

export function parameterize_parent(a: any){
    return (fn: () => any) => {
        const old = parent.get_value();
        
        parent.next(a); 
        const result = fn();
        parent.next(old);
        return result
    }
}

export function get_global_parent(){
    return parent.get_value();
}

export const observe_all_cells_update = (observeCell: (cell: any) => void) => {
    Reactive.subscribe((msg: PublicStateMessage) => {
        if (
            msg.command === PublicStateCommand.ADD_CELL &&
            msg.args.length === 1 &&
            is_cell(msg.args[0])
        ) {
            observeCell(msg.args[0]);
        }
    })(receiver.node);
}

export const observe_all_propagators_update = (observePropagator: (propagator: any) => void) => {
    Reactive.subscribe((msg: PublicStateMessage) => {
        if (
            msg.command === PublicStateCommand.ADD_PROPAGATOR &&
            msg.args.length === 1 &&
            is_propagator(msg.args[0])
        ) {
            observePropagator(msg.args[0]);
        }
    })(receiver.node);
}

export const observe_cell_array = (f: (cells: any[]) => void) => Reactive.subscribe(f)(all_cells.node)
export const observe_propagator_array = (f: (propagators: any[]) => void) => Reactive.subscribe(f)(all_propagators.node)
export const cell_snapshot = () => all_cells.get_value()
export const propagator_snapshot = () => all_propagators.get_value()
export const amb_propagator_snapshot = () => all_amb_propagators.get_value()
export const observe_amb_propagator_array = (f: (propagators: any[]) => void) => Reactive.subscribe(f)(all_amb_propagators.node)
export const observe_failed_count = (f: (failed_count: number) => void) => Reactive.subscribe(f)(failed_count.node)


import { layered_deep_equal } from 'sando-layer/Equality';
import { clean_hypothetical_store, clean_premises_store, observe_premises_has_changed } from '../DataTypes/Premises';
import { get_base_value, type Layer } from 'sando-layer/Basic/Layer';
import { is_any } from 'generic-handler/built_in_generics/generic_predicates';
import { set_every, set_get_length, type BetterSet } from 'generic-handler/built_in_generics/generic_better_set';
import type { LayeredObject } from 'sando-layer/Basic/LayeredObject';
import { install_behavior_advice, return_default_behavior } from '../Propagator/PropagatorBehavior';
import { set_handle_contradiction } from '..';
import { clear_all_tasks, configure_scheduler_no_record } from './Reactivity/Scheduler';
import { is_equal } from 'generic-handler/built_in_generics/generic_arithmetic';

export const deep_equal = construct_simple_generic_procedure("is_equal", 2,
    (a: any, b: any) => {
        return a === b;
    }
)

export function layers_equal(o1: LayeredObject<any>, o2: LayeredObject<any>){
    const layers1 = o1.annotation_layers();
    const layers2 = o2.annotation_layers();

    if (set_get_length(layers1) !== set_get_length(layers2)) {
        return false;
    }

    // Check if all layers are equal
    return set_every(layers1, (layer: Layer<any>) => {
        return is_equal(o1, o2)
    }) && set_every(layers2, (layer: Layer<any>) => {
        return is_equal(o1, o2)
    })
}

define_generic_procedure_handler(deep_equal,
    all_match(is_layered_object),
    (a: any, b: any) => {
        const result = layered_deep_equal(a, b);
    
        return result
    }
)




