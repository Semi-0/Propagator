
import { Cell } from './Cell/Cell';
import { is_relation, make_relation, Relation } from './DataTypes/Relation';
import { Propagator } from './Propagator';
import { construct_simple_generic_procedure, define_generic_procedure_handler } from 'generic-handler/GenericProcedure';
import { make_layered_procedure } from 'sando-layer/Basic/LayeredProcedure';
import { merge } from './Cell/Merge';
import { match_args } from 'generic-handler/Predicates';
import  { BehaviorSubject, filter, tap } from 'rxjs';
import {  type InterestedType } from './DataTypes/Relation';
import { inspect } from 'bun';
import { guarantee_type, guard, throw_error } from 'generic-handler/built_in_generics/other_generic_helper';
import { isFunction } from 'rxjs/internal/util/isFunction';

export enum PublicStateCommand{
    ADD_CELL = "add_cell",
    ADD_PROPAGATOR = "add_propagator",
    ADD_CHILD = "add_child",
    SET_PARENT = "set_parent",
    SET_CELLS = "set_cells"
}

interface PublicStateMessage{
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
        const args_summarize = ( args[0] instanceof Cell) || (args[0] instanceof Propagator) ? args[0].summarize() : inspect(args);

        return  "command: " + get_command() + " args: " + args_summarize;
    }

    return {
        command: get_command(),
        args: get_args(),
        summarize: summarize
    }
}


var parent = make_relation("root", null);
const all_cells: Cell[] = [];
const all_propagators: Propagator[] = [];

const receiver : BehaviorSubject<PublicStateMessage> = new BehaviorSubject<PublicStateMessage>(public_state_message(PublicStateCommand.ADD_CELL, []));

receiver.subscribe((msg: PublicStateMessage) => {
    switch(msg.command){
        case PublicStateCommand.ADD_CELL:
            all_cells.push(...msg.args);
            break;

        case PublicStateCommand.ADD_PROPAGATOR:
            all_propagators.push(...msg.args);
            break;

        case PublicStateCommand.ADD_CHILD:
            guard(msg.args.length == 1, throw_error("add_error:", "add_child expects 1 argument, got " + msg.args.length, msg.summarize()));
            guarantee_type("add_child", msg.args[0], "Relation");
            parent.add_child(msg.args[0]);
            break;
        case PublicStateCommand.SET_PARENT:
            guard(msg.args.length == 1, throw_error("add_error:", "set_parent expects 1 argument, got " + msg.args.length, msg.summarize()));
            parent = msg.args[0];
            break;
        case PublicStateCommand.SET_CELLS:
            guard(msg.args.length == 1, throw_error("add_error:", "set_cell expects 1 argument, got " + msg.args.length, msg.summarize()));
            guard(isFunction(msg.args[0]), throw_error("add_error:", "set_cell expects a function, got " + msg.args[0], msg.summarize()));
            
            all_cells.forEach((cell: Cell) => {
                msg.args[0](cell);
            })
            break;
    }
})

export function set_global_state(type: PublicStateCommand, ...args: any[]){
    // altering global state should be very careful, so i intentionally make the operation observable
    const msg = public_state_message(type, ...args);
    receiver.next(msg);
} 


export function get_global_parent(){
    return parent;
}

export const observe_all_cells = (observeCommand: (msg: PublicStateMessage) => void, observeCell: (cell: Cell) => void) => {
    receiver.pipe(filter((msg: PublicStateMessage) => msg.command == PublicStateCommand.ADD_CELL),   
                  tap((msg: PublicStateMessage) => {
                        observeCommand(msg);
                        return msg
                    }))
                .subscribe((msg: PublicStateMessage) => {
                    msg.args.forEach((cell: Cell) => {
                        observeCell(cell);
                    })
                })
}


export const is_equal = construct_simple_generic_procedure("is_equal", 2,
    (a: any, b: any) => {
        return a === b;
    }
)




export const is_unusable_value = construct_simple_generic_procedure("is_unusable_value", 1,
    (value: any) => {
        return false;
    }
)

export const value_imples = construct_simple_generic_procedure("value_imples", 2,
    (a: any, b: any) => {
        return a === b;
    }
)

export const merge_layered = make_layered_procedure("merge_layered", 2, merge)

