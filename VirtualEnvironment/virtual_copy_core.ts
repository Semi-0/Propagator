import { pipe } from "fp-ts/lib/function"
import * as A from "fp-ts/Array"
import { type Frame, construct_frame, compute_frame_ancestors, frame_ancestors } from "./frames"
import { the_nothing, type CellValue } from "@/cell/CellValue"
import * as HS from "effect/HashSet"
import type { Cell } from "@/cell/Cell"
import { cell_merge } from "@/cell/Merge"
import type { HashSet } from "effect/HashSet"
export type VirtualCopySet = Map<Frame, any>
export type VirtualCopyList = VirtualCopySet[]

export type VirtualCopy = {
    frame: Frame
    value: any
}

export const is_virtual_copy_set = (value: any) => value && value instanceof Map

export const make_virtual_copy = (frame: Frame, value: any): VirtualCopy => {
    return { frame, value }
}


export const make_virtual_copy_set = (...virtual_copies: VirtualCopy[]): VirtualCopySet => {
    return new Map(virtual_copies.map((virtual_copy) => [virtual_copy.frame, virtual_copy.value]))
}


export const hash_set_to_virtual_copy_set = (hash_set: HashSet<VirtualCopy>): VirtualCopySet => {
    return make_virtual_copy_set(...Array.from(hash_set))
}

export const frame_binding = (copy_set: VirtualCopySet, frame: Frame) => {
    if (copy_set.has(frame)) {
        return copy_set.get(frame)!
    }
    else{
        throw new Error("Frame not found in copy set: " + frame)
    }
}

export const occurring_frames = (copy_set: VirtualCopySet): HashSet<Frame> => {
    return pipe(
        HS.make(...Array.from(copy_set.keys())),
        HS.map((key) => key),
    )
}

export const frame_occured_in_set = (copy_set: VirtualCopySet, frame: Frame) => {
    return copy_set.has(frame)
}

export const frame_content = (copy_set: VirtualCopySet, frame: Frame): CellValue<Frame> => {
    if (frame_occured_in_set(copy_set, frame)) {
        return copy_set.get(frame)!
    }
    else{
        return the_nothing
    }
}

export const full_frame_content = (copy_set: VirtualCopySet, frame: Frame): CellValue<Frame> => {
    return pipe(
        frame_ancestors(frame),
        HS.map((frame) => frame_content(copy_set, frame)),
        HS.reduce(the_nothing, cell_merge)
    )
}

