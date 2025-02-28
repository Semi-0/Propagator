// without scheduler gives a fine grain control over when the reactor should be updated 
// the visualization would be very limited

import { pipe } from "fp-ts/lib/function";
import { keys } from "fp-ts/lib/ReadonlyRecord";
import type { State } from "fp-ts/lib/State";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { guard, throw_type_mismatch } from "generic-handler/built_in_generics/other_generic_helper";
import { register_predicate } from "generic-handler/Predicates";

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
    dispose: () => void;
}

export const is_reactor = register_predicate("is_reactor", (reactor: any): reactor is Reactor<any> => {
    return "subscribe" in reactor && "unsubscribe" in reactor 
})


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

// Store connections between reactors for proper cleanup
// Map from downstream reactor to an array of {upstream, observer} objects
// TODO: dispose all down stream reactors??
const connectionMap = new WeakMap<ReadOnlyReactor<any>, Array<{upstream: ReadOnlyReactor<any>, observer: Function}>>();

export function construct_prototype_reactor<T>(constructor: (
    observers: ((...args: any[]) => void)[],
    subscribe: (observer: (...args: any[]) => void) => void,
    unsubscribe: (observer: (...args: any[]) => void) => void) => any): Reactor<T>{
    var observers: ((...args: any[]) => void)[] = [];

    function subscribe(observer: (...v: any[]) => void){
        observers.push(observer)
    }

    function unsubscribe(observer: (...v: any[]) => void){
        observers = observers.filter(o => o !== observer)
    } 

    const self = constructor(observers, subscribe, unsubscribe)

     // Attach the dispose function to clear references and disable further calls.
    self.dispose = () => {
        // Unsubscribe from all upstream reactors
        const connections = connectionMap.get(self);
        if (connections) {
            connections.forEach(({upstream, observer}) => {
                upstream.unsubscribe(observer as any);
            });
            connectionMap.delete(self);
        }
        
        // Clear the internal observers.
        observers.length = 0;
        // Override subscribe and unsubscribe to no-ops.
        self.subscribe = () => {};
        self.unsubscribe = () => {};
        // Optionally disable the next method if present.
        if ("next" in self) {
        (self as any).next = () => {};
        }
    };

    return self
}

// Helper to track connections between reactors
function trackConnection(downstream: ReadOnlyReactor<any>, upstream: ReadOnlyReactor<any>, observer: Function) {
    if (!connectionMap.has(downstream)) {
        connectionMap.set(downstream, []);
    }
    connectionMap.get(downstream)!.push({upstream, observer});
}

export function construct_reactor<T>(): StandardReactor<T>{
    return construct_prototype_reactor<T>((observers: ((...args: any[]) => void)[], 
                                        subscribe: (observer: (...args: any[]) => void) => void, 
                                        unsubscribe: (observer: (...args: any[]) => void) => void): any => {
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
       
       const observer = (...v: any) => {
        observers.forEach((observe: (...v: any[]) =>  void) => {
            observe(...v)
        })
       };
       
       linked_reactor.subscribe(observer);

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
       
       const self = {
        observers,
        subscribe: stateful_subscribe,
        summarize: () => summarize("readonly reactor", observers),
        unsubscribe
       };
       
       // Track the connection for proper cleanup after self is initialized
       trackConnection(self as ReadOnlyReactor<T>, linked_reactor, observer);

       return self;
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
        guard(is_reactor(reactor), throw_type_mismatch("construct_simple_transformer", "Reactor", typeof reactor))

        var inner = construct_reactor<T>()

        const observer = (value: T) => {
            f(value, inner)
        };
        
        reactor.subscribe(observer);
        
        // Track the connection for proper cleanup
        trackConnection(inner, reactor, observer);

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
                const observer = (value: any) => {
                    value_pack = pipe(value_pack,
                         (old_value_pack) => update_latest(old_value_pack, index, value),
                         (updated_value_pack) => mapper(updated_value_pack, inner)
                    )
                };
                
                reactor.subscribe(observer);
                
                // Track the connection for proper cleanup
                trackConnection(inner, reactor, observer);
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
