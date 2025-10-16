



// virtual environment means a cell contains frames
// and propagator computes all these frames frame by frame
// (regardless of its parents)
// but when propagator has parents

import { reduce } from "generic-handler/built_in_generics/generic_collection"
import { make_annotation_layer, type Layer } from "sando-layer/Basic/Layer"


export type Frame = {
    identity: string
    parent: Map<string, Frame>
}

export const frame_layer = make_annotation_layer("frame", 
    (get_name: () => string,
    has_value: (object: any) => boolean,
    get_value: (object: any) => any,
    summarize_self: () => string[]): Layer<Frame> => {
       function get_default_value(): Frame {
         throw new Error("frame_layer: attempting getting default value from a value without frame")
       } 

       function get_procedure(name: string, arity: number): any | undefined {
         if (name == "merge") {
            return (base: Frame, ...values: Frame[]) => {
                const frames_all_equal = reduce(values, (acc: boolean, value: Frame) => {
                    return acc && value.identity === base.identity
                }, true)
                if ((frames_all_equal) && values.length > 0) {
                    return values[0]
                }
                else {
                    throw new Error("frame_layer: attempting to merge frames with different identities")
                }
            }
         }
         else {
            return undefined
         }
       }

       return {
        get_name,
        has_value,
        get_value,
        get_default_value,
        get_procedure,
        summarize_self,
       }
    })