import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { construct_better_set } from "generic-handler/built_in_generics/generic_better_set";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { add_item } from "generic-handler/built_in_generics/generic_collection";


var track_premises_changed: boolean = false;

export enum BeliefState {
    Believed,
    NotBelieved,
}

export class PremiseMetaData {
    name : string;
    belief_state: BeliefState = BeliefState.Believed; 
    no_goods: BetterSet<BetterSet<string>> = construct_better_set<BetterSet<string>>([]);
    roots: BetterSet<any> = construct_better_set<any>([]);

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
        this.wake_up_roots();
    } 

    set_believed(){
        if(track_premises_changed){
           console.log("premises:", this.name, "is believed")
           console.log("previous belief state", this.belief_state)
        }
        if (this.belief_state == BeliefState.NotBelieved){
            if(track_premises_changed){
                console.log("setting belief state to believed")
            }
            this.set_belief_state(BeliefState.Believed);
        }
  
    }

    set_not_believed(){
        if(track_premises_changed){
            console.log("premises:", this.name, "is not believed")
            console.log("previous belief state", this.belief_state)
        }
        if (this.belief_state == BeliefState.Believed){
            if(track_premises_changed){
                console.log("setting belief state to not believed")
            }
            this.set_belief_state(BeliefState.NotBelieved);
        }
    } 

    wake_up_roots(){
          // TODO: force update propagators
        console.log("waking up roots", this.name)
        console.log("alerting all ambs")
       set_global_state(PublicStateCommand.ALERT_ALL_AMBS)

       console.log("forcing update all cells")
       //TODO:  alert amb propagatorm
        // TODO: this can be even simplified with define relationship between premises cells and ambs
        // if add content is scheduled cannot make sure amb is only notified after all the current content has been all propagated
       set_global_state(PublicStateCommand.FORCE_UPDATE_ALL_CELLS)
        

      
    }

    get_roots(): BetterSet<any>{
        return this.roots;
    }

    add_root(root: any){
        this.roots = add_item(this.roots, root);
    } 

    get_no_goods(): BetterSet<BetterSet<string>>{
        return this.no_goods;
    }

    set_no_goods(no_goods: BetterSet<BetterSet<string>>){

        // TODO: no goods should be multi dimensional set
 
        this.no_goods = no_goods;
    } 

    summarize(){
        return `${this.name}: ${this.belief_state}`;
    }

}

export function track_premise(){
    track_premises_changed = true;
}