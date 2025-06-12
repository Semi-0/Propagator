import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic"
import { to_string } from "generic-handler/built_in_generics/generic_conversation"
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure"
import { match_args, register_predicate } from "generic-handler/Predicates"
import { is_layered_object, type LayeredObject } from "sando-layer/Basic/LayeredObject"
import { layered_deep_equal } from "sando-layer/Equality"



define_generic_procedure_handler(is_equal, match_args(is_layered_object), layered_deep_equal)

define_generic_procedure_handler(to_string, match_args(is_layered_object), (value: LayeredObject<any>) => value.describe_self())

export interface SimpleSet<T> {
    add: (item: T) => void
    remove: (item: T) => void
    get_items: () => T[]
    clear: () => void
    copy: () => T[]
    has: (item: T) => boolean
}

export const trace_func = (name: string, f: (...args: any[]) => any) => (...args: any[]) => {
    console.log("***trace start *** ")
    console.log("fn: " + name + " \n")
    console.log("args: " + args.map(to_string).join(", \n") + "\n")
    const result = f(...args)
    console.log("result: \n " + to_string(result))
    console.log("***trace end *** ")
    return result
}


export const make_easy_set = <T>(identifier: (item: T) => string): SimpleSet<T> => {
    const items: T[] = [] 
    const added_ids = new Set<string>()



    return {
        add: (item: T) => {
            if (!added_ids.has(identifier(item))) {
                items.unshift(item)
                added_ids.add(identifier(item))
            }
            else{
                items.splice(items.indexOf(item), 1)
                items.unshift(item)
            }
        },
        remove: (item: T) => {
            items.splice(items.indexOf(item), 1)
            added_ids.delete(identifier(item))
        },
        get_items: () => items,
        clear: () => {
            items.length = 0
            added_ids.clear()
        },
        copy: () => {
            return items.map(i => i)
        },
        has: (item: T) => {
            return added_ids.has(identifier(item))
        },

    }
}