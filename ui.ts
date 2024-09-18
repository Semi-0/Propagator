import { register_predicate } from "generic-handler/Predicates";
import { add_cell_content, Cell } from "./Cell/Cell"; 
import { for_each } from "./helper";
import { support_by } from "sando-layer/Specified/SupportLayer";
import { mark_premise_in, mark_premise_out } from "./DataTypes/Premises";
import { observe_all_cells, PublicStateCommand } from "./PublicState";
import {  type PublicStateMessage } from "./PublicState";
import { is_layered_object } from "./temp_predicates";
export function tell(cell: Cell, information: any, ...premises: string[]){
    for_each(premises, (premise: string) => {
        register_predicate(premise, information);
    })

    add_cell_content(cell,
        premises.length == 0 ? information : support_by(information, premises)
    )
}

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
    observe_all_cells(func,  
        (cell: Cell) => {
            cell_func(cell)
        }
    )
}