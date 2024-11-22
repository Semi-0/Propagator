import { set_global_state, get_global_parent, deep_equal } from "../Shared/PublicState";
import { type Propagator } from "../Propagator/Propagator";
import { pipe } from 'fp-ts/function'
import { construct_stateful_reactor, filter, map, subscribe, type StatefulReactor } from "../Shared/Reactivity/Reactor";
import { Relation, make_relation } from "../DataTypes/Relation";
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
import { tap } from "../Shared/Reactivity/Reactor";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { is_string } from "generic-handler/built_in_generics/generic_predicates";

export const general_contradiction = is_layered_contradiction

export function handle_cell_contradiction(cell: Cell) {
  const nogoods = pipe(
    cell,
    cell_strongest_value,
    get_support_layer_value,
  );
  
  process_contradictions(make_better_set([nogoods]), cell)
}

export const handle_contradiction = handle_cell_contradiction;

export interface Cell {
  getRelation: () => Relation;
  getContent: () => StatefulReactor<any>;
  getStrongest: () => StatefulReactor<any>;
  getNeighbors: () => Map<string, Propagator>;
  addContent: (increment: any) => void;
  testContent: (content: any, strongest: any) => any | null;
  force_update: () => void;
  addNeighbor: (propagator: Propagator) => void;
  summarize: () => string;
  observe_update: (observer: (cellValues: any) => void) => void;
}

export function construct_cell(name: string): Cell {
  const relation = make_relation(name, get_global_parent());
  const neighbors: Map<string, Propagator> = new Map();
  const content: StatefulReactor<any> = scheduled_reactive_state(the_nothing);
  const strongest: StatefulReactor<any> = scheduled_reactive_state(the_nothing);

  pipe(
    content,
    map((content: any) => testContent(content, strongest.get_value())),
    filter((content: any) => !deep_equal(content, strongest.get_value())),
    subscribe((content: any) => {
      strongest.next(content)
    })
  )

  strongest.subscribe((v: any) => {
    if (general_contradiction(v)){
      handle_cell_contradiction(cell)
    }
  })

  function testContent(content: any, strongest: any): any | null {
    const _strongest = strongest_value(content);
    if (general_contradiction(_strongest)){
      return _strongest;
    }
    else {
      return _strongest
    }
  }

  const cell: Cell = {
    getRelation: () => relation,
    getContent: () => content,
    getStrongest: () => strongest,
    getNeighbors: () => neighbors,
    addContent: (increment: any) => {
      const result = cell_merge(content.get_value(), increment);
      content.next(result);
    },
    testContent,
    force_update: () => {
      content.next(content.get_value());
    },
    addNeighbor: (propagator: Propagator) => {
      neighbors.set(propagator.getRelation().get_id(), propagator);
    },
    summarize: () => {
      const name = relation.get_name();
      const strongestValue = strongest.get_value();
      const contentValue = content.get_value();
      return `name: ${name}\nstrongest: ${describe(strongestValue)}\ncontent: ${describe(contentValue)}`;
    },
    observe_update: (observer: (cellValues: any) => void) => {
      strongest.subscribe(observer);
    }
  };

  set_global_state(PublicStateCommand.ADD_CELL, cell);
  set_global_state(PublicStateCommand.ADD_CHILD, relation);
  return cell;
}

export const is_cell = register_predicate("is_cell", (a: any): a is Cell => 
  typeof a === 'object' && a !== null &&
  'getRelation' in a && 'getContent' in a && 'getStrongest' in a &&
  'getNeighbors' in a && 'addContent' in a && 'testContent' in a &&
  'force_update' in a && 'addNeighbor' in a && 'summarize' in a &&
  'observe_update' in a
)

define_generic_procedure_handler(to_string, match_args(is_cell), (cell: Cell) => cell.summarize())

export function add_cell_neighbour(cell: Cell, propagator: Propagator){
  cell.addNeighbor(propagator);
}

export function add_cell_content(cell: Cell, content: any){
  cell.addContent(content);
}

export function cell_strongest(cell: Cell){
  return cell.getStrongest();
}

export function cell_content(cell: Cell){
  return cell.getContent();
}

export function cell_id(cell: Cell){
  if (cell === undefined){
    return "undefined";
  }

  return cell.getRelation().get_id();
}

export function cell_name(cell: Cell){
  return cell.getRelation().get_name()
}

export function cell_strongest_value(cell: Cell){
  return cell.getStrongest().get_value();
}

export function cell_content_value(cell: Cell){
  return cell.getContent().get_value();
}

export const cell_strongest_base_value = compose(cell_strongest_value, get_base_value)
