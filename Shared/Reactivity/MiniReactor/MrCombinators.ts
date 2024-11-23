import { apply, combine } from "./MrPrimitiveCombinators";
import type { Node } from "./MrType";
import { is_node } from "./MrType";

export function map<A, B>(f: (a: A) => B){
    return apply((notify, update: A) => {
        notify(f(update));
    });
}

export function filter<A>(f: (a: A) => boolean){
    return apply((notify, update: A) => {
        if (f(update)){
            notify(update);
        }
    });
}

export function reduce<A, B>(f: (a: A, b: B) => A, initial_value: A){
    var initial = initial_value;
    return apply((notify, update: B) => {
        initial_value = f(initial, update);
        notify(initial);
    });
}

export function tap<A>(f: (a: A) => void){
    return apply((notify, update: A) => {
        f(update);
        notify(update);
    });
}

export function subscribe<A>(f: (a: A) => void){
    return apply((notify, update: A) => {
        f(update);
    });
}

export function flatten<A>(node: Node<Node<A>>){
    const find_inner_most_node = (source: any) => {
        if ((is_node(source)) && (is_node(source.v))){
            return find_inner_most_node(source.v);
        }
        else{
            return source;
        }   
    }

    const _flatten = apply((notify: (update: A) => void, update: any) => {
       notify(update)
    });

    return _flatten(find_inner_most_node(node));
}

export function track_source(node: Node<any>){
    return apply((notify: (update: any) => void, update: any) => {
                  notify({
                    update: update,
                    from: node.id
            });
    })(node);
}

export function remove_source(node: Node<any>){
    return apply((notify: (update: any) => void, update: any) => {
        const is_source = (source: any) => source.from !== undefined && 
                                           source.update !== undefined;
        notify(is_source(update) ? update.update : update);
    })(node);
}

export function combine_latest(...parents: any[]){
    return combine((notify, update, sources) => {
        notify(sources.map((source) => source.v));
    })(...parents);
}

export function merge(...parents: any[]){
    return combine((notify, update, sources) => {
        notify(update);
    })(...parents);
}

