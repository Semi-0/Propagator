import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure";
import {  is_nothing, is_contradiction, the_contradiction } from "./CellValue";
import { is_equal } from "../PublicState";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";


export const generic_merge = construct_simple_generic_procedure("merge", 2,
    (content: any, increment: any) => {
        if (is_nothing(content)) {
            return increment
        }
        else if (is_nothing(increment)) {
            return content
        }
        else if (is_contradiction(content)) {
            return content
        }
        else if (is_contradiction(increment)) {
            return increment
        }
        else if (is_equal(content, increment)) {
            return content
        }
        else {
            console.log("contradiction caused by content:", content, "increment:", increment)
            return the_contradiction
        }
    }
)
 

export const merge_layered = make_layered_procedure("merge_layered", 2, generic_merge)

export var cell_merge = generic_merge;


export function set_merge(merge_func: (a: any, b: any) => any){
   cell_merge = merge_func;
}
