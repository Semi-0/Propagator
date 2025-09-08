export type Id = string;

export interface Lattice<T> {
  bottom: T;
  leq: (a: T, b: T) => boolean;   // a ⊑ b
  join: (a: T, b: T) => T;        // a ⊔ b
  pretty?: (t: T) => string;
}

export interface Cell<T> {
  id: Id;
  lattice: Lattice<T>;
  value: T;
}

export type DeltaMap = Map<Id, unknown>;  // per-output deltas

export interface Propagator {
  id: Id;
  inputs: Id[];
  outputs: Id[];
  compute: (read: (id: Id) => unknown) => DeltaMap; // pure, no effects
}

export interface Graph {
  cells: Map<Id, Cell<unknown>>;
  props: Map<Id, Propagator>;
  depsOut: Map<Id, Id[]>; // cell → propagators reading it
  depsIn: Map<Id, Id[]>;  // propagator → input cells
  prodOut: Map<Id, Id[]>; // propagator → output cells
}

export interface Patch {
  cellId: Id;
  delta: unknown; // must be joinable
  t?: number;
}

// Helper functions for graph manipulation
export function addCell<T>(graph: Graph, cell: Cell<T>): void {
  graph.cells.set(cell.id, cell as Cell<unknown>);
}

export function addPropagator(graph: Graph, prop: Propagator): void {
  graph.props.set(prop.id, prop);
  
  // Update dependency maps
  for (const inputId of prop.inputs) {
    if (!graph.depsOut.has(inputId)) {
      graph.depsOut.set(inputId, []);
    }
    graph.depsOut.get(inputId)!.push(prop.id);
  }
  
  if (!graph.depsIn.has(prop.id)) {
    graph.depsIn.set(prop.id, []);
  }
  graph.depsIn.set(prop.id, prop.inputs);
  
  if (!graph.prodOut.has(prop.id)) {
    graph.prodOut.set(prop.id, []);
  }
  graph.prodOut.set(prop.id, prop.outputs);
}

export function createGraph(): Graph {
  return {
    cells: new Map(),
    props: new Map(),
    depsOut: new Map(),
    depsIn: new Map(),
    prodOut: new Map()
  };
}

export function getCell<T>(graph: Graph, id: Id): Cell<T> | undefined {
  return graph.cells.get(id) as Cell<T> | undefined;
}

export function getPropagator(graph: Graph, id: Id): Propagator | undefined {
  return graph.props.get(id);
}

export function getDependents(graph: Graph, cellId: Id): Id[] {
  return graph.depsOut.get(cellId) || [];
}

export function getInputs(graph: Graph, propId: Id): Id[] {
  return graph.depsIn.get(propId) || [];
}

export function getOutputs(graph: Graph, propId: Id): Id[] {
  return graph.prodOut.get(propId) || [];
}
