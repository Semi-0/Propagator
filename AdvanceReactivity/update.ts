import { add_cell_content } from "@/cell/Cell";
import { annotate_now } from "./tracedTimestampLayer";
import { cell_strongest_value } from "@/cell/Cell";
import type { Cell } from "@/cell/Cell";
import { stale } from "./tracedTimestampLayer";
import { register_premise } from "../DataTypes/Premises";
import { support_by } from "sando-layer/Specified/SupportLayer";
import { pipe } from "fp-ts/lib/function";


export function update<A>(a: Cell<A>, v: A, s: string | undefined = undefined){
    // TODO: support the premise
    // refresh the old dependencies
    stale(cell_strongest_value(a))
    if (s !== undefined){
        register_premise(s, v) 
        
        const new_value = pipe(v,  
            (v) => support_by(v, s),
            annotate_now
        )
        add_cell_content(a, new_value as A)
    }
    else{
        add_cell_content(a, annotate_now(v) as A);
    }
}

