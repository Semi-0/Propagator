import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure"
import type { Propagator } from "../../Propagator/Propagator"
import { match_args } from "generic-handler/Predicates"
import { cell_id, cell_name, is_cell, type Cell, type interesetedNeighbors } from "../../Cell/Cell"
import { is_propagator, propagator_name } from "../../Propagator/Propagator"
import { describe } from "../../Helper/UI"

export interface CellFrame {
    strongest : any 
    content : any[]
    reference : Cell<any>
}

export const make_cell_frame = (cell: Cell<any>): CellFrame => {
    return {
        strongest: cell.getStrongest(),
        content: cell.getContent(),
        reference: cell
    }
}

export const is_cell_frame = (x: any): x is CellFrame => {
    return x !== undefined && x !== null && "strongest" in x && "content" in x && "reference" in x
}

export const describe_cell_frame = (frame: CellFrame): string => {
    const name = cell_name(frame.reference)
    const strongest = describe(frame.strongest)
    const content = describe(frame.content)
    return ` \n ${name} \n  \n --strongest-- \n \n ${strongest}, \n \n --content-- \n \n ${content} \n`
}

export interface PropagatorFrame {
    step_number : number,
    inputs : CellFrame[],
    outputs : CellFrame[],
    propagator : Propagator
}

export const make_propagator_frame = (step_number: number, propagator: Propagator): PropagatorFrame => {
    return {
        step_number: step_number,
        inputs: propagator.getInputs().map(make_cell_frame),
        outputs: propagator.getOutputs().map(make_cell_frame),
        propagator: propagator
    }
}

export const describe_propagator_frame = (frame: PropagatorFrame): string => {
    const name = propagator_name(frame.propagator)
    const inputs = frame.inputs.map(describe_cell_frame).join(" \n")
    const outputs = frame.outputs.map(describe_cell_frame).join(" \n")
    return `---- STEP ${frame.step_number} ---- \n \n ${name} \n  \n -in- \n ${inputs}, \n \n -out- \n ${outputs} \n\n ---- END OF STEP ${frame.step_number} ---- `
}


export const is_propagator_frame = (x: any): x is PropagatorFrame => {
    return x !== undefined && x !== null && "inputs" in x && "outputs" in x && "propagator" in x
}



