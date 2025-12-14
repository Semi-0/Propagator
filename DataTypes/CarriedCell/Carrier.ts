import { cell_name, construct_cell, same_cell } from "@/cell/Cell";
import { compound_propagator, function_to_primitive_propagator } from "../../Propagator/Propagator";
import { p_constant } from "../../Propagator/BuiltInProps";
import type { Cell } from "@/cell/Cell";
import type { Propagator } from "../../Propagator/Propagator";
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { make_ce_arithmetical } from "../../Propagator/Sugar";

export const function_to_cell_carrier_constructor = (f: (...args: Cell<any>[]) => any) => (...cells: Cell<any>[]) => {
    const inputs = cells.slice(0, -1)
    const output = cells[cells.length - 1]

    return p_constant(f(...inputs))(construct_cell("Nothing"), output)
}

export const make_map_carrier = (identificator: (cell: Cell<any>) => string) => (...cells: Cell<any>[]) => {
    // if this is cell id it would be difficult to access
    // maybe keys should be delayed 
    const cell_map = new Map()
    cells.forEach((c: Cell<any>) => {
       cell_map.set(
        identificator(c),
        c
       )
    })
    return cell_map
}

// easy constructor create map carrier from struct 

export const p_construct_cell_carrier: (identificator: (cell: Cell<any>) => string) => (...cells: Cell<any>[]) => Propagator = compose(make_map_carrier, function_to_cell_carrier_constructor)

export const p_construct_dict_carrier = (dict: Map<string, Cell<any>>, output: Cell<Map<string, any>>)  =>   {
     return p_constant(new Map(dict))(construct_cell("Nothing"), output)
}

// can we generialize to easily create nested map carrier?
/**
 * Creates a propagator that constructs a cell carrier from a struct.
 * The struct maps string keys to cells, and this creates a carrier that
 * maintains those key-cell relationships.
 */
export const p_construct_struct_carrier = (struct: Record<string, Cell<any>>) => (output: Cell<Map<string, Cell<any>>>) => {
    // Get all key-cell pairs from the struct
    const structEntries = Object.entries(struct)

    // Extract just the cells (values) from the entries
    const cells = structEntries.map(([key, cell]) => cell)

    // Create an identificator function that finds the key for each cell
    const findKeyForCell = (cell: Cell<any>): string => {
        const entry = structEntries.find(([key, structCell]) =>
            same_cell(cell, structCell)
        )
        return entry?.[0] || '' // Return the key, or empty string if not found
    }

    // Create and return the cell carrier propagator
    return p_construct_cell_carrier(findKeyForCell)(...cells, output)
}

export const p_struct = p_construct_struct_carrier

export const ce_construct_cell_carrier = (identificator: (cell: Cell<any>) => string) => make_ce_arithmetical(p_construct_cell_carrier(identificator), "cell_carrier")

export const ce_struct = (struct: Record<string, Cell<any>>) => {
    const output = construct_cell("struct") as Cell<Map<string, Cell<any>>>
    p_construct_struct_carrier(struct)(output)
    return output
}

export const ce_dict = (dict: Map<string, Cell<any>>) => {
    const output = construct_cell("dict") as Cell<Map<string, Cell<any>>>
    p_construct_dict_carrier(dict, output)
    return output
}

// what to do if we want to give the cell value as key?

export const p_construct_dict_carrier_with_name: (...cells: Cell<any>[]) => Propagator = p_construct_cell_carrier(cell_name)

export const ce_construct_dict_carrier_with_name = ce_construct_cell_carrier(cell_name)


