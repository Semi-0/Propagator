import { primitive_propagator, constraint_propagator, type Propagator, construct_propagator } from "./Propagator"; 
import { multiply, divide } from "../AdvanceReactivity/Generics/GenericArith";
import { type Cell, cell_name } from "../Cell/Cell";
import { is_hypothetical, is_premise_in, is_premises_in, make_hypotheticals, mark_premise_in, mark_premise_out, observe_premises_has_changed, premises_nogoods, set_premises_nogoods } from "../DataTypes/Premises";
import { first, for_each, second } from "../Helper/Helper";
import { set_add_item, construct_better_set,  set_for_each, set_merge, set_remove, map_to_new_set , set_filter, set_get_length, to_array, set_find,  set_remove_item, set_larger_than, set_some, map_to_same_set, make_better_set, set_map, set_flat_map, set_union, is_better_set} from "generic-handler/built_in_generics/generic_better_set";
import { set_reduce_right } from "generic-handler/built_in_generics/generic_better_set";
import { PublicStateCommand, set_global_state } from "../Shared/PublicState";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { pipe } from "fp-ts/lib/function";
import { merge, tap, type Reactor } from "../Shared/Reactivity/Reactor";
import { map } from "../Shared/Reactivity/Reactor";
import { add, subtract} from "../AdvanceReactivity/Generics/GenericArith";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";

var log_amb_choose = false; 
var log_process_contradictions = false;
var log_nogoods = false;

export function configure_log_process_contradictions(debug: boolean){
    log_process_contradictions = debug;
} 

export function configure_log_amb_choose(debug: boolean){
    log_amb_choose = debug;
}

export function configure_log_nogoods(debug: boolean){
    log_nogoods = debug;
}


export function configure_debug_search(debug: boolean){
    configure_log_process_contradictions(debug);
    configure_log_amb_choose(debug);
    configure_log_nogoods(debug);
}


function construct_amb_reactor(f: () => void): () => Reactor<boolean>{
  return () =>  tap<boolean>(f)(observe_premises_has_changed() as Reactor<boolean>)
}

// TODO: this need be able to work only if the support set can be propagated first!!!
export function binary_amb(cell: Cell<boolean>): Propagator{
    // 
    const premises =  make_hypotheticals<boolean>(cell, make_better_set([true, false]))
    const true_premise = first(premises)
    const false_premise = second(premises)

    function amb_choose(){
        // is filter support set in here? or perhaps i should set premises_nogoods to return BetterSet<LayeredObject>
        const reason_against_true = set_filter(premises_nogoods(true_premise), is_premises_in)
        const reason_against_false = set_filter(premises_nogoods(false_premise), is_premises_in)

        if(set_get_length(reason_against_true) == 0){
            mark_premise_in(true_premise)
            mark_premise_out(false_premise)
        }
        else if(set_get_length(reason_against_false) == 0){
            mark_premise_in(false_premise)
            mark_premise_out(true_premise)
        }
        else{
            mark_premise_out(true_premise)
            mark_premise_out(false_premise) 
            process_contradictions(construct_better_set([pairwise_union(reason_against_true, reason_against_false)], JSON.stringify), cell)
        }
    }
    // when amb propagato is activated?
    const self = construct_propagator([cell], [cell], construct_amb_reactor(amb_choose), "binary_amb")
    set_global_state(PublicStateCommand.ADD_AMB_PROPAGATOR, self)
    return self
}



export function find_premise_to_choose(premises: BetterSet<string>): string | undefined{
    return set_find((premise: string) =>  pipe(premises_nogoods(premise), 
                                                (nogoods) => !set_some(nogoods, is_premises_in)), premises)
}

export function mark_only_chosen_premise(premises: BetterSet<string>, chosen_premise: string){

    mark_premise_in(chosen_premise)

    set_for_each((premise: string) => {
        if (premise !== chosen_premise){
            mark_premise_out(premise)
        }
    }, premises)
}

export function mark_all_premises_out(premises: BetterSet<string>){
    const nogoods = cross_product_union(set_map(premises, (p: string) => set_filter(premises_nogoods(p), 
    is_premises_in)))
    set_for_each((premise: string) => {
        mark_premise_out(premise)
    }, premises)
    return nogoods
}

export function p_amb(cell: Cell<any>, values: BetterSet<any>): Propagator{
    const premises: BetterSet<string> = make_hypotheticals<any>(cell, values)
        function amb_choose(){
            // if all the premises is believed, it represent a contradiction
            const premise_to_choose = find_premise_to_choose(premises)


            if (log_amb_choose){
                console.log("premise_to_choose: ", premise_to_choose, "cell: ", cell_name(cell))
            }

            if (premise_to_choose !== undefined){
               mark_only_chosen_premise(premises, premise_to_choose)
            }
            else{

                const nogoods = cross_product_union(set_map(premises, (p: string) => set_filter(premises_nogoods(p), 
                    is_premises_in)))
                 mark_all_premises_out(premises)

                 if(log_nogoods){
                    console.log("raw no goods: ", to_string(set_map(premises, (p: string) => premises_nogoods(p))))
                    console.log("premises in nogoods: ", to_string(set_map(premises, (p: string) => set_filter(premises_nogoods(p), 
                    is_premises_in))))
                    console.log("outside nogoods: ", to_string(nogoods))
                 }
      
                process_contradictions(nogoods, cell)
            }
        }


    const self = construct_propagator([cell], [cell], construct_amb_reactor(amb_choose), "p_amb")
    set_global_state(PublicStateCommand.ADD_AMB_PROPAGATOR, self)
    return self
}

function pairwise_union(nogoods1: BetterSet<any>, nogoods2: BetterSet<any>) : BetterSet<any>{
    // why flatmap?
    return set_flat_map(nogoods1,(nogood1: any) => {
        return set_flat_map(nogoods2, (nogood2: any) => {
            return construct_better_set([nogood1, nogood2], to_string)
        })
    }) 
}

function cross_product_union(nogoodss: BetterSet<BetterSet<BetterSet<string>>>): BetterSet<BetterSet<string>>{
    // TODO: implement
    return set_reduce_right(pairwise_union, nogoodss, construct_better_set([[]], to_string))
}

export function process_contradictions(nogoods: BetterSet<BetterSet<string>>, complaining_cell: Cell<any>){
    // MARK FAILED PREMISE COMBINATION WITH EACH FAILED PREMISE
 //TODO: update-failure-count


   if(log_nogoods){
        console.log("nogoods", to_string(nogoods), " complaining cell: ",  complaining_cell.getRelation().get_name())
   }

   set_global_state(PublicStateCommand.UPDATE_FAILED_COUNT)
   console.log("nogoodsa", to_string(nogoods))
   console.log(is_better_set(nogoods))
   set_for_each<BetterSet<string>>(save_nogood, nogoods)
   console.log("nogoodsb", to_string(nogoods))
   const [toDisbelieve, nogood] = choose_premise_to_disbelieve(nogoods) 
 

   if (log_process_contradictions){
        console.log("complaining cell", complaining_cell.summarize())
        console.log("processing contradictions")
        console.log("disbelieved premise", toDisbelieve)
   }

   if (toDisbelieve !== undefined){
       maybe_kick_out([toDisbelieve], nogood, complaining_cell)
   }
//    else{
//         throw Error("contradiction is unsolvable, no hypo premises is find, nogoods: " + 
//                     to_string(nogoods) +
//                     " cell_name: " + cell_name(complaining_cell))
//    }

   
}

function save_nogood(nogood: BetterSet<string>){
    console.log("nogoodadsa", nogood)
    console.log(is_better_set(nogood))
    // no good is the combination of premises that failed
    set_for_each((premise: string) => {        
        console.log("premise", premise)
        const previous_nogoods = premises_nogoods(premise)
        console.log("is_better_set", is_better_set(premise))
        console.log("removed", set_remove_item(nogood, premise))
        console.log("previous_nogoods", to_string(previous_nogoods))
        console.log(is_better_set(previous_nogoods))
        const merged_nogoods = set_add_item(previous_nogoods, set_remove_item(nogood, premise)) 
        console.log("merged_nogoods", to_string(merged_nogoods))
        set_premises_nogoods(premise, merged_nogoods)
    }, nogood)
    console.log("nogoooo")
}

function choose_premise_to_disbelieve(nogoods: BetterSet<BetterSet<string>>): any[] {
    console.log("nogoodsaaa", to_string(nogoods))

    const count = (method: (elt: string) => boolean, set: BetterSet<string>)  => {
        return set_get_length(set_filter(set, method))
    }

    const sort_by = (set: BetterSet<BetterSet<string>>, method: (elt: BetterSet<string>) => number) => {
        const arr = to_array(set)
        arr.sort((a, b) => method(a) - method(b))
        return arr
    }


    return pipe(
        nogoods,
        (set) => sort_by(set, (nogood: BetterSet<string>) => count(is_hypothetical, nogood)),                               
        first,
        choose_first_hypothetical
    )
}


function choose_first_hypothetical(nogood: BetterSet<string>): any[]{
    const hyps = set_filter(nogood, is_hypothetical) 
    if (!(set_get_length(hyps) === 0)){
        return [first(hyps), nogood]
    }
    else{
       return [undefined, nogood]
    }     
}


function maybe_kick_out(toDisbelieve: string[], nogood: BetterSet<string>, complaining_cell: Cell<any>){ 

    if (log_process_contradictions){

        console.log("try kick out", toDisbelieve)
    }

    
    if(toDisbelieve.length > 0){
        
        //TODO: AFTER THE PREMISES IS OUT, THE VALUE SET STRONGEST VALUE WOULD NOT CONTAIN
        // ITS CORRESPONDING VALUE, HOWEVER, ITS NECESSARY TO FORCE THE CELL TO BE RECALCULATED
        // ONE SMART WAY IS TO SET REACTIVITY FROM PREMISES STORE TO CELL STORE
        mark_premise_out(toDisbelieve[0])
    } 
  
}

