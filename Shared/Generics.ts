import { for_each } from "generic-handler/built_in_generics/generic_collection";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { throw_error } from "generic-handler/built_in_generics/other_generic_helper";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args } from "generic-handler/Predicates";
import { mark_for_disposal as _mark_for_disposal} from "./Scheduler/Scheduler";


export const get_id = construct_simple_generic_procedure(
    "get_id",
    1,
    throw_error("ObjectCell", "get_id", "get_id not implemented")
)



export const get_children = construct_simple_generic_procedure(
    "get_children",
    1,
    throw_error("ObjectCell", "get_children", "get_children not implemented")
)


// disposing


export const mark_id_for_disposal = compose(get_id, _mark_for_disposal)


export const mark_children_for_disposal = (item: any) => {
    const children = get_children(item)

    for_each(children, mark_children_for_disposal)
    for_each(children, mark_id_for_disposal)
}

export const mark_for_disposal = (item: any) => {
    mark_children_for_disposal(item)
    mark_id_for_disposal(item)
}