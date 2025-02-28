
import {  make_relation, type Primitive_Relation } from '../DataTypes/Relation';
import { construct_simple_generic_procedure, define_generic_procedure_handler } from 'generic-handler/GenericProcedure';

import { all_match, match_args } from 'generic-handler/Predicates';
import {  guard, throw_error } from 'generic-handler/built_in_generics/other_generic_helper';
import { is_layered_object } from '../Helper/Predicate';
import { construct_readonly_reactor, construct_stateful_reactor, type StatefulReactor } from './Reactivity/Reactor';
import { pipe } from 'fp-ts/function';
import { filter, tap, map } from './Reactivity/Reactor';
import { generic_merge, set_merge } from '../Cell/Merge';



//@ts-ignore
var parent: StatefulReactor<Primitive_Relation> = construct_stateful_reactor<Primitive_Relation>(make_relation("root", null));
// Todo: make this read only
const all_cells: StatefulReactor<any[]> = construct_stateful_reactor<any[]>([]);
const all_propagators: StatefulReactor<any[]> = construct_stateful_reactor<any[]>([]);
const all_amb_propagators: StatefulReactor<any[]> = construct_stateful_reactor<any[]>([]);
export const failed_count : StatefulReactor<number> = construct_stateful_reactor<number>(1);




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
    UPDATE_FAILED_COUNT = "update_failed_count"
}

export interface PublicStateMessage{
    command: PublicStateCommand;
    args: any[];
    summarize: () => string;
}

export function public_state_message(command: PublicStateCommand, ...args: any[]): PublicStateMessage{
    function get_command(){
        return command;
    }

    function get_args(){
        return args;
    } 

    function summarize(){
        const args_summarize = ( is_cell(args[0]) ) || (is_propagator(args[0])) ? args[0].summarize() : "unknown args";

        return  "command: " + get_command() + " args: " + args_summarize;
    }

    return {
        command: get_command(),
        args: get_args(),
        summarize: summarize
    }
}




const receiver : StatefulReactor<PublicStateMessage> = construct_stateful_reactor<PublicStateMessage>(public_state_message(PublicStateCommand.ADD_CELL, []));



// avoid circular references
function is_cell(o: any): boolean{
    return o.getContent !== undefined && o.getRelation !== undefined && o.getStrongest !== undefined && o.getNeighbors !== undefined;
}

function is_propagator(o: any): boolean{
    return o.getInputsID !== undefined && o.getOutputsID !== undefined && o.summarize !== undefined;
}


receiver.subscribe((msg: PublicStateMessage) => {
    switch(msg.command){
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
                console.log("captured attempt for insert weird thing inside cells:" + msg.args)
            }
            break;

        case PublicStateCommand.ADD_PROPAGATOR:
            if (msg.args.every(o => is_propagator(o))) {
                all_propagators.next([...all_propagators.get_value(), ...msg.args]);
            }
            else{
                console.log("captured attempt for insert weird thing inside propagators")
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
                    "add_error:",
                    "add_child expects 1 or 2 arguments, got " + msg.args.length,
                    msg.summarize()
                );
            }
            break;
        case PublicStateCommand.SET_PARENT:
            guard(msg.args.length == 1, throw_error(
                "add_error:",
                "set_parent expects 1 argument, got " + msg.args.length,
                msg.summarize()
            ));
            parent = msg.args[0];
            break;
       
        case PublicStateCommand.ADD_AMB_PROPAGATOR:
            if (msg.args.every(o => is_propagator(o))) {
                all_amb_propagators.next([...all_amb_propagators.get_value(), ...msg.args]);
            }
            else{
                console.log("captured attempt for insert weird thing inside propagators")
            }
            break;

        case PublicStateCommand.CLEAN_UP:
            all_cells.next([])
            all_propagators.next([])
            all_amb_propagators.next([])
            clean_premises_store()
            clean_hypothetical_store()
            set_global_state(PublicStateCommand.SET_CELL_MERGE, generic_merge)
            
            break;

        case PublicStateCommand.SET_CELL_MERGE:
            if (msg.args.length == 1){
                set_merge(msg.args[0]);
            }
            else{
                throw_error(
                    "add_error:",
                    "set_cell_merge expects 1 argument, got " + msg.args.length,
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
})

export function set_global_state(type: PublicStateCommand, ...args: any[]){
    // altering global state should be very careful, so i intentionally make the operation observable
    const msg = public_state_message(type, ...args);
    receiver.next(msg);
} 

export function parameterize_parent(a: any){
    return (do_something: () => any) => {
        const old_parent = parent.get_value();
        
        parent.next(a); 
        const temp = do_something();
        parent.next(old_parent);
        return temp
    }
}

export function get_global_parent(){
    return parent.get_value();
}

export const observe_all_cells_update = (observeCommand: (msg: PublicStateMessage) => void, 
                                  observeCell: (cell: any) => void) => {
    pipe(receiver,
        filter((msg: PublicStateMessage) => msg.command === PublicStateCommand.ADD_CELL), 
        filter((msg: PublicStateMessage) => msg.args.length == 1 && is_cell(msg.args[0])),
        tap((msg: PublicStateMessage) => {
            observeCommand(msg);
            return msg
        }))
    .subscribe((msg: PublicStateMessage) => {
        const cell = msg.args[0]; 
        guard((is_cell(cell)), throw_error(
            "observe_all_cells", 
            "observe_all_cells expects a cell, got " + cell, 
            msg.summarize()
        ));
        observeCell(cell);
    })
                
}

export const observe_cell_array = construct_readonly_reactor(all_cells)
export const observe_propagator_array = construct_readonly_reactor(all_propagators)
export const observe_amb_propagator_array = construct_readonly_reactor(all_amb_propagators)
export const observe_failed_count = construct_readonly_reactor(failed_count)


import { layered_deep_equal } from 'sando-layer/Equality';
import { clean_hypothetical_store, clean_premises_store, observe_premises_has_changed } from '../DataTypes/Premises';
import { get_base_value, type Layer } from 'sando-layer/Basic/Layer';
import { is_any } from 'generic-handler/built_in_generics/generic_predicates';
import { set_every, set_get_length, type BetterSet } from 'generic-handler/built_in_generics/generic_better_set';
import type { LayeredObject } from 'sando-layer/Basic/LayeredObject';
import { install_behavior_advice, return_default_behavior } from '../Propagator/PropagatorBehavior';
import { set_handle_contradiction } from '..';

export const deep_equal = construct_simple_generic_procedure("is_equal", 2,
    (a: any, b: any) => {
        return a === b;
    }
)

export function layers_equal(o1: LayeredObject, o2: LayeredObject){
    const layers1 = o1.annotation_layers();
    const layers2 = o2.annotation_layers();

    if (set_get_length(layers1) !== set_get_length(layers2)) {
        return false;
    }

    // Check if all layers are equal
    return set_every(layers1, (layer: Layer) => {
        return layer.is_equal(o1, o2)
    }) && set_every(layers2, (layer: Layer) => {
        return layer.is_equal(o1, o2)
    })
}

define_generic_procedure_handler(deep_equal,
    all_match(is_layered_object),
    (a: any, b: any) => {
        const result = layered_deep_equal(a, b);
    
        return result
    }
)




