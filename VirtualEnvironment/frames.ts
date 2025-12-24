import * as HS from "effect/HashSet"
import { register_predicate } from "generic-handler/Predicates"
import { is_object } from "generic-handler/built_in_generics/generic_predicates"
import { pipe } from "fp-ts/lib/function"
import type { HashSet } from "effect/HashSet"

export type Frame = {
    parents: HashSet<Frame>
    ancestors: HashSet<Frame>
}



export const construct_frame = (parents: Frame[]) => {
    return {
        parents: HS.make(...parents)
    }
}


export const frame_parents = (frame: Frame) => {
    return frame.parents
}

export const frame_ancestors: (frame: Frame) => HashSet<Frame> = (frame: Frame) => {
    return frame.ancestors
}

export const is_frame = register_predicate("is_frame",  (o: any) => {
    return is_object(o) && "parents" in o && HS.isHashSet(o.parents)
})
   


export const compute_frame_ancestors = (frames: HashSet<Frame>): HashSet<Frame> => {
     return HS.flatMap(frame_ancestors)(frames)
}

