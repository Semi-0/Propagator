import { all_match, register_predicate } from "generic-handler/Predicates";
import { reference_store } from "../Helper/Helper";
import { get_base_value, layer_accessor, make_annotation_layer } from "sando-layer/Basic/Layer";
import {  is_layered_object} from "../Helper/Predicate";
import { construct_layer_ui, type LayeredObject } from "sando-layer/Basic/LayeredObject";
import {  } from "sando-layer/Basic/Layer";
import { define_handler, generic_merge } from "../Cell/Merge";
import { define_layered_procedure_handler, make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { no_compute } from "../Helper/noCompute";
const get_new_id = reference_store()
const get_new_relative_time = reference_store()

interface traced_timestamp {
    timestamp: number;
    fresh: boolean;
}



export function construct_traced_timestamp(timestamp: number): traced_timestamp {
    return {  timestamp, fresh: true }
}

export const timestamp_layer = make_annotation_layer("time_stamp", (get_name: () => string,
                                                                    has_value: (object: any) => boolean,
                                                                    get_value: (object: any) => any,
                                                                    is_equal: (a: any, b: any) => boolean) => {
    function get_default_value(): traced_timestamp {
        return { timestamp: 0, fresh: false }
    }

    function get_procedure(name: string, arity: number): any | undefined {
        return undefined;
    }

    function summarize_self(): string[] {
        return ["time_stamp"];
    }

    function summarize_value(object: any): string[] {
        return [object.timestamp]
    }

    return {
        identifier: "layer",
        get_name,
        has_value,
        get_value,
        get_default_value,
        get_procedure,
        summarize_self,
        summarize_value,
        is_equal
    }})


export function construct_time_stamp(base_value: any, timestamp: number): any {
    return construct_traced_timestamp(timestamp);
}

export function _has_timestamp_layer(a: any): boolean {
    return a && timestamp_layer.has_value(a);
}

export const annotate_timestamp = construct_layer_ui(
    timestamp_layer,
    construct_time_stamp,
    (new_value: any, old_value: any) => {
        return new_value;
    }
);

export const get_traced_timestamp = layer_accessor(timestamp_layer);

export const annotate_now = (a: any) => annotate_timestamp(a, Date.now());
export const annotate_with_reference = (a: any) => annotate_timestamp(a, get_new_relative_time());

export const has_timestamp_layer = register_predicate("has_timestamp_layer", (a: any) => is_layered_object(a) && _has_timestamp_layer(a));

export function fresher(a: LayeredObject, b: LayeredObject): boolean {
    return get_traced_timestamp(a).timestamp > get_traced_timestamp(b).timestamp;
}

define_handler(generic_merge, all_match(has_timestamp_layer), (a: LayeredObject, b: LayeredObject) => {
    // todo merge other layers
    // this needs to redesign layered procedure i think...
    if (fresher(a, b)) {
        return a;
    } 
    else if (fresher(b, a)) {
        return b;
    }
    else{
        return b;
    }
})

function _stale(a: any) {
    return a
}

export const stale = make_layered_procedure("stale", 1, _stale)




define_layered_procedure_handler(stale, timestamp_layer, 
    (base: any, timestamp: traced_timestamp) => {
        timestamp.fresh = false;
    }
 )

export const is_fresh = make_layered_procedure("is_fresh", 1, (a: any) => false)

define_layered_procedure_handler(is_fresh, timestamp_layer,
    (base: any, timestamp: traced_timestamp) => {
        return timestamp.fresh;
    }
)