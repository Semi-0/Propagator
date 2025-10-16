import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { every, reduce } from "generic-handler/built_in_generics/generic_collection";
import { remove_item, add_item } from "generic-handler/built_in_generics/generic_collection";
import { layer_pair_value, layers_reduce } from "sando-layer/Basic/helper";
import { BetterSet, construct_better_set } from "generic-handler/built_in_generics/generic_better_set";
import { make_layered_procedure, define_layered_procedure_handler } from "sando-layer/Basic/LayeredProcedure";
import { get_support_layer_value, support_layer } from "sando-layer/Specified/SupportLayer";
import { and, not } from "../AdvanceReactivity/Generics/GenericArith";
import { compose, curryArgument } from "generic-handler/built_in_generics/generic_combinator.ts";
import { filter } from "generic-handler/built_in_generics/generic_collection";
import { construct_layered_consolidator, define_consolidator_per_layer_dispatcher, exclude_base_layer } from "sando-layer/Basic/LayeredCombinators";
import { match_args, register_predicate } from "generic-handler/Predicates";
import { is_array } from "generic-handler/built_in_generics/generic_predicates";
import { get_base_value } from "../Cell/CellValue";
import { layered_deep_equal, layers_base_equal } from "sando-layer/Equality";
import { get_support_layer_set_length, strongest_consequence } from "./ValueSet";
import { length } from "generic-handler/built_in_generics/generic_collection";
import { generic_wrapper } from "generic-handler/built_in_generics/generic_wrapper";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { is_nothing, is_unusable_value } from "@/cell/CellValue";
import { strongest_value } from "@/cell/StrongestValue";
import { log_tracer, trace_function } from "generic-handler/built_in_generics/generic_debugger";
import type { Layer } from "sando-layer/Basic/Layer";
import { pipe } from "fp-ts/lib/function";
import { some } from "generic-handler/built_in_generics/generic_collection";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
// TOD: there should be more efficient way to do this
// it this surely would be a performance bottleneck
// but let's maxiumize expressiveness first
export type GenericValueSet<T> = Array<LayeredObject<T>>

export const is_generic_value_set = is_array



export const _merge_generic_value_set = (set: GenericValueSet<any>, elt: any) => {
    // so supposely, it should find all existing related elements
    // and if related elements is more informative than the new element, new element should be rejected
    // and if related elements is less informative than the new element, new element should be added 
    // if no related elements exist, new element should be added 

    // the type error is unrelated because if if can't find layer for set it will just return the default value
    // @ts-ignore
    const related_elements = log_tracer("find_related_elements", find_related_elements)(set, elt)

    if (related_elements.length > 0) {
        if (log_tracer("subsumes", subsumes)(related_elements, elt)) {
            return set;
        }
        else {
            return log_tracer("add_item", add_item)(drop(set, related_elements), elt)
        }
    } else {
        return add_item(set, elt)
    }
}

export const drop = (set: GenericValueSet<any>, elements: GenericValueSet<any>): GenericValueSet<any> => {
   
    return filter(set, (a: LayeredObject<any>) => {
        return !some(elements, (b: LayeredObject<any>) => {
            return log_tracer("layered_deep_equal", layered_deep_equal)(a, b)
        })
    })
}

export const merge_sets = (a: any[], layer_pair: [Layer<any>, any]) => {
   var copy = [...a]
   var value = layer_pair_value(layer_pair);
   if (value.length === 0) {
    return copy;
   }
   else {
    value.forEach((v: any) => {
        copy = add_item(copy, v)
    })
   }
   return copy
}

export  const exclude_empty_value = (f: (acc: any, layer_pair: [Layer<any>, any]) => any) => (acc: any, layer_pair: [Layer<any>, any]) => {
    if (layer_pair_value(layer_pair).length == 0) {
        return acc;
    }
    return f(acc, layer_pair);
}

export const e_merge_sets =  pipe(merge_sets, exclude_empty_value, exclude_base_layer)

// find related elements would outputs: LayeredObject<any>[]
export const find_related_elements: (...args: any[]) => LayeredObject<any>[] = construct_layered_consolidator("find_related_elements", 2, log_tracer("merge_sets", e_merge_sets), []) 


// 
export const e_and = (a: boolean, b: boolean) => a && b

export const subsumes: (existed_candidates: LayeredObject<any>[], new_candidate: LayeredObject<any>) => boolean = construct_layered_consolidator(
    "more_informative", 
    2, (a: boolean, b: [Layer<any>, any]) => {
 
        return log_tracer("e_and", e_and)(a, layer_pair_value(b))
    }, 
    true)

// for strongest consepquences its just the original strongest consequence because that is defined using generic procedure
// so we don't need to define it again


// the rest to be done is to define the layer dispatcher for find related elements and more_informative


const _base_equal = curryArgument(0, layers_base_equal)

define_consolidator_per_layer_dispatcher(
    find_related_elements, 
    support_layer, 
    (base_args: any[], set_supports: BetterSet<any>, elt_supports: BetterSet<any>) => {

        const [set, elt] = base_args;
        // for supported value there should be only one distinct value 
        // but for reactive values there protentially be various value share the same base value 
        // but different timestamps 
        // maybe this values can be consolidated? 
        // ah it can be consolidated, because if same value from different sources they should be combined
        // if they from different timestamps, they at least one of them should be consolidated
        // set: LayeredObject<any>[] 
        // elt: based_value
        return filter(set, (a: LayeredObject<any>) => {
            return log_tracer("base_equal", layers_base_equal)(a, elt)
        })
    })

export const support_value_stronger = (a: BetterSet<any>, b: BetterSet<any>) => {
    const a_length = length(a);
    const b_length = length(b);

    if (a_length === 0){
        return false 
    }
    else if (b_length === 0){
        return true 
    }
    else{
        return a_length < b_length
    }
}

const supported_value_subsumes: (a: LayeredObject<any>, b: BetterSet<any>) => boolean = generic_wrapper(
    support_value_stronger,
    (a: boolean) => a,
    get_support_layer_value,
    (a: BetterSet<any>) => a
)


define_consolidator_per_layer_dispatcher(
    // @ts-ignore
    subsumes,
    support_layer,
    (base_args: any[], set_supports: BetterSet<any>, elt_supports: BetterSet<any>) => {
        // but then supposely we got one support value that is stronger
        // one value that doesn't have support set 
        // all the old value is dropped
        // maybe this make sense for now because this means cell content getting more precise?
        const [related, elt] = base_args;
        return  every(
            related, 
            curryArgument(
                1, 
                supported_value_subsumes
            )(elt_supports)
        )
    }
)

define_generic_procedure_handler(
    get_base_value,
    match_args(is_generic_value_set),
    compose(strongest_consequence, get_base_value)
)

define_generic_procedure_handler(
    is_unusable_value,
    match_args(is_generic_value_set),
    compose(strongest_consequence, is_unusable_value)
)

define_generic_procedure_handler(
    strongest_value,
    match_args(is_generic_value_set),
    strongest_consequence
)

export const to_generic_value_set = (a: any) => {
    if (is_generic_value_set(a)){
        return a
    }
    else{
        return [a]
    }
}

export const merge_generic_value_sets = (content: GenericValueSet<any>, increment: LayeredObject<any>) => {
    return is_nothing(increment) ?  to_generic_value_set(content) : _merge_generic_value_set(content, increment)
}
// export const layered_find_related_elements = make_layered_procedure(
//     "layered_find_related_elements",
//     2,
//     (set: GenericValueSet<any>, elt: LayeredObject<any>) => {
//         return {
//             set: set,
//             elt: elt
//         }
//     }
// )

// define_layered_procedure_handler(
//     layered_find_related_elements, 
//     support_layer,
//     (b: {set: GenericValueSet<any>, elt: LayeredObject<any>}, set_supports, elt_supports) => {
//         // this should return that the value that its base value is equal the the base value of the elt
//         // but how do we define the identification (preserve uniqueness) of layered object in value set?
//         // because surely that for reactive value the set should be distinct based on their timestamp and inputs
//         // for supported value the set should be distinct based on their supports
//         // but if we have a value that is both reactive and supported, how do we identify it?
//         // maybe its a good idea that we make every value unique by its own
//         // then we manually preserve its uniqueness through carefully adding new values?
//         // but if that becomes an array it would be very slow 

//         // or perhaps we can have a special datastructure which have multiple dict 
//         // for array elements?
//         // but that would be tricky for array elements because if we remove item from array
//         // then the later item index would be changed
//         // unless we have a manually array index which don't behave like that 
//         // but that index would be infinitely grow
//         return
//     }
// )


// // what exactly did drop_uninterested_items do?
// // it assess the elements with its base value and its layered value 
// // according to the layered specific handler 
// // kinda like let layer voting for whether the element should be dropping or not
// export const drop_uninterested_items = (based_on: GenericValueSet<any>, from: any) => {
//     const should_drop = compose(
//         curryArgument(0, layered_should_drop)(based_on), 
//         (result: LayeredObject<any>) => layers_reduce(result, and, false)
//     )

//     return filter(from, compose(should_drop, not))
// }

// // to implement layered_should_drop correctly, we need a procedure that is alternative from layered procedure
// // instead of dispatch procedure with handle through layers parrallelly,
// // we need a procedure that expose or the layer as independent elements,
// // then using generic procedure to process that elements
// // then reduce it into a single element
// // this could be a very generic process to handle any kind of layered procedure
// export const layered_should_drop = make_layered_procedure(
//     "layered_should_drop", 
//     1, 
//     (based_on: any, from: any) => {
//         return {
//             based_on: based_on,
//             from: from
//         }
//     })

// define_layered_procedure_handler(layered_should_drop, support_layer, 
//     (b: {based_on: any, from: any}, base_on_supports, from_supports) => {

//     })