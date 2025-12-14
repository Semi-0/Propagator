import { construct_cell } from "@/cell/Cell";
import { compound_propagator, function_to_primitive_propagator } from "../../Propagator/Propagator";
import { p_constant } from "../../Propagator/BuiltInProps";
import type { Cell } from "@/cell/Cell";
import type { Propagator } from "../../Propagator/Propagator";
import { make_ce_arithmetical } from "../../Propagator/Sugar";
import { p_struct } from "./Carrier";

// warning this have a fundamental problem
//  if the key of dict are changed dynamically
// it would only extend the dict instead of replacing it
// is there a better way to do it?
// i think it could only be done if dict can accept patches 
// which changes existed key
// so instead of direct access
// it should pass messages about information of the changes
// actually this make sense 
// and seems could potentially be more generic 
// than existed one
// but the bigger problem is we need to also handles stop subscription
// a way to do it is instead of make bi-sync 
// we use bi-switcher to handle stop subscription
// however it have scalability issues because not needed relationship never got removed
// TODO: a better way to resolve this!!!
// a way for this is maybe better we generalize 
// vector clock for both supported value and reactive value
// and carried cell act as a special case for vector clock merge
export const p_dict_pair: (key: Cell<string>, value: Cell<any>) => Propagator = function_to_primitive_propagator("dict_element", (key: Cell<string>, value: Cell<any>) => {
    return new Map([[key, value]])
}) 

export const make_dict_with_key = (entities: [[string, Cell<any>]]) => {
    const cell_map = new Map()
    entities.forEach((entity) => {
        cell_map.set(entity[0], entity[1])
    })
    return cell_map
}

// can we generialize this to access nested map?
// static accessor i havn't figure out how to make dynamic one
// if this becomes a lexcical environment 
// and accessor was sent to multiple environment to look up simutaneously
// we would have no way to know that where the value comes from
// maybe its better that the accessor should have a contextual information of the environment?
// we can use ce_constant
// i want to know whether this works with constant
export const c_dict_accessor = (key: string) => (container: Cell<Map<string, any>>, accessor: Cell<any>) => 
    compound_propagator([container], [accessor], () => {
        p_constant(make_dict_with_key([[key, accessor]]))(construct_cell("Nothing"), container)
    }, "c_map_accessor")

    // because map_accessor is static so we don't need to build it in compound propagator level
// a gotcha for this would be if we make the constructor via compound propagagator
// and it treats inner cell as input
// then the whole network would not be built untill all inner cells have value
export const recursive_accessor = (keys: string[]) => (container: Cell<Map<string, any>>, accessor: Cell<any>) => 
    compound_propagator([container], [accessor], () => {
        if (keys.length === 0) {

        }
        else if (keys.length === 1) {
            c_dict_accessor(keys[0])(container, accessor)
        }
        else {
            const middle = construct_cell("middle") as Cell<Map<string, any>>
            c_dict_accessor(keys[0])(container, middle)
            recursive_accessor(keys.slice(1))(middle, accessor)
        }
    }, "recursive_accessor")

export const ce_dict_accessor: (key: string) => (container: Cell<Map<string, any>>) => Cell<any> = (key: string) => (container: Cell<Map<string, any>>) =>{
    const accessor = construct_cell("map_accessor_" + key)

    c_dict_accessor(key)(container, accessor) 
    return accessor 
}

