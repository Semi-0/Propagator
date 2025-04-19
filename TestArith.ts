


var f = () => {
    return 1
}

function inherit(f: () => number){

    return {
        f: f
    }
}

function set_f(){
    f = () => {
        return 2
    }
}

const b = inherit(f)
console.log(b.f()) 

set_f()

const a = inherit(f)

console.log(a.f()) 

set_f()

console.log(a.f()) 