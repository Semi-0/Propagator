// without scheduler gives a fine grain control over when the reactor should be updated 
// the visualization would be very limited

import { pipe } from "fp-ts/lib/function";

type Reactor = StandardReactor | StatefulReactor


// PERHAPS SHOULD USE SET FOR PERFORMANCE
export interface StandardReactor{
    observers: ((...args: any[]) => void)[];
    next: (...v: any[]) => void;
    subscribe: (observer: (...args: any[]) => void) => void;
    unsubscribe: (observer: (...args: any[]) => void) => void;
    summarize: () => string;
}

function default_next(error_handler: (e: any) => void): (observers: ((...args: any[]) => void)[]) => (...v: any[]) => void{
    return (observers: ((...args: any[]) => void)[]) => {
        return (...v: any[]) => {
            try{
                observers.forEach(observer => observer(...v))
            }
            catch (e){
                error_handler(e)
            }
        }
    }
}

function scheduled_modifer(scheduling: (task: () => Promise<void>) => void){
    return (next: (...v: any[]) => void) => {
        return (...v: any[]) => {
            scheduling(() => {
                return new Promise<void>(resolve => {
                    next(...v)
                    resolve()
                })
            })
        }
    }
}

function stateful_modifer(set_value: (v: any) => void){
    return (next: (...v: any[]) => void) => {
        return (...v: any[]) => {
            set_value(v)
            next(...v) 
        }
    }
}


function throw_error(name: string){
    return (e: any) => {
        throw new Error("error in " + name + ": " + e)
    }
}

function summarize(name: string, observers: ((...args: any[]) => void)[]){
    return "reactor with " + observers.length + " observers"
}




export function construct_prototype_reactor(constructor: (
    observers: ((...args: any[]) => void)[],
    subscribe: (observer: (...args: any[]) => void) => void,
    unsubscribe: (observer: (...args: any[]) => void) => void) => Reactor): Reactor{
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

export const construct_reactor = () => construct_prototype_reactor((observers: ((...args: any[]) => void)[], 
                                                                    subscribe: (observer: (...args: any[]) => void) => void, 
                                                                    unsubscribe: (observer: (...args: any[]) => void) => void): StandardReactor => {
    return {
        observers,
        next:  default_next(throw_error("default_next"))(observers),
        subscribe,
        summarize: () => summarize("reactor", observers),
        unsubscribe
    } 
})

export function construct_scheduled_reactor(scheduling: (task: () => Promise<void>) => void): () => StandardReactor{
    return () => construct_prototype_reactor((observers: ((...args: any[]) => void)[], 
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
    })
}

interface StatefulReactor extends StandardReactor{
    get_value: () => any
}

export function construct_stateful_reactor(initial_value: any): StatefulReactor{
    var value = initial_value

    return construct_prototype_reactor((observers: ((...args: any[]) => void)[], 
                                        subscribe: (observer: (...args: any[]) => void) => void, 
                                        unsubscribe: (observer: (...args: any[]) => void) => void) => {
       

     

        return {
            observers,
            next: pipe(observers,
                default_next(throw_error("stateful_reactor")),
                stateful_modifer((v) => value = v), 
            ),
            summarize: () => summarize("stateful_reactor", observers),
            subscribe,
            unsubscribe,
            get_value: () => value
        }
    }) as StatefulReactor
}

export function construct_scheduled_stateful_reactor(
  scheduling: (task: () => Promise<void>) => void
): (initial_value: any) => StatefulReactor {
  return (initial_value: any) =>
    construct_prototype_reactor(
      (
        observers: ((...args: any[]) => void)[],
        subscribe: (observer: (...args: any[]) => void) => void,
        unsubscribe: (observer: (...args: any[]) => void) => void
      ) => {
        let value = initial_value;

  

        return {
          observers,
          next: pipe(observers,
            default_next(throw_error("stateful_reactor")),
            stateful_modifer((v) => value = v), 
            scheduled_modifer(scheduling)
          ),
          summarize: () => summarize("stateful_reactor", observers),
          subscribe,
          unsubscribe,
          get_value: () => value
        };
      }
    ) as StatefulReactor
}

export function construct_simple_transformer<T>(f: (v: T, inner: Reactor) => void): (reactor: Reactor) => Reactor{
    return (reactor: Reactor) => {
        var inner = construct_reactor()

        reactor.subscribe((value) => {
            f(value, inner)
        })

        return inner
    }
}

export function map<T>(f: (v: T) => T): (reactor: Reactor) => Reactor{
    return construct_simple_transformer<T>((v, inner) => {
        inner.next(f(v))
    })
}

export function filter<T>(f: (v: T) => boolean): (reactor: Reactor) => Reactor{
    return construct_simple_transformer<T>((v, inner) => {
        if (f(v)){
            inner.next(v)
        }
    })
}

export function scan<T>(f: (v: T, acc: T) => T): (reactor: Reactor) => Reactor{
    var acc: T

    return construct_simple_transformer<T>((v, inner) => {
        acc = f(v, acc)
        inner.next(acc)
    })
}


// this is not going to work
export function construct_multicast_reactor(value_pack_constructor: (rs: Reactor[]) => any[],
                                            update_latest: (old_value_pack: any[], index: number, value: any) => any[],
                                            mapper: (value_pack: any[], reactor: Reactor) => any[]): (...others: Reactor[]) => (reactor: Reactor) => Reactor{
    return (...others: Reactor[]) => {
        return (reactor: Reactor) => {
            const reactors = [reactor, ...others]
            var inner = construct_reactor()
            var value_pack = value_pack_constructor(reactors)

            reactors.forEach((reactor, index) => {
                reactor.subscribe((value) => {
                    value_pack =  pipe(value_pack,
                         (old_value_pack) => update_latest(old_value_pack, index, value),
                         (updated_value_pack) => mapper(updated_value_pack, reactor)
                    )
                })
            })

            return inner
        }
    }
}


export const combine_latest = construct_multicast_reactor(
    (rs: Reactor[]) => rs.map(reactor => {return null}), 
    (old_value_pack, index, value) => old_value_pack.map((v, i) => i === index ? value : v),
    (value_pack, reactor) => {
        if (value_pack.every(v => v !== null)){
            reactor.next(...value_pack)
        }
        return value_pack
    }
)

export const zip = construct_multicast_reactor(
    (rs: Reactor[]) => rs.map(reactor => {return null}), 
    (old_value_pack, index, value) => old_value_pack.map((v, i) => i === index ? value : v),
    (value_pack, reactor) => {
        if (value_pack.every(v => v !== null)){
            reactor.next(...value_pack)
            return value_pack.map(v => null)
        }
        else{
            return value_pack
        }
    }
)

export const fork = construct_multicast_reactor(
    (rs: Reactor[]) => [], 
    (old_value_pack, index, value) => [value],
    (value_pack, reactor) => {
        value_pack.forEach((v: any[]) => {
            if (v.length > 0){
                reactor.next(v[0])
            }
        })
        return value_pack
    }
)

// export function combine_latest(...other: Reactor[]): (reactor : Reactor) => Reactor{
//     return (reactor : Reactor) => {
//     const reactors = [reactor, ...other]
//     var latest_values = reactors.map(reactor => {return false})
//     var inner = construct_reactor()
        
//     function update_latest(index: number, value: any){
//         latest_values[index] = value 
//         if (latest_values.every(value => value)){
//             inner.next(...latest_values)
//         }
//     }


//     reactors.forEach((reactor, index) => {
//         reactor.subscribe((value) => {
//             update_latest(index, value)
//         })
//     })

//         return inner
//     }
// // }    

// export function zip(...other: Reactor[]): (reactor : Reactor) => Reactor{
//     return (reactor : Reactor) => {
//         const reactors = [reactor, ...other]
//         const create_zip_pack = (rs: Reactor[]) => rs.map(reactor => {return null})
//         var latest_values = create_zip_pack(reactors)
//         var inner = construct_reactor()

//         function update_latest(index: number, value: any){
//             latest_values[index] = value 
//             if (latest_values.every(value => value !== null)){
//                 inner.next(...latest_values)
//                 latest_values = create_zip_pack(reactors)
//             }
//         }

//         reactors.forEach((reactor, index) => {
//             reactor.subscribe((value) => {
//                 update_latest(index, value)
//             })
//         })

//         return inner
//     }
// }




// const test_reactor = scheduled_reactor() 

// const test_reactor_2 = scheduled_reactor() 


// test_reactor.subscribe((value) => {
//     console.log("test_reactor", value) 
//     test_reactor_2.next(value + 1)

// })

// test_reactor_2.subscribe((value) => {
//     console.log("test_reactor_2", value) 
// })

// test_reactor.next(0)

// SimpleScheduler.execute_all()

// setTimeout(() => {
//     console.log("setting timeout")
//     test_reactor.next(1)
// }, 1000)

 

// setTimeout(() => {
//     console.log("setting timeout 2")
//     test_reactor.next(2)
//     SimpleScheduler.execute_all()
// }, 2000)