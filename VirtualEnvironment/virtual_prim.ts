import { link, p_filter_a, p_map_a, register_predicate, the_nothing, values } from "ppropogator"
import { cell_name, construct_cell, make_temp_cell, type Cell } from "../Cell/Cell"
import  { compound_propagator, function_to_primitive_propagator, primitive_propagator } from "../Propagator/Propagator"
import { for_each } from "generic-handler/built_in_generics/generic_collection"
import type { ComponentPropsWithRef } from "react"
import { v4 as uuidv4 } from 'uuid';
import { cell_merge } from "@/cell/Merge"
import { pipe } from "fp-ts/lib/function"
import * as A from "fp-ts/Array"
import { is_contradiction } from "../Cell/CellValue"
//  let's make the basic then think about GC later

const frame_registry = new Map<string, Frame>()

export type Frame = {
    identity: string
    parent: Map<string, Frame>
}

export const construct_frame = (parents: Frame[]) => {
    const identity = uuidv4()
    frame_registry.set(identity, {
        identity: identity,
        parent: new Map(parents.map((parent) => [parent.identity, parent]))
    })
    return identity
}

export const remove_frame_with_identity = (identity: string) => {
    frame_registry.delete(identity)
}

export const remove_frame = (frame: Frame) => {
    frame_registry.delete(frame.identity)
}

export const frame_with_identity: (identity: string) => Frame = (identity: string) => {
    if (frame_registry.has(identity)) {
        return frame_registry.get(identity) as Frame
    }
    else{
        throw new Error("Frame not found in registry: " + identity)
    }
}

export const frame_parents = (frame: Frame) => {
    return Array.from(frame.parent.values())
}


export const frame_strict_ancestor = (frame: Frame) => {
    return frame.parent
}

export const is_frame = register_predicate("is_frame", (value: any) => {
    return value && typeof value === "object" && "identity" in value && "parent" in value
}) 

export const frame_ancestors = (frame: Frame) => {
    const copy = new Map(frame.parent)
    copy.set(frame.identity, frame)
    return Array.from(copy.values())
}




export type VirtualCopySet = Map<string, any>

export const is_virtual_copy_set = register_predicate("is_virtual_copy_set", (value: any) => {
    return value &&  value instanceof Map
})



export const frame_binding = (copy_set: VirtualCopySet, frame: Frame) => {
    if (copy_set.has(frame.identity)) {
        return copy_set.get(frame.identity)!
    }
    else{
        throw new Error("Frame not found in copy set: " + frame.identity)
    }

}

export const occurring_frames = (copy_set: VirtualCopySet) => {
    return pipe(
        Array.from(copy_set.keys()),
        A.map((key) => frame_with_identity(key as string)),
    )
}

export const frame_occur_in_set = (copy_set: VirtualCopySet, frame: Frame) => {
    return copy_set.has(frame.identity)
}

export const frame_content = (copy_set: VirtualCopySet, frame: Frame) => {
    if (frame_occur_in_set(copy_set, frame)) {
        return copy_set.get(frame.identity)!
    }
    else{
        return the_nothing
    }
}

export const full_frame_content = (copy_set: VirtualCopySet, frame: Frame) => {
    return pipe(
        frame_ancestors(frame),
        A.map((frame) => frame_content(copy_set, frame)),
        A.reduce(the_nothing, cell_merge)
    )
}


export const ancestral_occurrence_count = (copy_set: VirtualCopySet, frame: Frame) => {
    return pipe(
        frame_ancestors(frame),
        A.map((frame) => frame_occur_in_set(copy_set, frame)),
        A.reduce(0, (acc, curr) => acc + (curr ? 1 : 0))
    )
}

export const is_accepetable_frame = (copy_sets: VirtualCopySet[], frame: Frame) => 
    copy_sets.every((copy_set) => ancestral_occurrence_count(copy_set, frame) <= 1)


export const parents_not_acceptable = (copy_sets: VirtualCopySet[], frame: Frame) => {
    return pipe(
        frame_parents(frame),
        A.map((parent) => !is_accepetable_frame(copy_sets, parent)),
        A.reduce(true, (acc, curr) => acc && curr)
    )
}

export const is_good_frame = (copy_sets: VirtualCopySet[], frame: Frame) => {
    return is_accepetable_frame(copy_sets, frame) &&
    parents_not_acceptable(copy_sets, frame)
}

export const is_lexical_invariant  = (copy_set: VirtualCopySet) => {
    // It checks the “at most one binding per lexical chain” property 
    // for a variable’s virtual copies. True iff no frame sees more than one occurrence along its ancestor chain.
    return pipe(
        occurring_frames(copy_set),
        A.map((frame) => ancestral_occurrence_count(copy_set, frame) <= 1),
        A.reduce(true, (acc, curr) => acc && curr)
    )
}

export const find_the_occcurrence_parent = (copy_set: VirtualCopySet, frame: Frame) => {
    return pipe(
        frame_ancestors(frame),
        A.findFirst((frame) => frame_occur_in_set(copy_set, frame))
    )
}

export const virtual_copy_set_equal = (copy_set_1: VirtualCopySet, copy_set_2: VirtualCopySet) => {
    return  copy_set_1.size === copy_set_2.size &&
     occurring_frames(copy_set_1).every((frame) => full_frame_content(copy_set_1, frame) === full_frame_content(copy_set_2, frame))
}

// Helpers
const good_frames = (copy_sets: VirtualCopySet[]): Frame[] => {
    const byId = new Map<string, Frame>()
    for (const cs of copy_sets){
        for (const f of occurring_frames(cs)){
            byId.set(f.identity, f)
        }
    }
    return Array.from(byId.values())
}

const frame_by_frame = (f: (...values: any[]) => any) => (...copy_sets: VirtualCopySet[]): VirtualCopySet => {
    const entries: [string, any][] = pipe(
        good_frames(copy_sets),
        A.map((frame) => [
            frame.identity,
            f(...copy_sets.map((cs) => full_frame_content(cs, frame)))
        ] as [string, any])
    )
    return new Map(entries)
}

// 1) virtual-copy-merge (frame-by-frame merge)
export const virtual_copy_set_merge = (merge_func: (a: any, b: any) => any) => (copy_set_1: VirtualCopySet, copy_set_2: VirtualCopySet): VirtualCopySet => {
    return frame_by_frame((a: any, b: any) => merge_func(a, b))(copy_set_1, copy_set_2)
}

// Convenience: default merge uses cell_merge
export const virtual_copy_merge = (copy_set_1: VirtualCopySet, copy_set_2: VirtualCopySet): VirtualCopySet =>
    virtual_copy_set_merge(cell_merge)(copy_set_1, copy_set_2)

// 2) equivalent? for virtual copies
export const virtual_copy_equivalent = virtual_copy_set_equal

// 3) contradictory? for a virtual copy set (any value contradictory?)
export const virtual_copy_contradictory = (vcs: VirtualCopySet): boolean => {
    for (const v of vcs.values()){
        if (is_contradiction(v)) return true
    }
    return false
}

// 4) v-c i/o-unpacking
// Applies f over full-frame-content for all inputs on each "good" frame,
// anchoring the output mapping to the occurring parent frame in the output copy set when found.wsa
export const v_c_io_unpacking = (f: (...inputs: any[]) => any) =>
    (...args: [...VirtualCopySet[], VirtualCopySet]): VirtualCopySet => {
        const outputAnchor = args[args.length - 1]
        const inputs = args.slice(0, -1) as VirtualCopySet[]
        // Compute over frames that occur in any input copy set
        const goodFrames: Frame[] = good_frames(inputs)

        const entries: [string, any][] = goodFrames.map((frame) => {
            const parentOpt = find_the_occcurrence_parent(outputAnchor, frame)
            const parentFrame = parentOpt._tag === "Some" ? parentOpt.value : frame
            const value = f(...inputs.map((cs) => full_frame_content(cs, frame)))
            return [parentFrame.identity, value]
        })

        return new Map(entries)
    }

// 5) i/o-function->propagator-constructor
export const io_function_to_propagator_constructor = (name: string, f: (...inputs: any[]) => any) =>
    (...cells: Cell<any>[]) => function_to_primitive_propagator(name, f)(...cells)


// 6) doit: compose short-circuit on the_nothing with virtualization-aware unpacking
export const doit = (name: string, f: (...inputs: any[]) => any) =>
    io_function_to_propagator_constructor(
        name,
        (...args: any[]) => {
            if (args.some((a) => a === the_nothing)) return the_nothing
            // Expect callers to pass the output anchor as the last argument when using v_c_io_unpacking
            // If not provided, fall back to plain application
            const last = args[args.length - 1]
            const isAnchor = last instanceof Map
            return isAnchor
                ? v_c_io_unpacking(f)(...args as any)
                : f(...args)
        }
    )