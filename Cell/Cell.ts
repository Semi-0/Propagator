import { set_global_state, get_global_parent } from "../Shared/PublicState";
import {type Propagator, internal_propagator_dispose} from "../Propagator/Propagator";
import { Reactive } from '../Shared/Reactivity/ReactiveEngine';
import type { ReactiveState } from '../Shared/Reactivity/ReactiveEngine';
import { Primitive_Relation, make_relation } from "../DataTypes/Relation";
import { is_nothing, the_nothing, is_contradiction, the_contradiction, get_base_value, is_layered_contradiction, the_disposed, is_disposed } from "./CellValue";
import { generic_merge } from "./Merge"
import { PublicStateCommand } from "../Shared/PublicState";
import { describe } from "../Helper/UI";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { process_contradictions } from "../Propagator/Search";
import { construct_better_set, identify_by, is_better_set, type BetterSet } from "generic-handler/built_in_generics/generic_better_set"
import { length, to_array } from "generic-handler/built_in_generics/generic_collection"
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { strongest_value } from "./StrongestValue";
import { cell_merge } from "./Merge";
import { match_args, register_predicate } from "generic-handler/Predicates";
import { curried_filter, curried_map, get_new_reference_count } from "../Helper/Helper";
import type { CellValue } from "./CellValue";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { construct_simple_generic_procedure, define_generic_procedure_handler, trace_generic_procedure } from "generic-handler/GenericProcedure";
import { alert_propagators, Current_Scheduler } from "../Shared/Scheduler/Scheduler";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { get_children, get_id, mark_for_disposal } from "../Shared/Generics";
import { pipe } from "fp-ts/lib/function";
import { toArray } from "fp-ts/lib/Map";
import { log_tracer } from "generic-handler/built_in_generics/generic_debugger";
import { strong } from "fp-ts";

export const general_contradiction =  construct_simple_generic_procedure("general_contradiction",
   1, (value: any) => {
    return is_contradiction(value) || is_layered_contradiction(value)
  })

export function handle_cell_contradiction<A>(cell: Cell<A>) {
  // get the support layer of the cell's strongest value, cast to any for type compatibility
  const support = get_support_layer_value(cell.getStrongest() as any);
  process_contradictions(construct_better_set([support]), cell);
}


export function not_handle_cell_contradiction<A>(cell: Cell<A>) {
  // do nothing
}

export var handle_contradiction = not_handle_cell_contradiction;

export function set_handle_contradiction<A>(func: (cell: Cell<A>) => void){
  // @ts-ignore
  handle_contradiction = func;
}


export interface Cell<A> {
  getRelation: () => Primitive_Relation;
  getContent: () => CellValue<A>;
  getStrongest: () => CellValue<A>
  getNeighbors: () => Map<string, interesetedNeighbor>; 
  update: (increment: CellValue<A>) => boolean;
  testContent: () => boolean;
  addNeighbor: (propagator: Propagator, interested_in: NeighborType[]) => void;
  removeNeighbor: (propagator: Propagator) => void;
  summarize: () => string;
  dispose: () => void;  // <-- new dispose method
}


export enum NeighborType{
  updated = "updated",
  content_tested = "content_tested",
  dependents = "dependents",
  received = "received",
  disposing = "disposing",
  neighbor_added = "neighbor_added",
  neighbor_removed = "neighbor_removed"
}

// how about hooks

export interface interesetedNeighbor{
  type: NeighborType[];
  propagator: Propagator
}

export const is_interested_neighbor = (prop: NeighborType) => (neighbor: interesetedNeighbor) => {
  return neighbor.type.includes(prop)
}

export const fetch_propagators_from_neighbors = (prop: NeighborType) => (neighbors: Map<string, interesetedNeighbor>) => {
  return pipe(
    neighbors, 
    to_array, 
    curried_filter(is_interested_neighbor(prop)),
    curried_map((n: interesetedNeighbor) => n.propagator)
  )
}

export const alert_interested_propagators = (neighbors: Map<string, interesetedNeighbor>, prop: NeighborType) => {
  return pipe(
    neighbors, 
    fetch_propagators_from_neighbors(prop),
    alert_propagators
  )
}




export function primitive_construct_cell<A>(name: string, id: string | null = null): Cell<A> {
  const relation = make_relation(name, get_global_parent(), id);
  const neighbors: Map<string, interesetedNeighbor> = new Map();
  // build two stateful streams for content and strongest
  // can be more performative to fine grain observe method args
  // but how?
  // TODO:
  // a better way foe cell disposal is to let cell remember its dependents
  // so disposing can be isolated totally from propagation 
  var content: CellValue<A> = the_nothing;
  var strongest: CellValue<A> = the_nothing;
  var active = true

  const handle_cell_contradiction = () => handle_contradiction(cell as Cell<A>);

  function set_content(new_content: CellValue<A>){
    content = new_content
  }

  function set_strongest(new_strongest: CellValue<A>){
    strongest = new_strongest
    alert_interested_propagators(neighbors, NeighborType.updated)
  }

  function test_content(): void {
    const new_strongest = strongest_value(content)

    if (is_equal(new_strongest, strongest)){
      alert_interested_propagators(neighbors, NeighborType.content_tested)
      // because new strongest doesn't change
      // so constant cell would not be updated on first update
    }
    else if (is_contradiction(new_strongest)){
      alert_interested_propagators(neighbors, NeighborType.content_tested)
      set_strongest(new_strongest)
      handle_cell_contradiction()

    }
    else{
      alert_interested_propagators(neighbors, NeighborType.content_tested)
      set_strongest(new_strongest)
    }
  }

  

  const cell = {
    getRelation: () => relation,
    getContent: () => content,
    getStrongest: () => strongest,
    getNeighbors: () => neighbors,
    testContent: test_content,
    update: (increment: CellValue<A> = the_nothing) => {
      if (active) {
        set_content(cell_merge(content, increment))
        test_content()
      }
    },

    addNeighbor: (propagator: Propagator, interested_in: NeighborType[]) => {
  
      neighbors.set(propagator.getRelation().get_id(), {
        type: interested_in,
        propagator: propagator
      });
      alert_interested_propagators(neighbors, NeighborType.neighbor_added)
      alert_interested_propagators(neighbors, NeighborType.updated)
    },
    removeNeighbor: (propagator: Propagator) => {
      neighbors.delete(get_id(propagator));
      alert_interested_propagators(neighbors, NeighborType.neighbor_removed)
    },
    summarize: () => {
      const name = relation.get_name();
      const strongVal = strongest;
      const contVal = content;

      const summarizeNeighbor = ([id, info]: [string, interesetedNeighbor], index: number) => {
        const interested = info?.type ?? [];
        const propagatorName = info?.propagator?.getName ? info.propagator.getName() : "<unknown propagator>";
        const interestedDisplay = interested.length ? ` [${interested.join(", ")}]` : "";
        return `    [${index}] ${propagatorName} (id: ${id})${interestedDisplay}`;
      };

      const neighborsSummary = neighbors.size === 0
        ? "    (none)"
        : Array.from(neighbors.entries()).map(summarizeNeighbor).join("\n");

      return [
        `CELL ${name}`,
        `  ID: ${relation.get_id()}`,
        `  STATUS: ${active ? "active" : "disposed"}`,
        `  STRONGEST: \n ${describe(strongVal)}`,
        `  CONTENT: \n ${describe(contVal)}`,
        `  NEIGHBORS (${neighbors.size}):`,
        neighborsSummary
      ].join("\n");
    },

    dispose: () => {
      // Set the cell to disposed value
      alert_interested_propagators(neighbors, NeighborType.disposing)
      content = the_disposed
      strongest = the_disposed
      active = false
      // Mark for cleanup
      // mark_for_disposal(cell.getRelation())
      // Trigger propagation to connected cells
      // mark_for_disposal(cell)
      // // but what about dependents?
      // neighbors.forEach(n => {
      //   mark_for_disposal(n.propagator)
      // })
    }
  };

  set_global_state(PublicStateCommand.ADD_CELL, cell)
  
// because i killed cell register in global state
// now premises cannot find cell anymore
// but i dont like this 
// its there a way for premises to locally track cell

  return cell as Cell<A>;
}

  // source layer triggers propagator to updates

export function construct_cell<A>(name: string, id: string | null = null): Cell<A> {
  return primitive_construct_cell<A>(name, id)
}



export const is_cell = register_predicate("is_cell", (a: any): a is Cell<any> => 
  a !== null && a !== undefined 
  && a.getRelation !== undefined 
  && a.getContent !== undefined 
  && a.getStrongest !== undefined 
  && a.getNeighbors !== undefined 
  && a.update !== undefined 
  && a.testContent !== undefined 
  && a.addNeighbor !== undefined 
  && a.removeNeighbor !== undefined 
  && a.summarize !== undefined 
  && a.dispose !== undefined
);
    
export function make_temp_cell(){
    let name = "#temp_cell_" + get_new_reference_count();
    return construct_cell<any>(name);
}


export const cell_neightbor_set = (cell: Cell<any>) => {
   
  return new Set(cell.getNeighbors().values().map(n => n.propagator));
}



export function add_cell_neighbour<A>(cell: Cell<A>, propagator: Propagator, interested_in: NeighborType[]){
  cell.addNeighbor(propagator, interested_in);
}

export function update_cell<A>(cell: Cell<A>, content: A){
  cell.update(content);
}

export function cell_strongest<A>(cell: Cell<A>): CellValue<A>{
  if (cell === undefined){
    throw new Error("Cell is undefined" + to_string(cell))
  }
  return cell.getStrongest();
} 

export function cell_content<A>(cell: Cell<A>): any{
  if (cell === undefined){
    throw new Error("Cell is undefined" + to_string(cell))
  }
  return cell.getContent();
}

export function cell_id<A>(cell: Cell<A>){
  if (is_cell(cell)) {
    return cell.getRelation().get_id();
  }
  else{
    throw new Error("Cell is not a cell" + to_string(cell))
  }
}

export function cell_children<A>(cell: Cell<A>){
  return cell.getRelation().get_children();
}

export function cell_level<A>(cell: Cell<A>){
  return cell.getRelation().get_level();
}

export function cell_name<A>(cell: Cell<A>){
  return cell.getRelation().get_name()
}

export function internal_cell_dispose(cell: Cell<any>){
  cell.dispose()
}

export function dispose_cell(cell: Cell<any>){
  mark_for_disposal(cell)
}

export const cell_strongest_base_value = compose(cell_strongest, get_base_value)

// Note: Generic procedure handlers for Cell are registered in Cell/CellGenerics.ts
// to avoid circular dependency issues

export function summarize_cells(cells: Cell<any>[], indent = "    "): string {
  if (!cells || cells.length === 0) {
    return `${indent}(none)`;
  }

  return cells
    .map((cell, index) => {
      if (!cell || typeof cell.summarize !== "function") {
        return `${indent}[${index}] <not a cell>`;
      }

      const summaryLines = cell.summarize().split("\n");
      const header = `${indent}[${index}] ${summaryLines[0] ?? "<empty>"}`;
      const body = summaryLines
        .slice(1)
        .map(line => `${indent}    ${line}`)
        .join("\n");

      return body ? `${header}\n${body}` : header;
    })
    .join("\n");
}


export const same_cell = (cell1: Cell<any>, cell2: Cell<any>) => {
  return cell1.getRelation().get_id() === cell2.getRelation().get_id()
}

define_generic_procedure_handler(to_string, match_args(is_cell), (cell: Cell<any>) => {
  return cell.summarize();
});

// Register identify_by handler for Cell
define_generic_procedure_handler(identify_by, match_args(is_cell), cell_id);

// Register get_id handler for Cell
define_generic_procedure_handler(get_id, match_args(is_cell), cell_id);

// Register get_children handler for Cell
define_generic_procedure_handler(get_children, match_args(is_cell), cell_children);


