import { add_cell_content, type Cell, cell_strongest_base_value, cell_strongest_value, construct_cell } from "../Cell/Cell"; 
import { for_each } from "./Helper";
import { get_support_layer_value, support_by } from "sando-layer/Specified/SupportLayer";
import { mark_premise_in, mark_premise_out, register_premise } from "../DataTypes/Premises";
import { failed_count } from "../Shared/PublicState";
import {  type PublicStateMessage } from "../Shared/PublicState";
import { is_layered_object } from "./Predicate";
import { execute_all_tasks_sequential, steppable_run_task } from "../Shared/Reactivity/Scheduler";
import { reduce } from "generic-handler/built_in_generics/generic_array_operation";
import { pipe } from "fp-ts/lib/function";
import { construct_better_set, map_to_new_set, merge_set, set_add_item, set_map, set_reduce, set_some, set_union, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { process_contradictions } from "../Propagator/Search";
import { is_contradiction, is_nothing } from "../Cell/CellValue";

function range(start: number, end: number): BetterSet<number>{
    return  construct_better_set(Array.from({ length: end - start + 1 }, (_, i) => start + i), to_string)
}

export async function tell<A>(cell: Cell<A>, information: A, ...premises: string[]) {
    const constructor = (a: A) => a;

    for_each(premises, (premise: string) => {
        register_premise(premise, constructor(information));
    });

    add_cell_content(cell,
        pipe(
            information,
            (info) => premises.length === 0 ? info : 
                        reduce(premises, 
                                (acc: any, premise: string) => support_by(acc, premise), 
                                info),
            constructor
        )
    );

    await steppable_run_task((e) => {
    });
}
// export const tell_value_set = tell_constructor(construct_value_set)

export function describe(v: any){
    if (is_layered_object(v)){
        return v.describe_self()
    }
    return to_string(v)
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

export function force_failure(cells: BetterSet<Cell<any>>){
    
    // TODO: set union is not correct
    const nogoods = set_reduce(set_map(cells, (cell) => get_support_layer_value(cell_strongest_value(cell))), merge_set, construct_better_set([], to_string))
    process_contradictions(construct_better_set([nogoods], to_string), construct_cell("user_cell"))
}

export function all_results(cells: BetterSet<Cell<any>>, value_receiver: (value: any) => void){
    execute_all_tasks_sequential((e) => {
        console.log(e)
    })

    const results = set_reduce(cells, (acc: BetterSet<any>, cell: Cell<any>) => {
        return  set_add_item(acc, cell_strongest_base_value(cell))
    }, construct_better_set([], to_string))

   if (set_some(results, (value) => is_contradiction(value) || is_nothing(value))){
        value_receiver("done:" + failed_count.get_value())
   }
   else{
        value_receiver(results) 
        force_failure(cells) 
        all_results(cells, value_receiver) 
   }
}

export function enum_num_set(min: number, max: number){
    return set_reduce(range(min, max), (acc: BetterSet<number>, value: number) => {
        return set_add_item(acc, value)
    }, construct_better_set([], to_string))
}

