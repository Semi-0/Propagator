import { register_predicate } from "generic-handler/Predicates";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { all_match, match_args } from "generic-handler/Predicates";
import { same_source } from "./SameSource";
import type { traced_timestamp } from "./type";
import { is_traced_timestamp } from "./Predicates";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";

export function construct_traced_timestamp(timestamp: number, id: string):  traced_timestamp {
    return {  timestamp, fresh: true, id: id }
}

export function get_timestamp(timestamp: traced_timestamp): number {
    return timestamp.timestamp
} 

export function get_id(timestamp: traced_timestamp): string {
    return timestamp.id
} 

export function get_fresh(timestamp: traced_timestamp): boolean {
    return timestamp.fresh
}

let monotonic_counter: number = 0;

export function monotonic_timestamp(): number {
    monotonic_counter = monotonic_counter + 1;
    return Number(monotonic_counter);
}

export function high_precision_timestamp(): number {
    const now = Date.now();
    const counter = monotonic_counter++;
    
    return now + (Number(counter % 1000) / 1000);
}

export function refresh_timestamp(timestamp: traced_timestamp): traced_timestamp {
    return construct_traced_timestamp(monotonic_timestamp(), timestamp.id)
}

function format_timestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const milliseconds = timestamp % 1000;
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }) + `.${milliseconds.toString().padStart(3, '0')}`;
}

define_generic_procedure_handler(to_string, match_args(is_traced_timestamp), (a: traced_timestamp) => {
    return `traced_timestamp: ${a.id} ${format_timestamp(a.timestamp)} ${a.fresh}`
})

define_generic_procedure_handler(is_equal, match_args(is_traced_timestamp), (a: traced_timestamp, b: traced_timestamp) => {
    return a.id === b.id && a.timestamp === b.timestamp && a.fresh === b.fresh;
})

define_generic_procedure_handler(same_source, all_match(is_traced_timestamp), 
(a: traced_timestamp, b: traced_timestamp) => {
    return a.id === b.id
})



    