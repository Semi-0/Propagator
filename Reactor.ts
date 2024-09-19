interface Reactor{
    observers: ((...args: any[]) => void)[];
    notify: (v: any) => (() => void);
    subscribe: (observer: (...args: any[]) => void) => void;
    unsubscribe: (observer: (...args: any[]) => void) => void;
    summarize: () => string;
}

export function construct_reactor(): Reactor{
    var observers: ((...args: any[]) => void)[] = [];

    function next(v: any){
        return () => {observers.forEach(observer => observer(v))}
    }

    function subscribe(observer: (v: any) => void){
        observers.push(observer)
    }

    function summarize(){
        return "reactor with " + observers.length + " observers"
    } 

    function unsubscribe(observer: (v: any) => void){
        observers = observers.filter(o => o !== observer)
    } 

    return {
        observers,
        notify: next,
        subscribe,
        summarize,
        unsubscribe
    }
}

export function combine_reactors(...reactors: Reactor[]): any{
    return (observers: ((...args: any[]) => void)[]) => {
        var latest_values = reactors.map(reactor => {return false})
        var inner = construct_reactor()
         
        function update_latest(index: number, value: any){
            latest_values[index] = value 
            if (latest_values.every(value => value)){
                observers.forEach(observer => observer(...latest_values))
            }
        }

        observers.forEach(observer => {
            inner.subscribe(observer)
        })

        reactors.forEach((reactor, index) => {
            reactor.subscribe((value) => {
                update_latest(index, value)
            })
        })

        return inner
    }    
}


export function simple_scheduler() {
    var queue: (() => void)[] = [] 

    function schedule(f: () => void){
        queue.push(f)
    }

    function run(){
        if (queue.length !== 0){
            queue[0]()
            queue = queue.slice(1)
        }
    }

    function steppable_run(){
        return steppable_execute(queue)
    }

    return {
        schedule,
        run,
        steppable_run
    }
}



function execute(cont: (run: (rest: any[]) => void, args: any[]) => void, args: any[]){
    function run(rest: any[]){
        if (rest.length !== 0){
            rest[0]() 
            cont(run, rest.slice(1))
        }
    }
    run(args);
}


function beautiful_steppable_execute(queue: (() => void)[]): () => void {
    var next_step: () => void = () => {}

    execute((run: (rest: any[]) => void, args: any[]) => {
        next_step = () => {
            run(args)
        }
    }, queue)

    return next_step
}

function steppable_execute(queue: (() => void)[]): () => void {
    var index = 0

    return () => {
        if (index < queue.length){
            queue[index]()
            index = index + 1
        }
    }
}


