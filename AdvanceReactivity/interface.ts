import { update_cell, cell_id,construct_cell } from "@/cell/Cell";
import { annotate_now_with_id, annotate_smallest_time_with_id } from "./traced_timestamp/Annotater";
import type { Cell } from "@/cell/Cell";
import { stale } from "./traced_timestamp/Annotater";
import { register_premise } from "../DataTypes/Premises";
import { support_by } from "sando-layer/Specified/SupportLayer";
import { pipe } from "fp-ts/lib/function";
import { v4 as uuidv4 } from 'uuid';
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { get_new_reference_count } from "../Helper/Helper";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";

export const update_store = new Map<string, any>();

export function update<A>(a: Cell<A>, v: A){
    // TODO: support the premise
    // refresh the old dependencies
    if (update_store.has(cell_id(a))){
        stale(update_store.get(cell_id(a)))
    }
    const with_traced_timestamp = annotate_now_with_id(cell_id(a))
    const annotated = with_traced_timestamp(v)

    update_cell(a, annotated as A);
    update_store.set(cell_id(a), annotated)

    // execute_all_tasks_sequential((e) => {
    //     throw e
    // })

}

export function initialize<A>(a: Cell<A>, v: A){

    if (update_store.has(cell_id(a))){
        stale(update_store.get(cell_id(a)))
    }

    update_cell(a, annotate_smallest_time_with_id(cell_id(a))(v) as A)
    update_store.set(cell_id(a), v)
}


export const r_constant = <T>(value: T, name: string | undefined = undefined) => {
    if (name === undefined) {
        name = "reactive_constant_cell#" + get_new_reference_count()
    }
    const cell = construct_cell<T>(name)
    update(cell, value)
    return cell
}
