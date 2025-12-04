import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import type { Cell } from "../Cell/Cell";
import { cell_id, cell_level, is_cell } from "../Cell/Cell";
import type { Propagator } from "../Propagator/Propagator";
import { is_propagator, propagator_id, propagator_level } from "../Propagator/Propagator";
import { cell_snapshot, propagator_snapshot } from "./PublicState";
import { traverse, get_downstream, get_id, traverse_downstream } from "./Spider";

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

export interface TraceResult {
  cells: Map<string, Cell<any>>;
  propagators: Map<string, Propagator>;
}

/**
 * Traverse all downstream propagators and cells from a given root cell.
 * Uses the generic traverse function from Spider.ts with get_downstream.
 */
export const traverse_downstream_graph = (root: Cell<any>): TraceResult => {
   return traverse_downstream(
    (traversed: any[]) => {
      const cells = new Map<string, Cell<any>>();
      const propagators = new Map<string, Propagator>();
      traversed.forEach((node: any) => {
        if (is_cell(node)) {
          cells.set(get_id(node), node);
        }
        else if (is_propagator(node)) {
          propagators.set(get_id(node), node);
        }
      });
      return { cells, propagators };
    }
   )(root)
}

/**
 * Traverse downstream graph and filter by level.
 */
export const traverse_with_level = (level: number) => (root: Cell<any>): TraceResult => {
  const result = traverse_downstream_graph(root);
  
  // Filter cells by level
  const filteredCells = new Map<string, Cell<any>>();
  result.cells.forEach((cell, id) => {
    if (is_equal(cell_level(cell), level)) {
      filteredCells.set(id, cell);
    }
  });
  
  // Filter propagators by level
  const filteredProps = new Map<string, Propagator>();
  result.propagators.forEach((prop, id) => {
    if (is_equal(propagator_level(prop), level)) {
      filteredProps.set(id, prop);
    }
  });
  
  return { cells: filteredCells, propagators: filteredProps };
};

export const traverse_primitive_level = traverse_with_level(0);

/**
 * Build a TraceResult containing all downstream cells & propagators.
 */
export const trace_cell = (cell: Cell<any>): TraceResult => {
  return traverse_downstream_graph(cell);
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
