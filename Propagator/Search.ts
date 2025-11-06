import {
    primitive_propagator,
    constraint_propagator,
    type Propagator,
    construct_propagator,
    compound_propagator
} from "./Propagator";
import { multiply, divide } from "../AdvanceReactivity/Generics/GenericArith";
import {type Cell, cell_name, make_temp_cell} from "../Cell/Cell";
import { ce_constant as constant_cell } from "./BuiltInProps";
import { is_hypothetical, is_premise_in, is_premises_in, make_hypotheticals, mark_premise_in, mark_premise_out, premises_nogoods, set_premises_nogoods } from "../DataTypes/Premises";
import { get_new_reference_count} from "../Helper/Helper";
import { construct_better_set,  set_merge, set_remove, set_union, is_better_set} from "generic-handler/built_in_generics/generic_better_set";
import { PublicStateCommand, set_global_state } from "../Shared/PublicState";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { pipe } from "fp-ts/lib/function";
import { merge, tap, type Reactor } from "../Shared/Reactivity/Reactor";
import { add, subtract} from "../AdvanceReactivity/Generics/GenericArith";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import {isString} from "fp-ts/string";
import {c_if_a} from "./BuiltInProps.ts"
import { first, for_each, length, filter, some, map, flat_map, reduce_right, find, to_array, add_item, remove_item } from "generic-handler/built_in_generics/generic_collection";
import { second } from "../Helper/Helper";


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

// TODO: this need be able to work only if the support set can be propagated first!!!
export function binary_amb(cell: Cell<boolean>): Propagator{
    // 
    const premises =  make_hypotheticals<boolean>(cell, construct_better_set([true, false]))
    const true_premise = first(premises)
    const false_premise = second(premises)

    function amb_choose(){
        // is filter support set in here? or perhaps i should set premises_nogoods to return BetterSet<LayeredObject>
        const reason_against_true = filter(premises_nogoods(true_premise), is_premises_in)
        const reason_against_false = filter(premises_nogoods(false_premise), is_premises_in)

        if(length(reason_against_true) == 0){
            mark_premise_in(true_premise)
            mark_premise_out(false_premise)
        }
        else if(length(reason_against_false) == 0){
            mark_premise_in(false_premise)
            mark_premise_out(true_premise)
        }
        else{
            mark_premise_out(true_premise)
            mark_premise_out(false_premise) 
            process_contradictions(pairwise_union(reason_against_true, reason_against_false), cell)
        }
    }
    // when amb propagato is activated?
    const self = construct_propagator([cell], [cell], amb_choose, "binary_amb")
    set_global_state(PublicStateCommand.ADD_AMB_PROPAGATOR, self)
    return self
}



export function find_premise_to_choose(premises: BetterSet<string>): string | undefined{
    return find(premises, (premise: string) => {
        return pipe(premises_nogoods(premise),
            (nogoods) => {
                if (length(nogoods) === 0){
                    return false
                }
                else {
                    try {
                        return !some(nogoods, is_premises_in)
                    }
                    catch (error) {
                        console.log("error", error)
                        console.log(premises)
                        console.log("premises_nogoods", nogoods)
                        return false
                    }
                }
            })
    })
}

export function mark_only_chosen_premise(premises: BetterSet<string>, chosen_premise: string){

    console.log("marking only chosen premise", chosen_premise)
    console.log("premises", premises)
    mark_premise_in(chosen_premise)

    for_each(premises, (premise: string) => {
        if (premise !== chosen_premise){
            mark_premise_out(premise)
        }
    })
}

export function mark_all_premises_out(premises: BetterSet<string>){
    const nogoods = cross_product_union(map(premises, (p: string) => filter(premises_nogoods(p), 
    is_premises_in)))
    for_each(premises, (premise: string) => {
        mark_premise_out(premise)
    })
    return nogoods
}


export function p_one_of_the_cells(inputs: Cell<any>[], output: Cell<any>){
    return compound_propagator(
        inputs,
        [output],
        () => {
            if (inputs.length == 2){
                const p: Cell<boolean> = make_temp_cell() as Cell<boolean>
                c_if_a(p, inputs[0], inputs[1], output)
                binary_amb(p)
                
            }
            else if (inputs.length > 2){
                const link = make_temp_cell() as Cell<boolean>
                const p = make_temp_cell() as Cell<boolean>
                p_one_of_the_cells(inputs.slice(1), link)
                c_if_a(p, inputs[0], link, output)
                binary_amb(p)
            }
            else{
                throw new Error("one of the cell should have at least two inputs")
            }
        },
    "one of the cell"
    )
}

export function p_amb_a(cell: Cell<any>, values: BetterSet<any>): Propagator{
    return compound_propagator(
        [cell],
        [cell],
        () => {
            const get_new_name = () => "linked" + to_string(get_new_reference_count())
            const v_cells = to_array(values).map((v: any) => constant_cell(v, get_new_name()))
            p_one_of_the_cells(v_cells, cell)
        },
        "p_amb_a"
    )
}

export function p_amb(cell: Cell<any>, values: BetterSet<any>): Propagator{
    const premises: BetterSet<string> = make_hypotheticals<any>(cell, values)
        function amb_choose(){
            // if all the premises is believed, it represent a contradiction
            const premise_to_choose = find_premise_to_choose(premises)



            if (premise_to_choose !== undefined){
                if (log_amb_choose){
                    console.log("premise_to_choose: ", premise_to_choose)
                    console.log("cell: ", cell.summarize())
                }
                mark_only_chosen_premise(premises, premise_to_choose)
            }
            else{
                if (log_amb_choose){
                    console.log("no premise to choose, all premises are out")
                    console.log("cell: ", cell.summarize())
                }

                const nogoods = cross_product_union(map(premises, (p: string) => filter(premises_nogoods(p), 
                    is_premises_in)))
                 mark_all_premises_out(premises)

                 if(log_nogoods){
                    console.log("raw no goods: ", to_string(map(premises, (p: string) => premises_nogoods(p))))
                    console.log("premises in nogoods: ", to_string(map(premises, (p: string) => filter(premises_nogoods(p), 
                    is_premises_in))))
                    console.log("outside nogoods: ", to_string(nogoods))
                 }
      
                process_contradictions(nogoods, cell)
            }
        }


    const self = construct_propagator([cell], [cell], amb_choose, "p_amb")
    set_global_state(PublicStateCommand.ADD_AMB_PROPAGATOR, self)
    return self
}


export function pairwise_union(nogoods1: BetterSet<any>, nogoods2: BetterSet<any>) : BetterSet<any>{
    // why flatmap?
    return flat_map(nogoods1,(nogood1: any) => {
        return map(nogoods2, (nogood2: any) => {
            return set_union(nogood1, nogood2)
        })
    }) 
}

export function cross_product_union(nogoodss: BetterSet<BetterSet<BetterSet<string>>>): BetterSet<BetterSet<string>>{
    // TODO: implement
    return reduce_right(nogoodss, pairwise_union, construct_better_set([[]]))
}

export function process_contradictions(nogoods: BetterSet<string>, complaining_cell: Cell<any>){
    // MARK FAILED PREMISE COMBINATION WITH EACH FAILED PREMISE
    //TODO: update-failure-count


   if(log_nogoods){
        console.log("nogoods", to_string(nogoods), " complaining cell: ",  complaining_cell.getRelation().get_name())
   }

   set_global_state(PublicStateCommand.UPDATE_FAILED_COUNT)

   for_each(nogoods, save_nogood)
   const [toDisbelieve, nogood] = choose_premise_to_disbelieve(nogoods) 
 

   if (log_process_contradictions){
        console.log("complaining cell", complaining_cell.summarize())
        console.log("processing contradictions")
        console.log("disbelieved premise", toDisbelieve)
   }

   if (toDisbelieve !== undefined){
       maybe_kick_out([toDisbelieve], nogood, complaining_cell)
   }
   
}

function save_nogood(nogood: BetterSet<string>){
  
    // no good is the combination of premises that failed
    for_each(nogood, (premise: string) => {
        if (isString(premise)){
            const previous_nogoods = premises_nogoods(premise)
            // djoin-support-with-subsumption
            const merged_nogoods = add_item(previous_nogoods, remove_item(nogood, premise))

            set_premises_nogoods(premise, merged_nogoods)
        }
        else {
            throw new Error("not a string" + to_string(premise))
        }

    })
  
}

function choose_premise_to_disbelieve(nogoods: BetterSet<BetterSet<string>>): any[] {
    const count = (method: (elt: string) => boolean, set: BetterSet<string>)  => {
        return length(filter(set, method))
    }

    const sort_by = (set: BetterSet<BetterSet<string>>, method: (elt: BetterSet<string>) => number) => {
        const arr = to_array(set)
        arr.sort((a: BetterSet<string>, b: BetterSet<string>) => method(a) - method(b))
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
    const hyps = filter(nogood, is_hypothetical) 
    if (!(length(hyps) === 0)){
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

