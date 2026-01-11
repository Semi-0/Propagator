import type { Cell } from "../Cell/Cell"
import { function_to_primitive_propagator } from "../Propagator/Propagator"
import { the_nothing, any_unusable_values } from "../Cell/CellValue"
import { type Frame } from "./frames"
import { type VirtualCopy, type VirtualCopySet, full_frame_content, hash_set_to_virtual_copy_set, make_virtual_copy, occurring_frames } from "./virtual_copy_core"
import { find_the_occcurrence_parent, good_frames } from "./virtual_copy_ops"
import { pipe } from "fp-ts/lib/function"
import * as A from "fp-ts/Array"
import { isSome } from "fp-ts/Option"
import type { HashSet } from "effect/HashSet"
import * as HS from "effect/HashSet"


export const apply_frames_with_anchor = (f: (...inputs: any[]) => any) =>
    (...args: [...VirtualCopySet[], VirtualCopySet]): VirtualCopySet => {
        const outputAnchorCopySet = args[args.length - 1]
        const inputCopySets = args.slice(0, -1) as VirtualCopySet[]

        const framesToEvaluate: HashSet<Frame> = good_frames(HS.make(...inputCopySets as VirtualCopySet[]))

        const entries: HashSet<VirtualCopy> = pipe(
            framesToEvaluate,
            HS.map((currentFrame) => {
                const anchorFrame = find_the_occcurrence_parent(outputAnchorCopySet, currentFrame)
                const computedValue = f(...inputCopySets.map((copySet) => full_frame_content(copySet, currentFrame)))
                return make_virtual_copy(anchorFrame, computedValue)
            })
        )

        return hash_set_to_virtual_copy_set(entries)
    }

export const v_c_io_unpacking = apply_frames_with_anchor

export const construct_propagator_from_io_function = (name: string, f: (...inputs: any[]) => any) =>
    (...cells: Cell<any>[]) => function_to_primitive_propagator(name, f)(...cells)

export const io_function_to_propagator_constructor = construct_propagator_from_io_function

export const construct_virtual_io_propagator = (name: string, f: (...inputs: any[]) => any) =>
    construct_propagator_from_io_function(
        name,
        (...args: any[]) => {
            if (any_unusable_values(args)) {
                return the_nothing
            }
            else {
                const lastArg = args[args.length - 1]
                 if (lastArg instanceof Map) {
                    return apply_frames_with_anchor(f)(...args as any)
                 }
                 else {
                    return f(...args)
                 }
            }
        }
    )


