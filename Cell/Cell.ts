import { set_global_state, get_global_parent } from "../Shared/PublicState";
import {type Propagator, propagator_dispose} from "../Propagator/Propagator";
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
import { length } from "generic-handler/built_in_generics/generic_collection"
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { strongest_value } from "./StrongestValue";
import { cell_merge } from "./Merge";
import { match_args, register_predicate } from "generic-handler/Predicates";
import { get_new_reference_count } from "../Helper/Helper";
import type { CellValue } from "./CellValue";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { Current_Scheduler } from "../Shared/Scheduler/Scheduler";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { get_children, get_id, mark_for_disposal } from "../Shared/Generics";

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
  getNeighbors: () => Map<string, Propagator>;
  addContent: (increment: CellValue<A>) => void;
  testContent: () => void;
  addNeighbor: (propagator: Propagator) => void;
  summarize: () => string;
  dispose: () => void;  // <-- new dispose method
}


// how about hooks
export function primitive_construct_cell<A>(initial: CellValue<A>, name: string, id: string | null = null): Cell<A> {
    const relation = make_relation(name, get_global_parent(), id);
    const neighbors: Map<string, Propagator> = new Map();
    // build two stateful streams for content and strongest
    var content: CellValue<A> = initial;
    var strongest: CellValue<A> = initial;
    var active = true
    const handle_cell_contradiction = () => handle_contradiction(cell);

    function test_content(){
      const new_strongest = strongest_value(content)
      if (is_equal(new_strongest, strongest)){
        // do nothing
      }
      else if (is_contradiction(new_strongest)){
        strongest = new_strongest
        handle_cell_contradiction()
      }
      else{
        strongest = new_strongest
        Current_Scheduler.alert_propagators(Array.from(neighbors.values()))
      }
    }

    

    const cell: Cell<A> = {
      getRelation: () => relation,
      getContent: () => content,
      getStrongest: () => strongest,
      getNeighbors: () => neighbors,
      testContent: test_content,
      addContent: (increment: CellValue<A>) => {
        if (active) {
          content = cell_merge(content, increment)
          test_content()
        }
      },

      addNeighbor: (propagator: Propagator) => {
        neighbors.set(propagator.getRelation().get_id(), propagator);
        Current_Scheduler.alert_propagators(Array.from(neighbors.values()))
      },
      summarize: () => {
        const name = relation.get_name();
        const strongVal = strongest
        const contVal = content
        return `name: ${name}\nstrongest: ${to_string(strongVal)}\ncontent: ${describe(contVal)}`;
      },

      dispose: () => {
        // Set the cell to disposed value
        content = the_disposed
        strongest = the_disposed
        active = false
        // Mark for cleanup
        mark_for_disposal(cell.getRelation())
        // Trigger propagation to connected cells

        // but what about dependents?
        neighbors.forEach(propagator => {
          propagator.activate()
        })
      }
    };

    set_global_state(PublicStateCommand.ADD_CELL, cell);
    set_global_state(PublicStateCommand.ADD_CHILD, relation);
    return cell;
  }


export function construct_cell<A>(name: string): Cell<A> {
  return primitive_construct_cell<A>(the_nothing, name)
}

export function constant_cell<A>(value: A, name: string, id: string | null = null): Cell<A> {
  return primitive_construct_cell<A>(value, name, id)
}

export const is_cell = register_predicate("is_cell", (a: any): a is Cell<any> => 
  a !== null && a !== undefined 
  && a.getRelation !== undefined 
  && a.getContent !== undefined 
  && a.getStrongest !== undefined 
  && a.getNeighbors !== undefined 
  && a.addContent !== undefined 
  && a.testContent !== undefined 
  && a.addNeighbor !== undefined 
  && a.summarize !== undefined 
  && a.dispose !== undefined
);
    
export function make_temp_cell(){
    let name = "#temp_cell_" + get_new_reference_count();
    return primitive_construct_cell(the_nothing, name);
}

export function add_cell_neighbour<A>(cell: Cell<A>, propagator: Propagator){
  cell.addNeighbor(propagator);
}

export function add_cell_content<A>(cell: Cell<A>, content: A){
  cell.addContent(content);
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

export function cell_dispose(cell: Cell<any>){
  cell.dispose();
}

export const cell_strongest_base_value = compose(cell_strongest, get_base_value)

define_generic_procedure_handler(to_string, match_args(is_cell), (cell: Cell<any>) => {
  return cell.summarize()
})

define_generic_procedure_handler(identify_by, match_args(is_cell), cell_id)


define_generic_procedure_handler(get_id, match_args(is_cell), cell_id)

define_generic_procedure_handler(get_children, match_args(is_cell), cell_children)


export function summarize_cells(cells: Cell<any>[]): string{
    return cells.reduce((acc, cell) => acc + "/n" + to_string(cell), "")
}

