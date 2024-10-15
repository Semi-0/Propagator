import { register_predicate } from "generic-handler/Predicates";
import { add_cell_content, Cell } from "./Cell/Cell"; 
import { for_each } from "./helper";
import { support_by } from "sando-layer/Specified/SupportLayer";
import { mark_premise_in, mark_premise_out, register_premise } from "./DataTypes/Premises";
import { observe_all_cells_update, PublicStateCommand } from "./PublicState";
import {  type PublicStateMessage } from "./PublicState";
import { is_layered_object } from "./temp_predicates";
import { steppable_run_task } from "./Scheduler";
import { construct_value_set } from "./DataTypes/ValueSet";
import { reduce } from "generic-handler/built_in_generics/generic_array_operation";
import { pipe } from "fp-ts/lib/function";
export function tell_constructor(constructor: (arg: any) => any){
    return (cell: Cell, information: any, ...premises: string[]) => {
        for_each(premises, (premise: string) => {
            register_premise(premise, constructor(information));
        }) 

        add_cell_content(cell,
            pipe(
                information,
                (info) => premises.length === 0 ? info : 
                            reduce(premises, 
                                    (acc: any, premise: string) => support_by(acc, premise), 
                                    info),
                constructor
            )
        )

        steppable_run_task((e) => {
        })
    }
}


export const tell = tell_constructor((a: any) => a)
// export const tell_value_set = tell_constructor(construct_value_set)

export function describe(v: any){
    if (is_layered_object(v)){
        return v.describe_self()
    }
    return v
}

export function assert(premise: string){
    mark_premise_in(premise);
}

export function kick_out(premise: string){
    mark_premise_out(premise);
}

export function observe_msg(msg: PublicStateMessage){
    console.log("msg updated", msg.summarize())
}

export function do_nothing(){
    return;
}

export function observe_cell(print_to: (str: string) => void){
    return (cell: Cell) => {
        cell.observe_update((cellValues: any) => {
            print_to("\n")
            print_to(cell.summarize());
        })
    }
}

export function monitor_change(func: (msg: PublicStateMessage) => void, cell_func: (cell: Cell) => void){
    observe_all_cells_update(func,  
        (cell: Cell) => {
            cell_func(cell)
        }
    )
}