import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic"
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure"
import { match_args, register_predicate } from "generic-handler/Predicates"
import { is_layered_object  as is_layered_object_predicate } from "sando-layer/Basic/LayeredObject"
import { layered_deep_equal } from "sando-layer/Equality"

const is_layered_object = register_predicate("is_layered_object", is_layered_object_predicate)
define_generic_procedure_handler(is_equal, match_args(is_layered_object), layered_deep_equal)


export interface SimpleSet<T> {
    add: (item: T) => void
    remove: (item: T) => void
    get_items: () => T[]
    clear: () => void
    copy: () => T[]
    has: (item: T) => boolean
}

export const make_easy_set = <T>(identifier: (item: T) => string): SimpleSet<T> => {
    const items: T[] = [] 
    const added_ids = new Set<string>()

    return {
        add: (item: T) => {
            if (!added_ids.has(identifier(item))) {
                items.push(item)
                added_ids.add(identifier(item))
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