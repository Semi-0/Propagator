import { pipe } from "fp-ts/lib/function"
import * as A from "fp-ts/Array"
import { is_contradiction } from "../Cell/CellValue"
import { type Frame, frame_ancestors, frame_parents } from "./frames"
import { type VirtualCopySet, occurring_frames, full_frame_content, frame_occured_in_set, type VirtualCopy, make_virtual_copy, hash_set_to_virtual_copy_set, is_virtual_copy_set } from "./virtual_copy_core"
import * as HS from "effect/HashSet"
import type { HashSet } from "effect/HashSet"
import { cell_merge, generic_merge } from "@/cell/Merge"
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure"
import { match_args } from "generic-handler/Predicates"
import { None } from "effect/RuntimeFlags"
import { throw_error } from "generic-handler/built_in_generics/other_generic_helper"

export const ancestral_occurrence_count = (copy_set: VirtualCopySet, frame: Frame) => {
    return pipe(
        frame_ancestors(frame),
        HS.map((frame) => frame_occured_in_set(copy_set, frame)),
        HS.reduce(0, (acc, curr) => acc + (curr ? 1 : 0))
    )
}

export const is_accepetable_frame = (copy_sets: HashSet<VirtualCopySet>, frame: Frame) => 
    HS.every(copy_sets, (copy_set) => ancestral_occurrence_count(copy_set, frame) <= 1)

export const parents_not_acceptable = (copy_sets: HashSet<VirtualCopySet>, frame: Frame) => {
    return pipe(
        frame_parents(frame),
        HS.map((parent) => !is_accepetable_frame(copy_sets, parent)),
        HS.reduce(true, (acc, curr) => acc && curr)
    )
}

// why we only accept good frames
// because when parent frame is not acceptable(have wholes)
// means we are in a recursive environment
export const is_good_frame = (copy_sets: HashSet<VirtualCopySet>, frame: Frame) => {
    return is_accepetable_frame(copy_sets, frame) && parents_not_acceptable(copy_sets, frame)
}

export const is_lexical_invariant  = (copy_set: VirtualCopySet) => {
    return pipe(
        occurring_frames(copy_set),
        HS.map((frame) => ancestral_occurrence_count(copy_set, frame) <= 1),
        HS.reduce(true, (acc, curr) => acc && curr)
    )
}

export const find_the_occcurrence_parent = (copy_set: VirtualCopySet, frame: Frame): Frame => {
    const occurrenceParents = pipe(
        frame_ancestors(frame),
        HS.filter((frame) => frame_occured_in_set(copy_set, frame))
    )

    if (HS.size(occurrenceParents) === 0) {
        throw new Error(
            "No occurrence parent found for frame: " + frame
        )
    }
    else{
        const values = Array.from(HS.values(occurrenceParents))
        return values[0]
    }
}

export const virtual_copy_set_equal = (
    copy_set_1: VirtualCopySet,
    copy_set_2: VirtualCopySet
): boolean => {
    return (
        copy_set_1.size === copy_set_2.size &&
        HS.every(
            occurring_frames(copy_set_1),
            (frame) =>
                full_frame_content(copy_set_1, frame) ===
                full_frame_content(copy_set_2, frame)
        )
    )
}

export const good_frames = (copy_sets: HashSet<VirtualCopySet>): HashSet<Frame> => {
    return pipe(
        copy_sets,
        HS.flatMap(occurring_frames),
        HS.filter((frame: Frame) => is_good_frame(copy_sets, frame))
    )
}

export const frame_by_frame = (f: (...values: any[]) => any) => (...args:  VirtualCopySet[]): VirtualCopySet => {
      const entries: HashSet<VirtualCopy> = pipe(
        HS.make(...args),
        HS.flatMap(occurring_frames),
        HS.map((frame) => make_virtual_copy(
            frame,
            f(...args.map((arg) => full_frame_content(arg, frame)))
        ))
    )
    return hash_set_to_virtual_copy_set(entries)
}

export const virtual_copy_merge_constructor = (merge_func: (a: any, b: any) => any) => (copy_set_1: VirtualCopySet, copy_set_2: VirtualCopySet): VirtualCopySet => {
    return frame_by_frame((a: any, b: any) => merge_func(a, b))(copy_set_1, copy_set_2)
    }

export const virtual_copy_merge = virtual_copy_merge_constructor(cell_merge)

define_generic_procedure_handler(
    generic_merge,
    match_args(is_virtual_copy_set, is_virtual_copy_set),
    virtual_copy_merge
)



export const virtual_copy_equivalent = virtual_copy_set_equal

export const virtual_copy_contradictory = (vcs: VirtualCopySet): boolean => {
    for (const v of vcs.values()){
        if (is_contradiction(v)) return true
    }
    return false
}


