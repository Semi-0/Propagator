import { construct_cell as cell, cell_strongest_base_value, cell_id, cell_name, cell_strongest, cell_content, update_cell, NeighborType, construct_cell, alert_interested_propagators, type interesetedNeighbor, same_cell } from "../Cell/Cell";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { p_sync } from "../Propagator/BuiltInProps";
import { register_predicate } from "generic-handler/Predicates";
import { the_disposed, the_nothing, type CellValue } from "../Cell/CellValue";
import type { Cell } from "../Cell/Cell";
import { construct_propagator, function_to_primitive_propagator, type Propagator } from "../Propagator/Propagator";
import { make_relation } from "./Relation";
import { get_global_parent } from "../Shared/PublicState";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { constant_clock, construct_vector_clock, get_clock_channels, get_vector_clock_layer, layered_vector_clock_forward, vector_clock_get_source, vector_clock_layer, vector_clocked_value_update, version_vector_forward } from "../AdvanceReactivity/vector_clock";
import { get_id } from "../AdvanceReactivity/traced_timestamp/TracedTimeStamp";
import { describe } from "../Helper/UI";
import { is_layered_object, type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { get_base_value } from "sando-layer/Basic/Layer";
import { mark_for_disposal } from "../Shared/Generics";
import { mark_premise_in, mark_premise_out, register_premise } from "./Premises";
import  { BeliefState } from "./PremiseMetaData";
import { is_map } from "../Helper/Helper";
import { no_compute } from "../Helper/noCompute";
import { find } from "generic-handler/built_in_generics/generic_collection";
import { pipe } from "fp-ts/lib/function";
import { Option } from "effect";
import { match } from "effect/Option";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { make_ce_arithmetical } from "../Propagator/Sugar";



export const is_belief_state_predicate = register_predicate(
    "is_belief_state", 
    (value: BeliefState): value is BeliefState => 
        value === BeliefState.Believed || value === BeliefState.NotBelieved
);

const dependents_cells: Map<string, Cell<any>> = new Map();


export const source_inited = true

export const is_source_inited = (x: any) => {
    return x === source_inited;
}

const register_source_cell = (cell: Cell<any>) => {
    const premises = cell_id(cell);
    register_premise(premises, cell);
    dependents_cells.set(premises, cell);
}


export const internal_clear_source_cells = () => {
    dependents_cells.clear();
}

export const has_source_cell = (source: string) => {
    return dependents_cells.has(source);
}

export const get_source_cell = (source: string) => {
    return dependents_cells.get(source);
}

export const source_has_neighbor = (source: string, neighbor: Cell<any>) => {
    const source_cell = get_source_cell(source);
    if (!source_cell) return false;
    return source_cell
        .getNeighbors()
        .values()
        .find(n =>
            n.propagator
                .getOutputs()
                .some(c => same_cell(c, neighbor))
        ) !== undefined;
}

// the only problem is that premises bring in or retract can not be tracked remotely
// only in local environment
// but lets deal with that in next iteration
// previously dependence cell is necessary is because it can update multiple cell simutalneously
// do we still want that? 
// or we can embeded environment into the source cell?
// if it just have one value can it still update bi-directional cell?
// with switch or filter?
export const source_cell = (name: string, initial_value: any = source_inited) => {
    const cell = construct_cell(name);

    const premises = cell_id(cell);
    register_source_cell(cell);

    update_cell(cell,
        construct_layered_datum(
            initial_value,
            vector_clock_layer,
            constant_clock
        )
    )
    return cell;
}



export const forwarding_source_clock = (source_cell: Cell<any>) => {
    update_cell(source_cell, layered_vector_clock_forward(
        cell_id(source_cell), 
        cell_strongest(source_cell)
    ))
}


export const is_source_cell = (cell: Cell<any>) => {
    return pipe(
        cell,
        cell_strongest,
        get_vector_clock_layer,
        (result) => {
            if (result === undefined) {
                return false;
            }
            else {
                return true;
            }
        } 
    )
}

export const update_source_cell = (source_cell: Cell<any>, value: any, timestamp: number | undefined = undefined) => { 
    if (is_source_cell(source_cell)) {

        if (timestamp == undefined){
            update_cell(
                source_cell,
                vector_clocked_value_update(
                    cell_strongest(source_cell), 
                    value, 
                    cell_id(source_cell)
                )
            )
        }
        else{
            update_cell(source_cell, 
                construct_layered_datum(
                    value,
                    vector_clock_layer,
                    construct_vector_clock([
                        {
                            source: cell_id(source_cell),
                            value: timestamp
                        }
                    ])
                )
            );
        }
    }
    else{
        console.error("source cell is not a source cell", describe(source_cell));
        return;
    }
}

export const change_premises = (premises_operation: (premises: string) => void) => (dependence: string) => {
    // a more robust way is gather all its neighbor have this dependence in content 
    // then broadcast the same value but with new timestamp
    // 
    const cell = get_source_cell(dependence) as Cell<any>;
    if (!cell) {
        console.error("dependence cell not found", dependence);
        return;
    } 
 
    pipe(cell,
        cell_id,
        premises_operation
    ) 

    forwarding_source_clock(cell);
  
}

export const kick_out = change_premises(mark_premise_out);
export const bring_in = change_premises(mark_premise_in);



const emit_broad_cast_message = (cell: Cell<any>) => {
    const broadcast_value = new Map<Cell<any>, any>();

    const neighbors = Array.from(cell.getNeighbors().values().map(n => n.propagator));
    neighbors.forEach((p) => {
        const output_cells = p.getOutputs();

        for (const output_cell of output_cells){
            const relevant_value = find(cell_content(output_cell), (v: any) => {
                return get_clock_channels(get_vector_clock_layer(v)).some(c => c === cell_name(cell))
            })

            if (relevant_value){
                broadcast_value.set(output_cell, get_base_value(relevant_value));
            }
        }
    }) 

    return broadcast_value;
}
export const kick_out_cell = (cell: Cell<any>) => {


    // cell.update(BeliefState.NotBelieved);

    // // const broadcast_value = emit_broad_cast_message(cell);
    // const 
    // cell.update(broadcast_value);

}

export const bring_in_cell = (cell: Cell<any>) => {
    cell.update(BeliefState.Believed);

    const broadcast_value = emit_broad_cast_message(cell);
   
    cell.update(broadcast_value);
}


export const p_reactive_dispatch = (source: Cell<any>, output: Cell<any>) => function_to_primitive_propagator("dispatch",
    (source: Map<Cell<any>, any>) => {
        if (is_map(source)){
            const update = source.get(output)

            if ((update !== undefined) && (update !== null)){
                return update
            }
            else {
                return no_compute
            }
        }
        else {
            return no_compute
        }
    })(source, output)


export const ce_dependents = make_ce_arithmetical(p_reactive_dispatch)

// // Helper function to update a regular cell with a value from a source
// const update_cell_from_source = (cell: Cell<any>, value: any, source_name: string) => {
//     const current_strongest = cell_strongest(cell);
    
//     // Get the current vector clock for this source, or start at 0
//     const maybe_last_clock = pipe(
//         current_strongest,
//         get_vector_clock_layer,
//         (c) => vector_clock_get_source(source_name, c)
//     );
    
//     const new_clock = match(maybe_last_clock, {
//         onNone: () => construct_vector_clock([{
//             source: source_name,
//             value: 0
//         }]),
//         onSome: (last_clock) => construct_vector_clock([{
//             source: source_name,
//             value: last_clock + 1
//         }])
//     });
    
//     // Create layered datum with the value and vector clock
//     const layered = construct_layered_datum(
//         value,
//         vector_clock_layer,
//         new_clock
//     );
    
//     update_cell(cell, layered);
// }

// // Create or get a source cell for a given source name
// const get_or_create_source_cell = (source_name: string): Cell<any> => {
//     if (has_source_cell(source_name)) {
//         return get_source_cell(source_name)!;
//     }
//     const source = source_cell(source_name, the_nothing);
//     dependents_cells.set(source_name, source);
    
//     // Ensure the source name is registered as a premise
//     // The source_cell already registers it via register_dependence_cell,
//     // but we also need to ensure the source_name itself is registered
//     // in case it's different from the cell ID
//     const cell_id_value = cell_id(source);
//     if (cell_id_value !== source_name) {
//         // If the cell ID is different from source_name, register source_name as well
//         // This allows the source_name to be used in vector clocks
//         register_premise(source_name, source);
//     }
    
//     return source;
// }

// dependent_update allows updating multiple cells from a single source
// // It returns a function that takes a Map of cell->value pairs
// export const dependent_update = (source_name: string) => (updates: Map<Cell<any>, any>) => {
//     // Ensure the source cell exists and is registered as a premise
//     const source_cell_ref = get_or_create_source_cell(source_name);
    
//     // Ensure the premise is marked as "in" (believed) so it's active
//     // This is important for the premise system to recognize the source
//     const premises_id = cell_id(source_cell_ref);
//     mark_premise_in(premises_id);
    
//     // Update each target cell with the value from this source
//     for (const [cell, value] of updates) {
//         update_cell_from_source(cell, value, source_name);
//     }
    
//     // Forward the source clock to mark that this source has updated
//     forwarding_source_clock(source_cell_ref);
// }

// source update 
// source update could be multiple value
// export const dependent_update = (dependent: string) => (updates: Map<Cell<any>, any>) => {
//     if (!has_dependence_cell(dependent)) {
//         const dependent_cell = construct_dependent_cell(dependent);
//         for (const [cell, value] of updates){
//             p_dispatch(dependent_cell, cell)
//         }
//         dependent_cell.update(updates)
//     }
//     else{
//         const dependent_cell = get_dependence_cell(dependent) as Cell<any>;

//         for (const [target, value] of updates){
//             if (dependence_has_neighbor(dependent, target)) {
//                 // cell.update(value);
//             }
//             else{
//                 p_dispatch(dependent_cell, target)
                
//             }
//             dependent_cell.update(updates)
//      }
//     }
// }
// // maybe another way to do it
// a better way is to define a source layer?
// then source layer were able to merge and track premises?

// but then if you promote a cell to source,
// it becomes none retractable...

// const dependence_cell = (source: string) => {
//     const relation = make_relation(source, get_global_parent());
//     const neighbors: Map<string, interesetedNeighbor> = new Map();
    
//     var value: LayeredObject<any> | any = construct_layered_datum(
//         the_nothing,
//         vector_clock_layer, construct_vector_clock([
//             {
//                 source: source,
//                 value: 0
//             }
//         ])
//     )

//     register_premise(source, relation);
//     var active = true
    
  
//     function test_content(): boolean {
//         alert_interested_propagators(neighbors, CellHooks.content_tested)
//         return true;
//     }
  
    
//   // its sad that now kick out is manual, is there a way to make it automatic?
//     const cell: Cell<any> = {
//       getRelation: () => relation,
//       getContent: () => value,
//       getStrongest: () => value,
//       getNeighbors: () => neighbors as Map<string, interesetedNeighbor>,
//       testContent: test_content,
//       update: (increment: CellValue<any> = the_nothing): boolean => {
//         if (!active) return false;

//         const current_clock = get_vector_clock_layer(value).get(source);

//         if (is_layered_object(increment)) {
//             // should accept layered object but lets deal with this later
//             console.error(
//                 "increment is a layered object",
//                 describe(increment),
//                 "in source",
//                 source
//             )
//             return false;
//         }

//         if (is_belief_state_predicate(increment)) {
//             if (increment === BeliefState.Believed) {
//                 mark_premise_in(source);
//             } 
//             else {
//                 mark_premise_out(source);
//             }

//             // Belief state change - keep base value, increment clock
//             value = construct_layered_datum(
//                 get_base_value(value),
//                 vector_clock_layer,
//                 construct_vector_clock([
//                 {
//                     source: source,
//                     value: current_clock + 1
//                 }
//                 ])
//             );

//             alert_interested_propagators(neighbors, CellHooks.updated);
//             return true;
//         } 
//         else if (is_map(increment)){
//             // Value update - update base value and increment clock
//             value = construct_layered_datum(
//                 increment,
//                 vector_clock_layer,
//                 construct_vector_clock([
//                 {
//                     source: source,
//                     value: current_clock + 1
//                 }
//                 ])
//             );
            
//             alert_interested_propagators(neighbors, CellHooks.updated);
//             return true;
//         }
//         else{
//             console.error("increment is not valid for source cell", source, describe(increment))
//             return false;
//         }

//       },
  
//       addNeighbor: (propagator: Propagator, interested_in: CellHooks[]) => {
    
//         neighbors.set(propagator.getRelation().get_id(), {
//           interested_in: interested_in,
//           propagator: propagator
//         });
//         alert_interested_propagators(neighbors, CellHooks.neighbor_added)
//         alert_interested_propagators(neighbors, CellHooks.updated)
//       },
//       removeNeighbor: (propagator: Propagator) => {
//         neighbors.delete(propagator.getRelation().get_id());
//         alert_interested_propagators(neighbors, CellHooks.neighbor_removed)
//       },
//       summarize: () => {
//         const name = relation.get_name();
//         const strongVal = value;
//         const contVal = value;
  
//         const summarizeNeighbor = ([id, info]: [string, interesetedNeighbor], index: number) => {
//           const interested = info?.interested_in ?? [];
//           const propagatorName = info?.propagator?.getName ? info.propagator.getName() : "<unknown propagator>";
//           const interestedDisplay = interested.length ? ` [${interested.join(", ")}]` : "";
//           return `    [${index}] ${propagatorName} (id: ${id})${interestedDisplay}`;
//         };
  
//         const neighborsSummary = neighbors.size === 0
//           ? "    (none)"
//           : Array.from(neighbors.entries()).map(summarizeNeighbor).join("\n");
  
//         return [
//           `CELL ${name}`,
//           `  ID: ${relation.get_id()}`,
//           `  STATUS: ${active ? "active" : "disposed"}`,
//           `  STRONGEST: \n ${describe(strongVal)}`,
//           `  CONTENT: \n ${describe(contVal)}`,
//           `  NEIGHBORS (${neighbors.size}):`,
//           neighborsSummary
//         ].join("\n");
//       },
  
//       dispose: () => {
//         // Set the cell to disposed value
//         alert_interested_propagators(neighbors, CellHooks.disposing)
//         value = the_disposed
//         active = false
//         // Mark for cleanup
//         mark_for_disposal(cell.getRelation())
//         // Trigger propagation to connected cells
  
//         // but what about dependents?
//         neighbors.forEach(n => {
//           n.propagator.activate()
//         })
//       }
//     }
//     return cell;
// }
