// without scheduler gives a fine grain control over when the reactor should be updated 
// the visualization would be very limited

// PERHAPS SHOULD USE SET FOR PERFORMANCE
interface Reactor{
    observers: ((...args: any[]) => void)[];
    next: (...v: any[]) => void;
    subscribe: (observer: (...args: any[]) => void) => void;
    unsubscribe: (observer: (...args: any[]) => void) => void;
    summarize: () => string;
}


export function construct_prototype_reactor(constructor: (
    observers: ((...args: any[]) => void)[],
    subscribe: (observer: (...args: any[]) => void) => void,
    unsubscribe: (observer: (...args: any[]) => void) => void,
    default_next: (...v: any[]) => void | Promise<void>) => Reactor): Reactor{
    var observers: ((...args: any[]) => void)[] = [];

    function next(...v: any[]){
        try{
            observers.forEach(observer => observer(...v))
        }
        catch (e){
            console.log("error in reactor: ", e)
        }
    }

    function subscribe(observer: (...v: any[]) => void){
        observers.push(observer)
    }

    function unsubscribe(observer: (...v: any[]) => void){
        observers = observers.filter(o => o !== observer)
    } 

    const self = constructor(observers, subscribe, unsubscribe, next)

    return self
}

export const construct_reactor = () => construct_prototype_reactor((observers: ((...args: any[]) => void)[], 
                                                                   subscribe: (observer: (...args: any[]) => void) => void, 
                                                                   unsubscribe: (observer: (...args: any[]) => void) => void, 
                                                                   default_next: (...v: any[]) => void | Promise<void>) => {
    return {
        observers,
        next: default_next,
        subscribe,
        summarize: () => {
            return "reactor with " + observers.length + " observers"
        },
        unsubscribe
    }
})

export function construct_scheduled_reactor(scheduling: (task: () => Promise<void>) => void): () => Reactor{
    return () => construct_prototype_reactor((observers: ((...args: any[]) => void)[], 
                                        subscribe: (observer: (...args: any[]) => void) => void, 
                                        unsubscribe: (observer: (...args: any[]) => void) => void,
                                        default_next: (...v: any[]) => void | Promise<void>) => {
 
        function next(...v: any){
            scheduling(() => {
                return new Promise<void>(resolve => {
                    default_next(...v)
                    resolve()
                })
            })
        } 

        function summarize(){
            return "scheduled reactor with " + observers.length + " observers"
        }

        return {
            observers,
            next,
            subscribe,
            summarize,
            unsubscribe
        }
    })
}

export function construct_stateful_reactor(initial_value: any): Reactor{
    var value = initial_value

    return construct_prototype_reactor((observers: ((...args: any[]) => void)[], 
                                        subscribe: (observer: (...args: any[]) => void) => void, 
                                        unsubscribe: (observer: (...args: any[]) => void) => void,
                                        default_next: (...v: any[]) => void | Promise<void>) => {
        function next(...v: any){
            value = v
            default_next(value)
        }

        function summarize(){
            return "stateful reactor with " + observers.length + " observers"
        }

        return {
            observers,
            next,
            summarize,
            subscribe,
            unsubscribe
        }
    })
}

export function construct_stateful_reactor_with_scheduler(
  scheduling: (task: () => Promise<void>) => void
): (initial_value: any) => Reactor {
  return (initial_value: any) =>
    construct_prototype_reactor(
      (
        observers: ((...args: any[]) => void)[],
        subscribe: (observer: (...args: any[]) => void) => void,
        unsubscribe: (observer: (...args: any[]) => void) => void,
        default_next: (...v: any[]) => void | Promise<void>
      ) => {
        let value = initial_value;

        function next(...v: any) {
          scheduling(() =>
            new Promise<void>((resolve) => {
              value = v;
              default_next(value);
              resolve();
            })
          );
        }

        function summarize() {
          return `stateful reactor with ${observers.length} observers`;
        }

        return {
          observers,
          next,
          summarize,
          subscribe,
          unsubscribe,
        };
      }
    );
}


export function reactor_combine(reactor_constructor: () => Reactor): any{
    return (...reactors: Reactor[]) => {
    
    var latest_values = reactors.map(reactor => {return false})
    var inner = reactor_constructor()
        
    function update_latest(index: number, value: any){
        latest_values[index] = value 
        if (latest_values.every(value => value)){
            inner.next(...latest_values)
        }
    }


    reactors.forEach((reactor, index) => {
        reactor.subscribe((value) => {
            update_latest(index, value)
        })
    })

        return inner
    }
}    

export interface Scheduler{
    schedule: (f: () => Promise<void>) => void;
    execute_all: () => Reactor;
    steppable_run: () => () => Promise<void>;
  
}


export function simple_scheduler(): Scheduler {
    // i failed to consider that when queue is getting executed, other tasks might be added to the queue
    var queue: Set<(() => Promise<void>)> = new Set() 
    var executed: Set<(() => Promise<void>)> = new Set()

    function schedule(f: () => Promise<void>){
        queue.add(f)
    }

    function dequeue(): () => Promise<void>{
        var f = queue.values().next().value
        queue.delete(f)
        return f
    } 


    function execute_task(): () => Promise<void>{
        const f = dequeue()

        return async () => {
            await f()
            executed.add(f)
        }
    }

    function execute_all(): Reactor{
        const cancellable = construct_reactor()
        var running = true

        async function exec(){
            if ((queue.size !== 0) && (running)){
                await execute_task()()
                exec()
            }
        }

        cancellable.subscribe(() => {
            running = false
        })

        exec()

        return cancellable
    }


    function steppable_run(){
        return execute_task()
    }

 

    return {
        schedule,
        execute_all,
        steppable_run,
    }
}


export function steppable_execute( execute_tasks:  () => Promise<void>): () => Promise<void> {
    return async () => {
        await execute_tasks()
    }
}



export const SimpleScheduler = simple_scheduler()

export const scheduled_reactor = construct_scheduled_reactor(SimpleScheduler.schedule)

export const scheduled_reactive_state = construct_stateful_reactor_with_scheduler(SimpleScheduler.schedule)

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