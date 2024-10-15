import { primitive_propagator, constraint_propagator, Propagator } from "./Propagator"; 
import { multiply, divide } from "./Cell/GenericArith";
import { Cell } from "./Cell/Cell";
import { is_hypothetical, is_premise_in, is_premises_in, make_hypotheticals, mark_premise_in, mark_premise_out, premises_nogoods, set_premises_nogoods } from "./DataTypes/Premises";
import { first } from "generic-handler/built_in_generics/generic_array_operation";
import { add, construct_better_set, flat_map, for_each, merge, set_remove, map_to_new_set , filter, get_length, to_array} from "generic-handler/built_in_generics/generic_better_set";
import { second } from "./helper";
import { PublicStateCommand, set_global_state } from "./PublicState";
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set";
import { get_support_layer_value } from "sando-layer/Specified/SupportLayer";
import { pipe } from "fp-ts/lib/function";
import { reduce } from "generic-handler/built_in_generics/generic_better_set";
export const p_multiply =  primitive_propagator((...inputs: any[]) => {
    const result = inputs.slice(1).reduce((acc, curr) => multiply(acc, curr), inputs[0]);
   
    return result;
}, "multiply");

export const p_subdivide = primitive_propagator((...inputs: any[]) => {
    // console.log("subdivide inputs", inputs);
    return inputs.slice(1).reduce((acc, curr) => divide(acc, curr), inputs[0]);
}, "subdivide"); 


export function c_multiply(x: Cell, y: Cell, product: Cell){
    return constraint_propagator([x, y, product], () => {
        p_multiply(x, y, product);
        p_subdivide(product, x, y);
        p_subdivide(product, y, x);
    }, "c:*")
}


// TODO: this need be able to work only if the support set can be propagated first!!!
export function binary_amb(cell: Cell): Propagator{
    // 
    const premises = make_hypotheticals<boolean>(cell, construct_better_set([true, false], (elt: boolean) => elt.toString()))
    const true_premise = first(premises)
    const false_premise = second(premises)

    function amb_choose(){
        // is filter support set in here? or perhaps i should set premises_nogoods to return BetterSet<LayeredObject>
        const reason_against_true = filter(premises_nogoods(true_premise), is_premise_in)
        const reason_against_false = filter(premises_nogoods(false_premise), is_premise_in)

        if(get_length(reason_against_true) == 0){
            mark_premise_in(true_premise)
            mark_premise_out(false_premise)
        }
        else if(get_length(reason_against_false) == 0){
            mark_premise_in(false_premise)
            mark_premise_out(true_premise)
        }
        else{
            mark_premise_out(true_premise)
            mark_premise_out(false_premise) 
            process_contradictions(pairwise_union(reason_against_true, reason_against_false), cell)
        }
    }

    const self = new Propagator("binary_amb", [cell], [cell], amb_choose)
    set_global_state(PublicStateCommand.ADD_AMB_PROPAGATOR, self)
    return self
}

function pairwise_union(nogoods1: BetterSet<string>, nogoods2: BetterSet<string>) : BetterSet<BetterSet<string>>{
    // why flatmap?
    return map_to_new_set<string, BetterSet<string>>(nogoods1, (item: string) => add(nogoods2, item), 
                                                    (item: BetterSet<string>) => reduce(item, (acc, value) => acc + value, ""))
}

export function process_contradictions(nogoods: BetterSet<BetterSet<string>>, complaining_cell: Cell){
    // MARK FAILED PREMISE COMBINATION WITH EACH FAILED PREMISE
 //TODO: update-failure-count
   for_each<BetterSet<string>>(nogoods, save_nogood)
   const [toDisbelieve, nogood] = choose_premise_to_disbelieve(nogoods) 
   maybe_kick_out(toDisbelieve, nogood, complaining_cell)
}

function save_nogood(nogood: BetterSet<string>){
    for_each(nogood, (premise: string) => {
        set_premises_nogoods(premise, merge(set_remove(nogood, premise), premises_nogoods(premise), (item) => item) )
    })
}

function choose_premise_to_disbelieve(nogoods: BetterSet<BetterSet<string>>): any[] {

    const count = (method: (elt: string) => boolean, set: BetterSet<string>)  => {
        return get_length(filter(set, method))
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
    const hyps = filter(nogood, is_hypothetical) 
    if (!(get_length(hyps) === 0)){
        return [first(hyps), nogood]
    }
    else{
        return [[], nogood]
    }     
}


function maybe_kick_out(toDisbelieve: string[], nogood: BetterSet<string>, complaining_cell: Cell){ 
    if(toDisbelieve.length > 0){
        //TODO: AFTER THE PREMISES IS OUT, THE VALUE SET STRONGEST VALUE WOULD NOT CONTAIN
        // ITS CORRESPONDING VALUE, HOWEVER, ITS NECESSARY TO FORCE THE CELL TO BE RECALCULATED
        // ONE SMART WAY IS TO SET REACTIVITY FROM PREMISES STORE TO CELL STORE
        mark_premise_out(toDisbelieve[0])
    } 
    else{
        throw new Error("contradiction can't be resolved, cell: " + complaining_cell.summarize())
    }
}

