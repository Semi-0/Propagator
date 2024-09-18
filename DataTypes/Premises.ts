import { add_cell_content, Cell, test_cell_content } from "../Cell/Cell";
import { set_global_state } from "../PublicState";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import type { Layer } from "sando-layer/Basic/Layer";
import { get_support_layer_value, support_by } from "sando-layer/Specified/SupportLayer";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { for_each } from "../helper";
import { add, find } from "generic-handler/built_in_generics/generic_better_set";
import { PublicStateCommand } from "../PublicState";
import { Relation } from "./Relation";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { v4 as uuidv4 } from 'uuid';
import { map } from "generic-handler/built_in_generics/generic_array_operation"
import { construct_better_set } from "generic-handler/built_in_generics/generic_better_set"
export enum BeliefState {
    Believed,
    NotBelieved,
}


 class PremiseMetaData {
    name : string;
    belief_state: BeliefState = BeliefState.Believed; 
    no_goods: BetterSet<any> = construct_better_set<any>([], (item) => item);
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
    }

    set_not_believed(){
        this.set_belief_state(BeliefState.NotBelieved);
    } 

    wake_up_roots(){

        set_global_state(PublicStateCommand.SET_CELLS, (cell: Cell) => {
            test_cell_content(cell);
        });
        
       //TODO:  alert amb propagator
    }

    get_roots(): BetterSet<any>{
        return this.roots;
    }

    add_root(root: any){
        this.roots = add(this.roots, root);
    } 

    get_no_goods(): BetterSet<any>{
        return this.no_goods;
    }

    set_no_goods(no_goods: BetterSet<any>){
        this.no_goods = no_goods;
    } 

    summarize(){
        return `${this.name}: ${this.belief_state}`;
    }

}

// TODO: maybe using a map could making altering quicker 
export var premises_list : Map<string, PremiseMetaData> = new Map(); 

export function clear_premises(){
    premises_list.clear();  
}

export function register_premise(name: string, root: any): PremiseMetaData{
    const premise = new PremiseMetaData(name);
    premise.add_root(root);
    premises_list.set(name, premise);
    return premise;
}

export function is_premises(name: string): boolean{
    // THIS IS QUITE SLOW 
    return premises_list.has(name); 
}

export function _premises_metadata(name: string): PremiseMetaData{
    const premise = premises_list.get(name);
    if(premise){
        return premise;
    }
    else{
        throw new Error(name + " is not a premise");
    }
} 

export function is_premises_in(name: string): boolean{
    return _premises_metadata(name).is_believed();
} 

export function is_premises_out(name: string): boolean{
    return !_premises_metadata(name).is_believed();
} 

export function mark_premise_in(name: string){
    _premises_metadata(name).set_believed();
} 

export function mark_premise_out(name: string){
    _premises_metadata(name).set_not_believed();
} 


export function all_premises_in(set: BetterSet<LayeredObject>) {
    for_each(set, (obj: LayeredObject) => {
        const support = get_support_layer_value(obj);
        if(support){
            for_each(support, (premise: PremiseMetaData) => {
                mark_premise_in(premise.get_name());
            });
        }
    });  
}

export function is_all_premises_in(set: BetterSet<string>): boolean{
    return find(set, (premise: string) => is_premises_out(premise)) == undefined;
}

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
    get_peers(): Hypothesis<A>[];
    set_peers(peers: Hypothesis<A>[]): void;
    get_id(): string;
    summarize(): string;
}

// this function use self as premises as well as cell content value
// but based on my design of premises storage is based on string name,  
// one possible approach is to give each hypothesisa unique name 
// but then it would be hard to use the hypothesis object
// so here i use a store for linking id with hypothesis object
var hypotheticals_store : Map<string, Hypothesis<any>> = new Map();

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

export function make_hypotheticals<A>(output: Cell, values: A[]): string[]{
    const peers = map(values, (value: A) => _make_hypothetical(output, value));
    for_each(peers, (peer: Hypothesis<A>) => {
        peer.set_peers(peers);
    });
    return peers;
}

function _make_hypothetical<A>(output: Cell, value: A): string {
    // TODO: extend to_string with generic
    // TODO: initialize cell with contradiction
    const relation = new Relation("hypothetical:" + to_string(value), output);
    var peers: Hypothesis<A>[] = [];
    var id = uuidv4();

    function get_relations(): Relation[]{
        return [relation];
    }

    function get_output(): Cell{
        return output;
    }

    function get_peers(): Hypothesis<A>[]{
        return peers;
    }

    function set_peers(_peers: Hypothesis<A>[]): void{
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
        get_peers,
        set_peers,
        summarize,
        get_id,
    }

    set_global_state(PublicStateCommand.ADD_CHILD, self, output)
    register_hypothesis(id, self)
    register_premise(id, output);
    add_cell_content(output, support_by(value, id));
    return id;       
}


