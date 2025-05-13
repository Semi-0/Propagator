import { cell_strongest, cell_name, cell_content, type Cell } from "@/cell/Cell";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import type { PublicStateMessage } from "../Shared/PublicState";
import { observe_all_cells_update } from "../Shared/PublicState";
import { compound_propagator, construct_propagator, function_to_primitive_propagator, primitive_propagator } from "../Propagator/Propagator";

const inspect_formatter = (name:string) => {
    return "#inspect#" + name 
}

const inspect_propagator = (name:string, inspector: (cell: Cell<any>) => void) => (...cells: Cell<any>[]) => {
    return construct_propagator(cells, [], () => {
        cells.forEach((cell) => {
            inspector(cell)
        })
    }, inspect_formatter(name))
}

export const inspect_strongest = inspect_propagator("inspect_strongest", (cell: Cell<any>) => {
    console.log("cell name:" + cell_name(cell) + " updated")
    console.log("cell strongest value:")
    console.log(to_string(cell_strongest(cell)));
})


export const inspect_content = inspect_propagator("inspect_content", (cell: Cell<any>) => {
    console.log("cell name:" + cell_name(cell) + " updated")
    console.log("cell content:")
    console.log(to_string(cell_content(cell)));
})


export function observe_cell(print_to: (str: string) => void){
    return inspect_propagator("observe_cell", (cell: Cell<any>) => {
        print_to("\n")
        print_to(cell.summarize());
    })
}


