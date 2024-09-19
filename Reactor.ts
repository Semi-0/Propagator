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
    run: () => void;
    steppable_run: () => () => Promise<void>;
    cancellable_run: () => Reactor;
}


export function simple_scheduler(): Scheduler {
    var queue: (() => Promise<void>)[] = [] 

    function schedule(f: () => Promise<void>){
        queue.push(f)
    }

    function execute(){
        if (queue.length !== 0){
            queue[0]()
            queue = queue.slice(1)
        }
    }

    function steppable_run(){
        return steppable_execute(queue)
    }

    function cancellable_run() {
        return cancellable_execute(queue);
    }

    return {
        schedule,
        run: execute,
        steppable_run,
        cancellable_run
    }
}




export function steppable_execute(queue: (() => Promise<void>)[]): () => Promise<void> {
    var index = 0

    return async () => {
        if (index < queue.length){
            await queue[index]()
            index = index + 1
        }
    }
}



export function cancellable_execute(queue: (() => Promise<void>)[]):   Reactor {
    let currentIndex = 0;

    let cancel = construct_reactor()
    let cancelled = false;

    async function runTasks() {
        for (const task of queue) {
            if (cancelled) {
                break
            }
            else{
                await task();
                currentIndex = currentIndex + 1
            }
        }
    }

    runTasks();
     
    cancel.subscribe((value) => {
        console.log("cancelled")
        cancelled = true
    })


    return cancel
}

export const SimpleScheduler = simple_scheduler()

export const scheduled_reactor = construct_scheduled_reactor(SimpleScheduler.schedule)

export const scheduled_reactive_state = construct_stateful_reactor_with_scheduler(SimpleScheduler.schedule)