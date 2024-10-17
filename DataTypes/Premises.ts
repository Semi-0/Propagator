import { add_cell_content, Cell, test_cell_content } from "../Cell/Cell";
import { set_global_state } from "../PublicState";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import type { Layer } from "sando-layer/Basic/Layer";
import { get_support_layer_value, support_by } from "sando-layer/Specified/SupportLayer";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { make_better_set, set_add_item, set_equal, set_map } from "generic-handler/built_in_generics/generic_better_set";
import { set_every, set_for_each as for_each } from "generic-handler/built_in_generics/generic_better_set";
import { PublicStateCommand } from "../PublicState";
import { Relation } from "./Relation";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { v4 as uuidv4 } from 'uuid';
import { map } from "generic-handler/built_in_generics/generic_array_operation"
import { construct_better_set } from "generic-handler/built_in_generics/generic_better_set"

import { construct_reactor, construct_readonly_reactor, construct_stateful_reactor, type Reactor, type ReadOnlyReactor, type StandardReactor, type StatefulReactor } from "../Reactivity/Reactor";
export enum BeliefState {
    Believed,
    NotBelieved,
}


 class PremiseMetaData {
    name : string;
    belief_state: BeliefState = BeliefState.Believed; 
    no_goods: BetterSet<BetterSet<string>> = construct_better_set<BetterSet<string>>([], (item) => JSON.stringify(item));
    roots: BetterSet<any> = construct_better_set<any>([], (item) => item);

    constructor(name: string){
        this.name = name;
    }

    get_name(): string{
        return this.name;
    } 

    is_believed(): boolean{
        return this.belief_state == BeliefState.Believed;
    }

    set_belief_state(state: BeliefState){
        this.belief_state = state;
    } 

    set_believed(){
        this.set_belief_state(BeliefState.Believed);
        this.wake_up_roots();
    }

    set_not_believed(){
        this.set_belief_state(BeliefState.NotBelieved);
        this.wake_up_roots();
    } 

    wake_up_roots(){
        premises_has_changed.next(true);
       //TODO:  alert amb propagator
    }

    get_roots(): BetterSet<any>{
        return this.roots;
    }

    add_root(root: any){
        this.roots = set_add_item(this.roots, root);
    } 

    get_no_goods(): BetterSet<BetterSet<string>>{
        return this.no_goods;
    }

    set_no_goods(no_goods: BetterSet<BetterSet<string>>){
        this.no_goods = no_goods;
    } 

    summarize(){
        return `${this.name}: ${this.belief_state}`;
    }

}

// TODO: maybe using a map could making altering quicker 
export var premises_list : StatefulReactor<Map<string, PremiseMetaData>> = construct_stateful_reactor(new Map()); 
var premises_has_changed: StandardReactor<boolean> = construct_reactor();


export function clean_premises_store(){
    set_premises_list( (m) => {return new Map()})
}

export function observe_premises_has_changed(): ReadOnlyReactor<boolean>{
    return construct_readonly_reactor(premises_has_changed);
}

export function set_premises_list(f: (map: Map<string, PremiseMetaData>) => Map<string, PremiseMetaData>){
    premises_list.next(f(premises_list.get_value()));
}

export function has_name(name: string): boolean{
    return premises_list.get_value().has(name);
}

export function get_metadata(name: string): PremiseMetaData{
    return premises_list.get_value().get(name);
}

export function clear_premises(){
    premises_list.next(new Map());  
}

export function register_premise(name: string, root: any): PremiseMetaData{
    const premise = new PremiseMetaData(name);
    premise.add_root(root);

    set_premises_list((map) => {
        map.set(name, premise);
        return map;
    });

    return premise;
}

export function is_premises(name: string): boolean{
    // THIS IS QUITE SLOW 
    return has_name(name); 
}

export function _premises_metadata(name: string): PremiseMetaData{
    const premise = get_metadata(name);
    if(premise){
        return premise;
    }
    else{
        throw new Error(name + " is not a premise");
    }
} 

export function is_premise_in(name: string): boolean{
    return _premises_metadata(name).is_believed();
}

export function is_premise_out(name: string): boolean{
    return !_premises_metadata(name).is_believed();
}

export function is_premises_in(names: BetterSet<string>): boolean{
    return set_every(names, (name: string) => {
        return is_premise_in(name)
    });
} 

export function is_premises_out(names: BetterSet<string>): boolean{
    return !is_premises_in(names);
} 

export function mark_premise_in(name: string){
    _premises_metadata(name).set_believed();
} 

export function mark_premise_out(name: string){
    _premises_metadata(name).set_not_believed();
} 


// export function all_premises_in(set: BetterSet<BetterSet<string>>) {
//     for_each(set, (obj: LayeredObject) => {
        
//     });  
// }


export function premises_nogoods(name: string): BetterSet<any>{
    return _premises_metadata(name).get_no_goods();
} 

export function set_premises_nogoods(name: string, nogoods: BetterSet<any>){
    _premises_metadata(name).set_no_goods(nogoods);
} 

// TODO: adjoin support with subsumption???

// TODO: hypothese


export interface Hypothesis<A>{
    get_relations(): Relation[];
    get_output(): Cell;
    get_peers(): BetterSet<string>;
    set_peers(peers: BetterSet<string>): void;
    get_id(): string;
    summarize(): string;
}

// this function use self as premises as well as cell content value
// but based on my design of premises storage is based on string name,  
// one possible approach is to give each hypothesisa unique name 
// but then it would be hard to use the hypothesis object
// so here i use a store for linking id with hypothesis object
var hypotheticals_store : Map<string, Hypothesis<any>> = new Map();

export function clean_hypothetical_store(){
    hypotheticals_store = new Map()
}

export function register_hypothesis(id: string, hypothesis: Hypothesis<any>){
    hypotheticals_store.set(id, hypothesis);
}

export function is_hypothetical(id: string): boolean{
    return hypotheticals_store.has(id);
}

export function _hypothesis_metadata(id: string): Hypothesis<any> | undefined {
    const hypothesis = hypotheticals_store.get(id);
    if(hypothesis){
        return hypothesis;
    }
    else{
        return undefined;
    }
}

export function make_hypotheticals<A>(output: Cell, values: BetterSet<A>): BetterSet<string>{
    const peers = set_map(values, (value: A) => _make_hypothetical(output, value));

    for_each( (peer: string) => {
        const peer_metadata = _hypothesis_metadata(peer);
        if(peer_metadata){
            _hypothesis_metadata(peer)?.set_peers(peers);
        }
    }, peers);
    return peers;
}

function _make_hypothetical<A>(output: Cell, value: A): string {
    // ADD VALUE SUPPORT BY HYPOTHESIS TO CELL
    // IN SHORT EACH HYPOTHESIS BECOMES COMBINATION OF VALUES
    // TODO: extend to_string with generic
    // TODO: initialize cell with contradiction
    const relation = new Relation("hypothetical:" + to_string(value), output);
    var peers: BetterSet<string> = make_better_set<string>([]);
    var id = uuidv4();

    function get_relations(): Relation[]{
        return [relation];
    }

    function get_output(): Cell{
        return output;
    }

    function get_peers_tags(): BetterSet<string>{
        return peers;
    }

    function set_peers_from_tags(_peers: BetterSet<string>): void{
        peers = _peers;
    }
    
    function summarize(): string{
        return "hypothetical:" + to_string(value);
    }

    function get_id(): string{
        return id;
    }

    const self = {
        get_relations,
        get_output,
        get_peers: get_peers_tags,
        set_peers: set_peers_from_tags,
        summarize,
        get_id,
    }

    set_global_state(PublicStateCommand.ADD_CHILD, relation, output)
    register_hypothesis(id, self)
    register_premise(id, output);
    // console.log("add_cell_content",  support_by(value, id))
    add_cell_content(output, support_by(value, id));
    return id;       
}


