import { add_cell_content, cell_id } from "@/cell/Cell";
import { annotate_now } from "./traced_timestamp/tracedTimestampLayer";
import { cell_strongest_value } from "@/cell/Cell";
import type { Cell } from "@/cell/Cell";
import { stale } from "./traced_timestamp/tracedTimestampLayer";
import { register_premise } from "../DataTypes/Premises";
import { support_by } from "sando-layer/Specified/SupportLayer";
import { pipe } from "fp-ts/lib/function";


export const update_store = new Map<string, any>();

export function update<A>(a: Cell<A>, v: A, s: string | undefined = undefined){
    // TODO: support the premise
    // refresh the old dependencies
    if (update_store.has(cell_id(a))){
        stale(update_store.get(cell_id(a)))
    }
  
    if (s !== undefined){
        register_premise(s, v) 
        
        const new_value = pipe(v,  
            (v) => support_by(v, s),
            annotate_now(cell_id(a))
        )
        add_cell_content(a, new_value as A)
        update_store.set(cell_id(a), new_value)
    }
    else{
        const timestamp_now = annotate_now(cell_id(a))(v)
        add_cell_content(a, timestamp_now as A);
        update_store.set(cell_id(a), timestamp_now)
    }
}

