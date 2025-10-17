import {  make_relation, type Primitive_Relation } from '../DataTypes/Relation';
import {  guard, throw_error } from 'generic-handler/built_in_generics/other_generic_helper';
import { clean_hypothetical_store } from '../DataTypes/Premises';
import { generic_merge, set_merge } from '../Cell/Merge';

import { type Stepper } from './Reactivity/MiniReactor/MrPrimitiveCombinators';
import { construct_state } from './Reactivity/MiniReactor/MrState';
import type { Cell } from '@/cell/Cell';
import type { Propagator } from '../Propagator/Propagator';
import { construct_node } from './Reactivity/MiniReactor/MrPrimitive';
import { Current_Scheduler, set_scheduler } from './Scheduler/Scheduler';
import { clean_premises_store } from '../DataTypes/Premises';
import { set_handle_contradiction } from '@/cell/Cell';
import { subscribe } from './Reactivity/MiniReactor/MrCombinators';
//@ts-ignore
var parent: Stepper<Primitive_Relation> = construct_state(make_relation("root", null));
// Todo: make this read only
const all_cells: Stepper<Cell<any>[]> = construct_state<Cell<any>[]>([]) 
const all_propagators: Stepper<Propagator[]> = construct_state<Propagator[]>([])
const all_amb_propagators: Stepper<Propagator[]> = construct_state<Propagator[]>([])
export const failed_count : Stepper<number> = construct_state<number>(0)




export enum PublicStateCommand{
    ADD_CELL = "add_cell",
    ADD_PROPAGATOR = "add_propagator",
    ADD_CHILD = "add_child",
    SET_PARENT = "set_parent",
    ADD_AMB_PROPAGATOR = "add_amb_propagator",
    CLEAN_UP = "clean_up",
    FORCE_UPDATE_ALL_CELLS = "force_update_all",
    SET_CELL_MERGE = "set_cell_merge",
    SET_HANDLE_CONTRADICTION = "set_handle_contradiction",
    INSTALL_BEHAVIOR_ADVICE = "install_behavior_advice",
    UPDATE_FAILED_COUNT = "update_failed_count",
    SET_SCHEDULER_NO_RECORD = "set_scheduler_no_record",
    SET_SCHEDULER = "set_scheduler",
    REMOVE_CELL = "remove_cell",
    REMOVE_PROPAGATOR = "remove_propagator",
    REMOVE_AMB_PROPAGATOR = "remove_amb_propagator",
    ALERT_ALL_AMBS = "alert_all_ambs"
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




const receiver  = construct_node()



// avoid circular references
function is_cell(o: any): boolean{
    return o.getContent !== undefined && o.getRelation !== undefined && o.getStrongest !== undefined && o.getNeighbors !== undefined;
}

function is_propagator(o: any): boolean{
    return o.getInputsID !== undefined && o.getOutputsID !== undefined && o.summarize !== undefined;
}


subscribe((msg: PublicStateMessage) => {
    switch(msg.command){

        case PublicStateCommand.SET_SCHEDULER_NO_RECORD:
            Current_Scheduler.record_alerted_propagator(msg.args[0]);
            break;

        case PublicStateCommand.UPDATE_FAILED_COUNT:
          
            failed_count.receive(failed_count.get_value() + 1)
            break;
        case PublicStateCommand.FORCE_UPDATE_ALL_CELLS:
            all_cells.get_value().forEach((cell: any) => {
                cell.testContent()
            });
            break;

        case PublicStateCommand.ADD_CELL:
            if (msg.args.every(o => is_cell(o))) {
                all_cells.receive([...all_cells.get_value(), ...msg.args]);
            }
            else{
                console.warn('ADD_CELL with invalid args', msg.args)
            }
            break;

        case PublicStateCommand.ADD_PROPAGATOR:
            if (msg.args.every(o => is_propagator(o))) {
                all_propagators.receive([...all_propagators.get_value(), ...msg.args]);
            }
            else{
                console.warn('ADD_PROPAGATOR with invalid args')
            }
            
            break;

        case PublicStateCommand.ALERT_ALL_AMBS:
            all_amb_propagators.get_value().forEach((propagator: Propagator) => {
    
               Current_Scheduler.alert_propagator(propagator)
            })
            break;

        case PublicStateCommand.SET_SCHEDULER:
            set_scheduler(msg.args[0]);
            break;

        case PublicStateCommand.ADD_CHILD:
            if (msg.args.length == 1){
                parent.receive(parent.get_value().add_child(msg.args[0]));
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
                all_amb_propagators.receive([...all_amb_propagators.get_value(), ...msg.args]);
            }
            else{
                console.warn('ADD_AMB_PROPAGATOR with invalid args')
            }
            break;

        case PublicStateCommand.CLEAN_UP:
            all_cells.receive([])
            all_propagators.receive([])
            all_amb_propagators.receive([])
            clean_premises_store()
            clean_hypothetical_store()
            Current_Scheduler.clear_all_tasks()
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

        case PublicStateCommand.SET_HANDLE_CONTRADICTION:
            set_handle_contradiction(msg.args[0]);
            break;

        case PublicStateCommand.REMOVE_CELL:
            if (msg.args.every(o => is_cell(o))) {
                all_cells.receive(all_cells.get_value().filter(c => c !== msg.args[0]));
            } else {
                console.warn('REMOVE_CELL with invalid args', msg.args);
            }
            break;
        case PublicStateCommand.REMOVE_PROPAGATOR:
            if (msg.args.every(o => is_propagator(o))) {
                all_propagators.receive(all_propagators.get_value().filter(p => p !== msg.args[0]));
                all_amb_propagators.receive(all_amb_propagators.get_value().filter(p => p !== msg.args[0]));
            } else {
                console.warn('REMOVE_PROPAGATOR with invalid args', msg.args);
            }
            break;
        case PublicStateCommand.REMOVE_AMB_PROPAGATOR:
            if (msg.args.every(o => is_propagator(o))) {
                all_amb_propagators.receive(all_amb_propagators.get_value().filter(p => p !== msg.args[0]));
            } else {
                console.warn('REMOVE_AMB_PROPAGATOR with invalid args', msg.args);
            }
            break;
    }
})(receiver)

export function set_global_state(type: PublicStateCommand, ...args: any[]){
    receiver.receive(public_state_message(type, ...args));
} 

export function parameterize_parent(a: any){
    return (fn: () => any) => {
        const old = parent.get_value();
        
        parent.receive(a); 
        const result = fn();
        parent.receive(old);
        return result
    }
}

export function get_global_parent(){
    return parent.get_value();
}

export const observe_all_cells_update = (observeCell: (cell: any) => void) => {
    subscribe((msg: PublicStateMessage) => {
        if (
            msg.command === PublicStateCommand.ADD_CELL &&
            msg.args.length === 1 &&
            is_cell(msg.args[0])
        ) {
            observeCell(msg.args[0]);
        }
    })(receiver);
}

export const observe_all_propagators_update = (observePropagator: (propagator: any) => void) => {
    subscribe((msg: PublicStateMessage) => {
        if (
            msg.command === PublicStateCommand.ADD_PROPAGATOR &&
            msg.args.length === 1 &&
            is_propagator(msg.args[0])
        ) {
            observePropagator(msg.args[0]);
        }
    })(receiver);
}

export const observe_cell_array = (f: (cells: any[]) => void) => subscribe(f)(all_cells.node)
export const observe_propagator_array = (f: (propagators: any[]) => void) => subscribe(f)(all_propagators.node)
export const cell_snapshot = () => all_cells.get_value()
export const propagator_snapshot = () => all_propagators.get_value()
export const amb_propagator_snapshot = () => all_amb_propagators.get_value()
export const observe_amb_propagator_array = (f: (propagators: any[]) => void) => subscribe(f)(all_amb_propagators.node)
export const observe_failed_count = (f: (failed_count: number) => void) => subscribe(f)(failed_count.node)


