import { add_cell_content, cell_id, constant_cell } from "@/cell/Cell";
import { annotate_now_with_id, annotate_smallest_time_with_id } from "./traced_timestamp/Annotater";
import { cell_strongest_value } from "@/cell/Cell";
import type { Cell } from "@/cell/Cell";
import { stale } from "./traced_timestamp/Annotater";
import { register_premise } from "../DataTypes/Premises";
import { support_by } from "sando-layer/Specified/SupportLayer";
import { pipe } from "fp-ts/lib/function";
import { v4 as uuidv4 } from 'uuid';
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";

export const update_store = new Map<string, any>();

export function update<A>(a: Cell<A>, v: A){
    // TODO: support the premise
    // refresh the old dependencies
    if (update_store.has(cell_id(a))){
        stale(update_store.get(cell_id(a)))
    }

    const timestamp_now = annotate_now_with_id(cell_id(a))(v)
    add_cell_content(a, timestamp_now as A);
    update_store.set(cell_id(a), timestamp_now)

}

export function initialize<A>(a: Cell<A>, v: A){

    if (update_store.has(cell_id(a))){
        stale(update_store.get(cell_id(a)))
    }

    add_cell_content(a, annotate_smallest_time_with_id(cell_id(a))(v) as A)
    update_store.set(cell_id(a), v)
}


export function r_constant<A>(v: A, name: string): Cell<LayeredObject>{
    const id = uuidv4()
    return constant_cell(annotate_smallest_time_with_id(id)(v), name)
}