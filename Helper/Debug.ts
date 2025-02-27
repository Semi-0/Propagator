import { cell_strongest, cell_name, cell_content, type Cell } from "@/cell/Cell";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import type { PublicStateMessage } from "../Shared/PublicState";
import { observe_all_cells_update } from "../Shared/PublicState";

export const inspect_strongest = (cell: Cell<any>) => {
    return cell_strongest(cell).subscribe((value) => {
        console.log("cell name:" + cell_name(cell) + " updated")
        console.log("cell strongest value:")
        console.log(to_string(value));
    })
}

export const inspect_content = (cell: Cell<any>) => {
    return cell_content(cell).subscribe((value) => {
        console.log("cell name:" + cell_name(cell) + " updated")
        console.log("cell content:")
        console.log(to_string(value));
    })
} 

export function observe_cell(print_to: (str: string) => void){
    return (cell: Cell<any>) => {
        cell.observe_update((cellValues: any) => {
            print_to("\n")
            print_to(cell.summarize());
        })
    }
}

export function monitor_change(func: (msg: PublicStateMessage) => void, cell_func: (cell: Cell<any>) => void){
    observe_all_cells_update(func,  
        (cell: Cell<any>) => {
            cell_func(cell)
        }
    )
}
