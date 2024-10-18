import { primitive_propagator, constraint_propagator, Propagator } from "./Propagator"; 
import { multiply, divide } from "./Cell/GenericArith";
import { Cell } from "./Cell/Cell";
import { is_hypothetical, is_premise_in, is_premises_in, make_hypotheticals, mark_premise_in, mark_premise_out, observe_premises_has_changed, premises_nogoods, set_premises_nogoods } from "./DataTypes/Premises";
import { first, for_each, second } from "./helper";
import { set_add_item, construct_better_set,  set_for_each, set_merge, set_remove, map_to_new_set , set_filter, set_get_length, to_array, set_find,  set_remove_item, set_larger_than, set_some, map_to_same_set, make_better_set, set_map, set_flat_map, set_union} from "generic-handler/built_in_generics/generic_better_set";
import { set_reduce_right } from "generic-handler/built_in_generics/generic_better_set";
import { PublicStateCommand, set_global_state } from "./PublicState";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { pipe } from "fp-ts/lib/function";
import { merge, tap, type Reactor } from "./Reactivity/Reactor";
import { map } from "./Reactivity/Reactor";
import { add, subtract} from "./Cell/GenericArith";
import { inspect } from "bun";

export const p_add =  primitive_propagator((...inputs: any[]) => {
    const result = inputs.slice(1).reduce((acc, curr) => add(acc, curr), inputs[0]);

    return result;
}, "add");

export const p_subtract =  primitive_propagator((...inputs: any[]) => {
    const result = inputs.slice(1).reduce((acc, curr) => subtract(acc, curr), inputs[0]);
    return result;
}, "subtract");

export const p_multiply =  primitive_propagator((...inputs: any[]) => {
    const result = inputs.slice(1).reduce((acc, curr) => multiply(acc, curr), inputs[0]);
   
    return result;
}, "multiply");

export const p_divide = primitive_propagator((...inputs: any[]) => {
    return inputs.slice(1).reduce((acc, curr) => divide(acc, curr), inputs[0]);
}, "subdivide"); 


export function c_multiply(x: Cell, y: Cell, product: Cell){
    return constraint_propagator([x, y, product], () => {
        const m = p_multiply(x, y, product).getActivator();
        const s1 = p_divide(product, x, y).getActivator();
        const s2 = p_divide(product, y, x).getActivator();

        return merge(m, s1, s2) as Reactor<any>
    }, "c:*")
}

export function c_subtract(x: Cell, y: Cell, difference: Cell){
    return constraint_propagator([x, y, difference], () => {
        const m = p_subtract(x, y, difference).getActivator();
        const s1 = p_divide(difference, x, y).getActivator();
        const s2 = p_divide(difference, y, x).getActivator();

        return merge(m, s1, s2) as Reactor<any>
    }, "c:-")
}

export function c_divide(x: Cell, y: Cell, quotient: Cell){
    return constraint_propagator([x, y, quotient], () => {
        const m = p_divide(x, y, quotient).getActivator();
        const s1 = p_divide(quotient, x, y).getActivator();
        const s2 = p_divide(quotient, y, x).getActivator();

        return merge(m, s1, s2) as Reactor<any>
    }, "c:/")
}   

export function c_add(x: Cell, y: Cell, sum: Cell){
    return constraint_propagator([x, y, sum], () => {
        const m = p_add(x, y, sum).getActivator();
        const s1 = p_subtract(sum, x, y).getActivator();
        const s2 = p_subtract(sum, y, x).getActivator();

        return merge(m, s1, s2) as Reactor<any>
    }, "c:+")
}



function construct_amb_reactor(f: () => void): () => Reactor<boolean>{
  return () =>  tap<boolean>(f)(observe_premises_has_changed() as Reactor<boolean>)
}

// TODO: this need be able to work only if the support set can be propagated first!!!
export function binary_amb(cell: Cell): Propagator{
    // 
    const premises =  make_hypotheticals<boolean>(cell, make_better_set([true, false]))
    const true_premise = first(premises)
    const false_premise = second(premises)

    function amb_choose(){
        // is filter support set in here? or perhaps i should set premises_nogoods to return BetterSet<LayeredObject>
        const reason_against_true = set_filter(premises_nogoods(true_premise), is_premise_in)
        const reason_against_false = set_filter(premises_nogoods(false_premise), is_premise_in)

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
    const self = new Propagator("binary_amb", [cell], [cell], construct_amb_reactor(amb_choose))
    set_global_state(PublicStateCommand.ADD_AMB_PROPAGATOR, self)
    return self
}



export function find_premise_to_choose(premises: BetterSet<string>): string | undefined{
    return set_find((premise: string) =>  pipe(premises_nogoods(premise), 
                                                (nogoods) => !set_some(nogoods, is_premises_in)), premises)
}

export function mark_only_chosen_premise(premises: BetterSet<string>, chosen_premise: string){
    set_for_each((premise: string) => {
        if (premise === chosen_premise){
           mark_premise_in(premise)
        }
        else{
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

export function p_amb(cell: Cell, values: BetterSet<any>): Propagator{
    const premises: BetterSet<string> = make_hypotheticals<any>(cell, values)
        function amb_choose(){
            // if all the premises is believed, it represent a contradiction
            const premise_to_choose = find_premise_to_choose(premises)
            if (premise_to_choose !== undefined){
               mark_only_chosen_premise(premises, premise_to_choose)
            }
            else{
                const nogoods = mark_all_premises_out(premises)

                process_contradictions(nogoods, cell)
            }
        }


    const self = new Propagator("p_amb", [cell], [cell], construct_amb_reactor(amb_choose))
    set_global_state(PublicStateCommand.ADD_AMB_PROPAGATOR, self)
    return self
}

function pairwise_union(nogoods1: BetterSet<string>, nogoods2: BetterSet<string>) : BetterSet<string>{
    // why flatmap?
    return set_flat_map(nogoods1,(nogood1: string) => {
        return set_map(nogoods2, (nogood2: string) => {
            return set_union(nogood1, nogood2)
        })
    }) 
}

function cross_product_union(nogoodss: BetterSet<BetterSet<string>>): BetterSet<BetterSet<string>>{
    // TODO: implement
    return set_reduce_right(pairwise_union, nogoodss, construct_better_set([], JSON.stringify))
}

export function process_contradictions(nogoods: BetterSet<BetterSet<string>>, complaining_cell: Cell){
    // MARK FAILED PREMISE COMBINATION WITH EACH FAILED PREMISE
 //TODO: update-failure-count
    console.log("processing contradictions")
   set_global_state(PublicStateCommand.UPDATE_FAILED_COUNT)
   set_for_each<BetterSet<string>>(save_nogood, nogoods)
   console.log("nogoods", nogoods)
   const [toDisbelieve, nogood] = choose_premise_to_disbelieve(nogoods) 
   console.log("toDisbelieve", toDisbelieve)
   maybe_kick_out([toDisbelieve], nogood, complaining_cell)
}

function save_nogood(nogood: BetterSet<string>){
    // no good is the combination of premises that failed
    set_for_each((premise: string) => {
        set_premises_nogoods(premise, set_add_item(premises_nogoods(premise), set_remove_item(nogood, premise)))
    }, nogood)
}

function choose_premise_to_disbelieve(nogoods: BetterSet<BetterSet<string>>): any[] {

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
        throw Error("contradiction can't be resolved, no hypothetical premises found " )
    }     
}


function maybe_kick_out(toDisbelieve: string[], nogood: BetterSet<string>, complaining_cell: Cell){ 
    
    if(toDisbelieve.length > 0){
        console.log("disbelieving premise", toDisbelieve[0])
        //TODO: AFTER THE PREMISES IS OUT, THE VALUE SET STRONGEST VALUE WOULD NOT CONTAIN
        // ITS CORRESPONDING VALUE, HOWEVER, ITS NECESSARY TO FORCE THE CELL TO BE RECALCULATED
        // ONE SMART WAY IS TO SET REACTIVITY FROM PREMISES STORE TO CELL STORE
        mark_premise_out(toDisbelieve[0])
    } 
    else{
        throw new Error("contradiction can't be resolved, cell: " + complaining_cell.summarize())
    }
}


