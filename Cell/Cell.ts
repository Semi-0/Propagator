import { set_global_state, get_global_parent, deep_equal } from "../Shared/PublicState";
import { type Propagator } from "../Propagator/Propagator";
import { pipe } from 'fp-ts/function'
import { construct_stateful_reactor, filter, map, subscribe, type StatefulReactor } from "../Shared/Reactivity/Reactor";
import { Primitive_Relation, make_relation } from "../DataTypes/Relation";
import { is_nothing, the_nothing, is_contradiction, the_contradiction, get_base_value, is_layered_contradiction } from "./CellValue";
import { generic_merge } from "./Merge"
import { PublicStateCommand } from "../Shared/PublicState";
import { describe } from "../Helper/UI";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { process_contradictions } from "../Propagator/Search";
import { construct_better_set, make_better_set, map_to_new_set, set_get_length, type BetterSet } from "generic-handler/built_in_generics/generic_better_set"
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { scheduled_reactive_state } from "../Shared/Reactivity/Scheduler";
import { strongest_value } from "./StrongestValue";
import { cell_merge } from "./Merge";
import { match_args, register_predicate } from "generic-handler/Predicates";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { get_new_reference_count } from "../Helper/Helper";
import type { CellValue } from "./CellValue";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";

export const general_contradiction =  construct_simple_generic_procedure("general_contradiction",
   1, (value: any) => {
    return is_contradiction(value) || is_layered_contradiction(value)
  })



export function handle_cell_contradiction<A>(cell: Cell<A>) {
  const nogoods = pipe(
    cell,
    cell_strongest_value,
    get_support_layer_value,
  );
  
  process_contradictions(make_better_set([nogoods]), cell)
}

export var handle_contradiction = handle_cell_contradiction;

export function set_handle_contradiction<A>(func: (cell: Cell<A>) => void){
  // @ts-ignore
  handle_contradiction = func;
}


export interface Cell<A> {
  getRelation: () => Primitive_Relation;
  getContent: () => StatefulReactor<CellValue<A>>;
  getStrongest: () => StatefulReactor<CellValue<A>>;
  getNeighbors: () => Map<string, Propagator>;
  addContent: (increment: CellValue<A>) => void;
  force_update: () => void;
  addNeighbor: (propagator: Propagator) => void;
  summarize: () => string;
  observe_update: (observer: (cellValues: A) => void) => void;
  dispose: () => void;  // <-- new dispose method
}

function testContent(content: any, strongest: any): any | null {
 
  const _strongest = strongest_value(content);

  if (general_contradiction(_strongest)){
    return _strongest;
  }
  else {
    return _strongest
  }
}




export function cell_constructor<A>(
      value: any, 
      strongest_value: (x: any) => any, 
      cell_merge: (content: any, increment: any) => any
  ){

  return (name: string, id: string | null = null) => {
      const relation = make_relation(name, get_global_parent(), id);
      const neighbors: Map<string, Propagator> = new Map();
      // @ts-ignore
      const content: StatefulReactor<CellValue<A>> = scheduled_reactive_state(value);
      // @ts-ignore
      const strongest: StatefulReactor<CellValue<A>> = scheduled_reactive_state(value);
      const handle_cell_contradiction = () => {
        handle_contradiction(cell)
      }

      pipe(
        content,
        map((content: any) => strongest_value(content)),
        filter((content: any) => !is_equal(content, strongest.get_value())),
        subscribe((content: any) => {
          strongest.next(content)
        })
      )

      strongest.subscribe((v: any) => {
        if (general_contradiction(v)){
          handle_cell_contradiction()
        }
      })



      const cell: Cell<A> = {
        getRelation: () => relation,
        getContent: () => content,
        getStrongest: () => strongest,
        getNeighbors: () => neighbors,
        addContent: (increment: CellValue<A>) => {
          const result = cell_merge(content.get_value(), increment);
         
          content.next(result);
        },
        force_update: () => {
          content.next(content.get_value());
        },
        addNeighbor: (propagator: Propagator) => {
          neighbors.set(propagator.getRelation().get_id(), propagator);
          strongest.next(strongest.get_value());
        },
        summarize: () => {
          const name = relation.get_name();
          const strongestValue = strongest.get_value();
          const contentValue = content.get_value();
          return `name: ${name}\nstrongest: ${describe(strongestValue)}\ncontent: ${describe(contentValue)}`;
        },
        observe_update: (observer: (cellValues: any) => void) => {
          strongest.subscribe(observer);
        },
        dispose: () => {
          content.dispose();
          strongest.dispose();
          neighbors.clear();
        }
      };

      set_global_state(PublicStateCommand.ADD_CELL, cell);
      set_global_state(PublicStateCommand.ADD_CHILD, relation);
      return cell; 
  }
}


export function construct_cell<A>(name: string): Cell<A> {
  return cell_constructor<A>(the_nothing, strongest_value, cell_merge)(name)
}

export function constant_cell<A>(value: A, name: string, id: string | null = null): Cell<A> {
  return cell_constructor<A>(value, strongest_value, cell_merge)(name, id)
}




export const is_cell = register_predicate("is_cell", (a: any): a is Cell<any> => 
  typeof a === 'object' && a !== null &&
  'getRelation' in a && 'getContent' in a && 'getStrongest' in a &&
  'getNeighbors' in a && 'addContent' in a && 'testContent' in a &&
  'force_update' in a && 'addNeighbor' in a && 'summarize' in a &&
  'observe_update' in a && 'dispose' in a
)

define_generic_procedure_handler(to_string, match_args(is_cell), (cell: Cell<any>) => cell_id(cell))

    
export function make_temp_cell(){
    let name = "#temp_cell_" + get_new_reference_count();
    return construct_cell(name);
}

export function add_cell_neighbour<A>(cell: Cell<A>, propagator: Propagator){
  cell.addNeighbor(propagator);
}

export function add_cell_content<A>(cell: Cell<A>, content: A){
  cell.addContent(content);
}

export function cell_strongest<A>(cell: Cell<A>){
  return cell.getStrongest();
}

export function cell_content<A>(cell: Cell<A>){
  return cell.getContent();
}

export function cell_id<A>(cell: Cell<A>){
  if (cell === undefined){
    return "undefined";
  }

  return cell.getRelation().get_id();
}


export function cell_subscribe<A>(cell: Cell<A>, observer: (cellValues: A) => void){
  cell.observe_update(observer);
}

export function cell_name<A>(cell: Cell<A>){
  return cell.getRelation().get_name()
}

export function cell_strongest_value<A>(cell: Cell<A>){
  return cell.getStrongest().get_value();
}

export function cell_content_value<A>(cell: Cell<A>){
  return cell.getContent().get_value();
}

export const cell_strongest_base_value = compose(cell_strongest_value, get_base_value)
