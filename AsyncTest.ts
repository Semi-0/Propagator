var a: number[] = [] 


async function set_array(args: number[]){ 
    return new Promise<void>((resolve, reject) => {
        a = [...a, ...args];
        resolve();
    })
}

const sets = [
    set_array([1, 2, 3]),
    set_array([4, 5, 6]),
    set_array([7, 8, 9]),
]


Promise.all(sets).then(() => {
    console.log(a)
})

