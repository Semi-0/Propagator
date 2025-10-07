import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import type { Cell } from "../Cell/Cell";
import { cell_id, cell_level } from "../Cell/Cell";
import type { Propagator } from "../Propagator/Propagator";
import { propagator_id, propagator_level } from "../Propagator/Propagator";
import { cell_snapshot, propagator_snapshot } from "./PublicState";

/**
 * Find a cell object by its internal ID from the global snapshot.
 */
export const find_cell_by_id = (id: string): Cell<any> | undefined => {
  return cell_snapshot().find(c => cell_id(c) === id);
};

/**
 * Find a propagator by its internal ID from the global snapshot.
 */
export const find_propagator_by_id = (id: string): Propagator | undefined => {
  return propagator_snapshot().find(p => propagator_id(p) === id);
};

/**
 * Traverse all downstream propagators and cells from a given root cell.
 * Calls cf on each discovered cell, and pf on each discovered propagator.
 */
export const traverse_downstream_graph = (
  cf: (cell: Cell<any>) => void,
  pf: (prop: Propagator) => void
) => (root: Cell<any>) => {
  const visited_cells = new Map<string, Cell<any>>();
  const visited_props = new Map<string, Propagator>();

  const trace_cell_recursive = (cell: Cell<any>) => {
    cell.getNeighbors().forEach((prop, pid) => {
      if (!visited_props.has(pid)) {
        visited_props.set(pid, prop);
        pf(prop);
      }
      // process inputs
      prop.getInputsID().forEach(cid => {
        const c = find_cell_by_id(cid);
        if (c && !visited_cells.has(cid)) {
          visited_cells.set(cid, c);
          cf(c);
        }
      });
      // process outputs
      prop.getOutputsID().forEach(cid => {
        const c = find_cell_by_id(cid);
        if (c && !visited_cells.has(cid)) {
          visited_cells.set(cid, c);
          cf(c);
          trace_cell_recursive(c);
        }
      });
    });
  };

  trace_cell_recursive(root);
  return { cells: visited_cells, propagators: visited_props };
};

export const traverse_with_level = (level: number) => {
  const t = traverse_downstream_graph(
    (c: Cell<any>) => is_equal(cell_level(c), level),
    (propagator: Propagator) => is_equal(propagator_level(propagator), level)
  )
  return t;
}


export const traverse_primitive_level = traverse_with_level(0);

export interface TraceResult {
  cells: Map<string, Cell<any>>;
  propagators: Map<string, Propagator>;
}

/**
 * Build a TraceResult containing all downstream cells & propagators.
 */
export const trace_cell = (cell: Cell<any>): TraceResult => {
  const cells = new Map<string, Cell<any>>();
  const props = new Map<string, Propagator>();
  traverse_downstream_graph(
    c => cells.set(cell_id(c), c),
    p => props.set(propagator_id(p), p)
  )(cell);
  return { cells, propagators: props };
};

/**
 * Dispose an entire downstream subgraph, starting from the root cell.
 * Propagators are torn down first, then cells (excluding the root).
 */
export function disposeSubtree(root: Cell<any>) {
  const result = trace_cell(root);
  // Exclude root cell itself
  result.cells.delete(cell_id(root));
  // Dispose all propagators first
  result.propagators.forEach(p => p.dispose());
  // Then dispose all downstream cells
  result.cells.forEach(c => c.dispose());
} 