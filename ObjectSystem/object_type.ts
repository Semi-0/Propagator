import type { Cell, Propagator } from "..";

export type FieldSpec<T, K extends keyof T> = {
    key: K
    // how to read the underlying value into the graph
    read: (obj: T) => T[K]
    // how to write a new value back to the object (side-effect)
    write?: (obj: T, v: T[K]) => void
    // optional: map value <-> cell (e.g., parsing, clamping)
    inMap?: (v: any) => T[K]
    outMap?: (v: T[K]) => any
  };
  
  export type MethodSpec<T> = {
    name: string
    call: (obj: T, ...args: any[]) => any
    // optional: convert result to graph-friendly value
    mapResult?: (r: any) => any
  };
  
  export type AdapterSpec<T> = {
    fields: FieldSpec<T, keyof T>[]
    methods?: MethodSpec<T>[]
  };
  
  export type ReactiveObject<T> = {
    object: T
    fields: Record<string, Cell<any>>
    // call method reactively by pushing a command (name,args) and reading resultOut
    call: (name: string, args: Cell<any>[], resultOut: Cell<any>) => Propagator
    // one-shot sync from object -> cells
    pull: () => void
    // make cells drive object (if write handlers exist)
    bindWrites: (gate?: Cell<boolean>) => Propagator
  };
  