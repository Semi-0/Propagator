import {  set_global_state,  get_global_parent, is_equal } from "../PublicState";
import { Propagator } from "../Propagator";
import { pipe } from 'fp-ts/function'
import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure";
import { combine_latest, compact_map,  filter,  map,  subscribe, type StatefulReactor } from "../Reactivity/Reactor";
import { Relation, make_relation } from "../DataTypes/Relation";
import { is_nothing, the_nothing, is_contradiction, the_contradiction, get_base_value } from "./CellValue";
import { generic_merge } from "./Merge"
import { PublicStateCommand } from "../PublicState";
import { describe } from "../ui";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { process_contradictions } from "../BuiltInProps";
import { construct_better_set, map_to_new_set, type BetterSet } from "generic-handler/built_in_generics/generic_better_set"
import { compose } from "generic-handler/built_in_generics/generic_combinator";
import { scheduled_reactive_state } from "../Scheduler";
import { identify_strint_set } from "../helper";
import { strongest_value } from "./StrongestValue";
import { cell_merge } from "./Merge";

// TO ALLOW SPECIFIC TYPE OF VALUE BEEN PROPAGATED
// WE NEED TO 1. DEFINE HOW THE OLD VALUE MERGE WITH THE NEW ONE
// 2. DEFINE WHAT IS THE STRONGEST VALUE FOR THIS SPECIFIC KIND OF DATASET
// 3. (OPTIONAL) WHAT TO DO WHEN CONTRADICTON IS FOUND


export const general_contradiction = construct_simple_generic_procedure("general_contradiction", 1, (a: any) => {
  return false;
})


export function handle_cell_contradiction(cell: Cell) {
  const nogood = pipe(
    cell,
    cell_strongest_value,
    get_support_layer_value,
    (value) => map_to_new_set(
      value,
      (elt: string) => construct_better_set([elt], (elt: string) => elt),
      (elt: BetterSet<string>) => identify_strint_set(elt)
    )
  );

  process_contradictions(nogood, cell)
}

export const handle_contradiction = handle_cell_contradiction;


export class Cell{
  private relation : Relation 
  private neighbors : Map<string, Propagator> = new Map();
  private content : StatefulReactor<any> = scheduled_reactive_state(the_nothing);
  private strongest : StatefulReactor<any> = scheduled_reactive_state(the_nothing);

  constructor(name: string){
    this.relation = make_relation(name, get_global_parent());

    pipe(
      this.content,
      map((content: any) => this.testContent(content, this.strongest.get_value())),
      filter((content: any) => !is_equal(content, this.strongest.get_value())),
      subscribe((content: any) => this.strongest.next(content))
    )
   
    set_global_state(PublicStateCommand.ADD_CELL, this);
    set_global_state(PublicStateCommand.ADD_CHILD, this.relation);
  }

  observe_update(observer:(cellValues: any) => void){
    combine_latest(this.content, this.strongest).subscribe(observer);
  }

  getRelation(){
    return this.relation;
  }

  getContent(){
    return this.content;
  } 

  getStrongest(){
    return this.strongest;
  } 


  getNeighbors(){
    return this.neighbors;
  }

  addContent(increment:any){
 
    this.content.next(cell_merge(this.content.get_value(), increment));
  }


  testContent(content: any, strongest: any): any | null {
    const _strongest = strongest_value(content);
    if (general_contradiction(_strongest)){
      console.log("contradiction", content, strongest)
      handle_contradiction(this);
      return _strongest;
    }
    else {
      return _strongest
    }
  }

  force_update(){
    this.content.next(this.content.get_value());
  }

  addNeighbor(propagator: Propagator){
    this.neighbors.set(propagator.getRelation().get_id(), propagator);
  }

  summarize(){
    const name = this.relation.get_name();
    const strongest = this.strongest.get_value();
    const content = this.content.get_value();
    return `name: ${name}\nstrongest: ${describe(strongest)}\ncontent: ${describe(content)}`;
  }
}




export function test_cell_content(cell: Cell){
  return cell.force_update();
}

export function add_cell_neighbour(cell: Cell, propagator: Propagator){
  cell.addNeighbor(propagator);
}

export function add_cell_content(cell: Cell, content: any){
  cell.addContent(content);
}

export function cell_strongest(cell: Cell){
  return cell.getStrongest();
}

export function cell_id(cell: Cell){
  if (cell === undefined){
    return "undefined";
  }

  return cell.getRelation().get_id();
}

export function cell_strongest_value(cell: Cell){
  return cell.getStrongest().get_value();
}

export const cell_strongest_base_value = compose(cell_strongest_value, get_base_value)
