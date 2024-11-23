// without scheduler gives a fine grain control over when the reactor should be updated 
// the visualization would be very limited

import { pipe } from "fp-ts/lib/function";
import type { State } from "fp-ts/lib/State";
import { compose } from "generic-handler/built_in_generics/generic_combinator";

export type Reactor<T> =  ReadOnlyReactor<T>

//TODO: Dispose?
// allow circular reference (but how to dispose?)

// PERHAPS SHOULD USE SET FOR PERFORMANCE
export interface StandardReactor<T> extends ReadOnlyReactor<T>{
    next: (v: T) => void;
}

// A ReadOnly Reactor is a reactor that can only be read
export interface ReadOnlyReactor<T>{
    observers: ((...args: T[]) => void)[];
    subscribe: (observer: (...args: T[]) => void) => void;
    unsubscribe: (observer: (...args: T[]) => void) => void;
    summarize: () => string;
}


function connect(A: Reactor<any>, B: StandardReactor<any>){
    A.subscribe(B.next)
}


export interface StatefulReactor<T> extends StandardReactor<T>{
    get_value: () => any
}

function default_next<T>(error_handler: (e: any) => void): (observers: ((...args: T[]) => void)[]) => (v: T) => void{
    return (observers: ((...args: T[]) => void)[]) => {
        return (v: T) => {
            try{
                observers.forEach(observer => observer(v))
            }
            catch (e){
                error_handler(e)
            }
        }
    }
}

function scheduled_modifer<T>(scheduling: (task: () => void) => void){
    return (next: (v: T) => void) => {
        return (v: T) => {
            scheduling(() => {
                next(v)
            })
        }
        }
    }

function stateful_modifer<T>(set_value: (v: T) => void){
    return (next: (v: T) => void) => {
        return (v: T) => {
            set_value(v)
            next(v) 
        }
    }
}


function throw_error(name: string){
    return (e: any) => {
        throw new Error("error in " + name + ": " + e)
    }
}

function summarize<T>(name: string, observers: ((...args: T[]) => void)[]){
    return "reactor with " + observers.length + " observers"
}




export function construct_prototype_reactor<T>(constructor: (
    observers: ((...args: any[]) => void)[],
    subscribe: (observer: (...args: any[]) => void) => void,
    unsubscribe: (observer: (...args: any[]) => void) => void) => Reactor<T>): Reactor<T>{
    var observers: ((...args: any[]) => void)[] = [];

 

    function subscribe(observer: (...v: any[]) => void){
        observers.push(observer)
    }

    function unsubscribe(observer: (...v: any[]) => void){
        observers = observers.filter(o => o !== observer)
    } 

    const self = constructor(observers, subscribe, unsubscribe)

    return self
}

export function construct_reactor<T>(): StandardReactor<T>{
    return construct_prototype_reactor<T>((observers: ((...args: any[]) => void)[], 
                                        subscribe: (observer: (...args: any[]) => void) => void, 
                                        unsubscribe: (observer: (...args: any[]) => void) => void): StandardReactor<T> => {
    return {
        observers,
        next:  default_next(throw_error("default_next"))(observers),
        subscribe,
        summarize: () => summarize("reactor", observers),
        unsubscribe
        } 
    }) as StandardReactor<T>
}

export function construct_scheduled_reactor<T>(scheduling: (task: () => void) => void): () => StandardReactor<T>{
    return () => construct_prototype_reactor<T>((observers: ((...args: any[]) => void)[], 
                                        subscribe: (observer: (...args: any[]) => void) => void, 
                                        unsubscribe: (observer: (...args: any[]) => void) => void) => {
 
   

        function summarize(){
            return "scheduled reactor with " + observers.length + " observers"
        }

        return {
            observers,
            next : pipe(observers,
                default_next(throw_error("scheduled_reactor")),
                scheduled_modifer(scheduling)
            ),
            subscribe,
            summarize,
            unsubscribe
        }
    }) as StandardReactor<T>
}



export function construct_stateful_reactor<T>(initial_value: T): StatefulReactor<T>{
    var value = initial_value

    return construct_prototype_reactor((observers: ((...args: any[]) => void)[], 
                                        subscribe: (observer: (...args: any[]) => void) => void, 
                                        unsubscribe: (observer: (...args: any[]) => void) => void) => {
       

     
        function subscribe_and_notify_initial_state(observer: (...v: any[]) => void){
            observer(value)
            subscribe(observer)
        }
                                      

        return {
            observers,
            next: pipe(observers,
                default_next(throw_error("stateful_reactor")),
                stateful_modifer((v) => value = v), 
            ),
            summarize: () => summarize("stateful_reactor", observers),
            subscribe: subscribe_and_notify_initial_state,
            unsubscribe,
            get_value: () => value
        }
    }) as StatefulReactor<T>
}

export function force_update(state: StatefulReactor<any>){
    state.next(state.get_value())
}



export function construct_readonly_reactor<T>(linked_reactor: Reactor<T>): ReadOnlyReactor<T>{
   return construct_prototype_reactor(( 
    observers: ((...args: any[]) => void)[],
    subscribe: (observer: (...args: any[]) => void) => void,
    unsubscribe: (observer: (...args: any[]) => void) => void) => {

       linked_reactor.subscribe((...v: any) => {
        observers.forEach((observe: (...v: any[]) =>  void) => {
            observe(...v)
        })
       })

       function stateful_subscribe(observer: (...args: any[]) => void){
        // if the linked reactor has state, 
        // then it emit the current value when subscribe to a new observer
      
        subscribe(observer)
        //@ts-ignore
        if (linked_reactor.get_value !== undefined){
            // @ts-ignore
            observer(linked_reactor.get_value())
        }
       }

       return {
        observers,
        subscribe: stateful_subscribe,
        summarize: () => summarize("readonly reactor", observers),
        unsubscribe
       }
    })
}

// DANGER!!
export function construct_replay_reactor<T>(): StandardReactor<T>{
    let replayBuffer: T[] = [];

    return construct_prototype_reactor<T>(
          (observers: ((...args: any[]) => void)[],
          subscribe: (observer: (...args: any[]) => void) => void,
          unsubscribe: (observer: (...args: any[]) => void) => void) => {

            function delayed_next(v: T): void{
                const n = default_next((e) => {throw e})(observers)
                replayBuffer.push(v);
                n(v)
            }

            function replayed_subscribe(observer: (...args: any[]) => void){
                subscribe(observer)
                for (const v of replayBuffer) {
                    observer(v);
                }
            }

            return{ 
                observers,
                next: delayed_next,
                subscribe: replayed_subscribe,
                unsubscribe,
                summarize: () => summarize("replay_reactor", observers),
            }
        }) as StandardReactor<T>
}





export function construct_scheduled_stateful_reactor<T>(
  scheduling: (task: () => void) => void
): (initial_value: any) => StatefulReactor<T> {
  return (initial_value: any) =>
    construct_prototype_reactor<T>(
      (
        observers: ((...args: any[]) => void)[],
        subscribe: (observer: (...args: any[]) => void) => void,
        unsubscribe: (observer: (...args: any[]) => void) => void
      ) => {
        var value = initial_value;

   

        function subscribe_and_notify_initial_state(observer: (...v: any[]) => void){
            observer(value)
   
            subscribe(observer)
        }
  

        return {
          observers,
          next: pipe(observers,
            default_next(throw_error("stateful_reactor")),
            scheduled_modifer(scheduling),
            stateful_modifer((v) => {value = v })
          ),
          summarize: () => summarize("stateful_reactor", observers),
          subscribe: subscribe_and_notify_initial_state,
          unsubscribe,
          get_value: () => value
        };
      }
    ) as StatefulReactor<T>
}

export function subscribe<T>(f: (v: T) => void): (reactor: Reactor<T>) => void{
    return (reactor: Reactor<T>) => {
        reactor.subscribe(f)
    }
}

export function construct_simple_transformer<T>(f: (v: T, inner: StandardReactor<T>) => void): (reactor: Reactor<T>) => Reactor<T>  {
    return (reactor: Reactor<T>) => {
        var inner = construct_reactor<T>()

        reactor.subscribe((value) => {
            f(value, inner)
        })

        return inner
    }
}

export function map<T>(f: (v: T) => T): (reactor: Reactor<T>) => StandardReactor<T>{
    return construct_simple_transformer<T>((v, inner) => {
        inner.next(f(v))
    }) as (reactor: Reactor<T>) => StandardReactor<T>
}

export function filter<T>(f: (v: T) => boolean): (reactor: Reactor<T>) => Reactor<T>{
    return construct_simple_transformer<T>((v, inner) => {
        if (f(v)){
            inner.next(v)
        }
    })
}



export function compact_map<T>(f: (v: T) => T): (reactor: Reactor<T>) => Reactor<T>{
    return compose(map(f), filter(v => v !== null && v !== undefined))
}


export function scan<T>(f: (v: T, acc: T) => T): (reactor: Reactor<T>) => Reactor<T>{
    var acc: T

    return construct_simple_transformer<T>((v, inner) => {
        acc = f(v, acc)
        inner.next(acc)
    })
}
export function tap<T>(f: (v: T) => void): (reactor: Reactor<T>) => Reactor<T>{
    return construct_simple_transformer<T>((v, inner) => {
        f(v)
        inner.next(v)
    })
}


export function construct_multicast_reactor<T>(value_pack_constructor: (rs: Reactor<T>[]) => any[],
                                            update_latest: (old_value_pack: any[], index: number, value: any) => any[],
                                            mapper: (value_pack: any[], reactor: StandardReactor<any[]>) => any[]): (...others: Reactor<any>[]) => Reactor<any>{
    return (...reactors: Reactor<any>[]) => {

          
            var inner = construct_reactor<any[]>()
            var value_pack = value_pack_constructor(reactors)

            reactors.forEach((reactor, index) => {
                reactor.subscribe((value) => {
                    value_pack =  pipe(value_pack,
                         (old_value_pack) => update_latest(old_value_pack, index, value),
                         (updated_value_pack) => mapper(updated_value_pack, inner)
                    )
                })
            })

            return inner
        }
}


export function combine_latest<T>(...reactors: Reactor<T>[]): StandardReactor<T>{
    return construct_multicast_reactor<T>(
    (rs: Reactor<T>[]) => rs.map(reactor => {return null}), 
    (old_value_pack, index, value) => old_value_pack.map((v, i) => i === index ? value : v),
    (value_pack, inner) => {
        if (value_pack.every(v => v !== null)){
            inner.next(value_pack)
        }
        return value_pack
    } 
    )(...reactors) as StandardReactor<T>
}

export const zip = construct_multicast_reactor(
    (rs: Reactor<any>[]) => rs.map(reactor => {return null}), 
    (old_value_pack, index, value) => old_value_pack.map((v, i) => i === index ? value : v),
    (value_pack, inner) => {
        if (value_pack.every(v => v !== null)){
            inner.next(value_pack)
            return value_pack.map(v => null)
        }
        else{
            return value_pack
        }
    }
)

export const merge = construct_multicast_reactor(
    (rs: Reactor<any>[]) => [], 
    (old_value_pack, index, value) => [value],
    (value_pack, inner) => {
        if (value_pack.length > 0){
            inner.next(value_pack[0])
        }
        return []
    }
)
