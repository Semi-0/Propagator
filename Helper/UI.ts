import { update_cell, type Cell, cell_strongest_base_value, cell_strongest, construct_cell, cell_id } from "../Cell/Cell"; 
import { get_support_layer_value, support_by, support_layer } from "sando-layer/Specified/SupportLayer";
import { mark_premise_in, mark_premise_out, register_premise } from "../DataTypes/Premises";
import { failed_count } from "../Shared/PublicState";
import {  type PublicStateMessage } from "../Shared/PublicState";
import { is_layered_object } from "./Predicate";
import { execute_all_tasks_sequential, steppable_run_task } from "../Shared/Scheduler/Scheduler";
import { reduce, map, filter, add_item, some, every, for_each, to_array } from "generic-handler/built_in_generics/generic_collection";
import { pipe } from "fp-ts/lib/function";
import {
    construct_better_set,
    is_better_set,
    set_merge,
    type BetterSet,
} from "generic-handler/built_in_generics/generic_better_set";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { process_contradictions } from "../Propagator/Search";
import { is_contradiction, is_nothing } from "../Cell/CellValue";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { construct_vector_clock, get_clock_channels, get_vector_clock_layer, vector_clock_get_source, vector_clock_layer } from "../AdvanceReactivity/vector_clock";
import { strongest_value } from "../Cell/StrongestValue";
import { Option } from "effect";
import { log_tracer } from "generic-handler/built_in_generics/generic_debugger";


function range(start: number, end: number): BetterSet<number>{
    return  construct_better_set(Array.from({ length: end - start + 1 }, (_, i) => start + i))
}


export async function compound_tell<A>(cell: Cell<any>, information: A, ...layered_alist: any[]) {
    const layered : LayeredObject<A>= construct_layered_datum(information, ...layered_alist);
    for_each(compose(get_vector_clock_layer, get_clock_channels)(layered), (support: string) => {
        register_premise(support, information);
    });
    update_cell(cell, layered);

}

const DEFAULT_VECTOR_CLOCK_SOURCE = "repl";

export async function reactive_tell(cell: Cell<any>, value: any, source: string | undefined = undefined, ...layered_alist: any[]){

    const source_name = source != undefined  ? source : DEFAULT_VECTOR_CLOCK_SOURCE
    const maybe_last_clock = pipe(cell, 
        cell_strongest, 
        get_vector_clock_layer, 
        vector_clock_get_source(source_name)
    )
    // console.log("maybe_last_clock", maybe_last_clock)
    // in current patched value set
    // this would lose the vector clock from other sources
    // this need to be handle at patched value set merge level
    // or it is fine because this injection means this cell 
    // is the source cell
    // so it is not related to previous sources
    const new_clock = Option.match(
        maybe_last_clock, {
            onNone: () => construct_vector_clock([{
                source: source_name,
                value: 0
            }]),
            onSome: (last_clock) => construct_vector_clock([{
                source: source_name,
                value: last_clock + 1
            }])
        }
    )

    
    compound_tell(
        cell,
        value,
        vector_clock_layer, new_clock,
        ...layered_alist
    )

}

export async function reactive_update(cell: Cell<any>, value: any){
    return reactive_tell(cell, value)
}


export async function tell<A>(cell: Cell<A>, information: A, ...premises: string[]) {

    for_each(premises, (premise: string) => {
        register_premise(premise, information);
    });

    update_cell(cell,
        pipe(
            information,
            (info) => premises.length === 0 ? info : 
                        reduce(premises, 
                                (acc: any, premise: string) => support_by(acc, premise), 
                                info),
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
    else if (is_better_set(v)){
        const items = to_array(v) as any[];
        if (items.length === 0) {
            return "[empty set]";
        }

        const lines = items.map((value: any, index: number) => {
            const rendered = to_string(value).split("\n");
            const header = `[${index}] ${rendered[0] ?? ""}`;
            const body = rendered
                .slice(1)
                .map((line: string) => `    ${line}`)
                .join("\n");
            return body ? `${header}\n${body}` : header;
        });

        return lines.join("\n");
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
    const nogoods = reduce(map(cells, compose(cell_strongest, get_support_layer_value)), set_merge, construct_better_set([]))
    process_contradictions(construct_better_set([nogoods]), construct_cell("user_cell"))
}

export function all_results(cells: BetterSet<Cell<any>>, value_receiver: (value: any) => void){
    execute_all_tasks_sequential((e) => {
        console.log(e)
    })

    const results = reduce(cells, (acc: BetterSet<any>, cell: Cell<any>) => {
        return  add_item(acc, cell_strongest_base_value(cell))
    }, construct_better_set([]))

   if (some(results, is_contradiction) || every(results, is_nothing)){
        value_receiver("done:" + failed_count.get_value())
   }
   else{
        value_receiver(results) 
        force_failure(cells) 
        all_results(cells, value_receiver) 
   }
}

export function enum_num_set(min: number, max: number){
    return reduce(range(min, max), add_item, construct_better_set([]))
}

