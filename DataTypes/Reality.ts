import { execute_all_tasks_sequential, p_sync, register_predicate, the_disposed, the_nothing, type Cell } from "ppropogator";
import { construct_propagator, function_to_primitive_propagator } from "../Propagator/Propagator";
import { make_relation } from "ppropogator/DataTypes/Relation";
import { get_global_parent } from "ppropogator/Shared/PublicState";
import { alert_interested_propagators, cell_content, cell_name, CellHooks, type interesetedNeighbor } from "ppropogator/Cell/Cell";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { construct_vector_clock, get_clock_channels, get_vector_clock_layer, vector_clock_layer } from "../AdvanceReactivity/vector_clock";
import type { CellValue } from "ppropogator";
import type { Propagator } from "ppropogator";
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



// promote a cell into the entry point of reality
// source 
// i dont want to expose reality patch to other cell
// or let reality becomes a propagator?


export const is_belief_state_predicate = register_predicate(
    "is_belief_state", 
    (value: BeliefState): value is BeliefState => 
        value === BeliefState.Believed || value === BeliefState.NotBelieved
);

const dependents_cells: Map<string, Cell<any>> = new Map();



export const clean_dependence_cells = () => {
    dependents_cells.clear();
}

export const has_dependence_cell = (source: string) => {
    return dependents_cells.has(source);
}

export const get_dependence_cell = (source: string) => {
    return dependents_cells.get(source);
}

export const dependence_has_neighbor = (source: string, neighbor: Cell<any>) => {
    const source_cell = get_dependence_cell(source);
    if (!source_cell) return false;
    return source_cell.getNeighbors().has(neighbor.getRelation().get_id());
}



const dependence_cell = (source: string) => {
    const relation = make_relation(source, get_global_parent());
    const neighbors: Map<string, interesetedNeighbor> = new Map();
    
    var value: LayeredObject<any> | any = construct_layered_datum(
        the_nothing,
        vector_clock_layer, construct_vector_clock([
            {
                source: source,
                value: 0
            }
        ])
    )

    register_premise(source, relation);
    var active = true
    
  
    function test_content(): boolean {
        alert_interested_propagators(neighbors, CellHooks.content_tested)
        return true;
    }
  
    
  // its sad that now kick out is manual, is there a way to make it automatic?
    const cell: Cell<any> = {
      getRelation: () => relation,
      getContent: () => value,
      getStrongest: () => value,
      getNeighbors: () => neighbors as Map<string, interesetedNeighbor>,
      testContent: test_content,
      update: (increment: CellValue<any> = the_nothing): boolean => {
        if (!active) return false;

        const current_clock = get_vector_clock_layer(value).get(source);

        if (is_layered_object(increment)) {
            // should accept layered object but lets deal with this later
            console.error(
                "increment is a layered object",
                describe(increment),
                "in source",
                source
            )
            return false;
        }

        if (is_belief_state_predicate(increment)) {
            if (increment === BeliefState.Believed) {
                mark_premise_in(source);
            } 
            else {
                mark_premise_out(source);
            }

            // Belief state change - keep base value, increment clock
            value = construct_layered_datum(
                get_base_value(value),
                vector_clock_layer,
                construct_vector_clock([
                {
                    source: source,
                    value: current_clock + 1
                }
                ])
            );

            alert_interested_propagators(neighbors, CellHooks.updated);
            return true;
        } 
        else if (is_map(increment)){
            // Value update - update base value and increment clock
            value = construct_layered_datum(
                increment,
                vector_clock_layer,
                construct_vector_clock([
                {
                    source: source,
                    value: current_clock + 1
                }
                ])
            );
            
            alert_interested_propagators(neighbors, CellHooks.updated);
            return true;
        }
        else{
            console.error("increment is not valid for source cell", source, describe(increment))
            return false;
        }

      },
  
      addNeighbor: (propagator: Propagator, interested_in: CellHooks[]) => {
    
        neighbors.set(propagator.getRelation().get_id(), {
          interested_in: interested_in,
          propagator: propagator
        });
        alert_interested_propagators(neighbors, CellHooks.neighbor_added)
        alert_interested_propagators(neighbors, CellHooks.updated)
      },
      removeNeighbor: (propagator: Propagator) => {
        neighbors.delete(propagator.getRelation().get_id());
        alert_interested_propagators(neighbors, CellHooks.neighbor_removed)
      },
      summarize: () => {
        const name = relation.get_name();
        const strongVal = value;
        const contVal = value;
  
        const summarizeNeighbor = ([id, info]: [string, interesetedNeighbor], index: number) => {
          const interested = info?.interested_in ?? [];
          const propagatorName = info?.propagator?.getName ? info.propagator.getName() : "<unknown propagator>";
          const interestedDisplay = interested.length ? ` [${interested.join(", ")}]` : "";
          return `    [${index}] ${propagatorName} (id: ${id})${interestedDisplay}`;
        };
  
        const neighborsSummary = neighbors.size === 0
          ? "    (none)"
          : Array.from(neighbors.entries()).map(summarizeNeighbor).join("\n");
  
        return [
          `CELL ${name}`,
          `  ID: ${relation.get_id()}`,
          `  STATUS: ${active ? "active" : "disposed"}`,
          `  STRONGEST: \n ${describe(strongVal)}`,
          `  CONTENT: \n ${describe(contVal)}`,
          `  NEIGHBORS (${neighbors.size}):`,
          neighborsSummary
        ].join("\n");
      },
  
      dispose: () => {
        // Set the cell to disposed value
        alert_interested_propagators(neighbors, CellHooks.disposing)
        value = the_disposed
        active = false
        // Mark for cleanup
        mark_for_disposal(cell.getRelation())
        // Trigger propagation to connected cells
  
        // but what about dependents?
        neighbors.forEach(n => {
          n.propagator.activate()
        })
      }
    }
    return cell;
}

export const construct_dependent_cell = (source: string) => {
    if (has_dependence_cell(source)) {
        return get_dependence_cell(source) as Cell<any>;
    }
    const cell = dependence_cell(source);
    dependents_cells.set(source, cell);
    return cell;
}
// ui

export const kick_out = (dependence: string) => {
    // a more robust way is gather all its neighbor have this dependence in content 
    // then broadcast the same value but with new timestamp
    // 
    const cell = get_dependence_cell(dependence) as Cell<any>;
    if (!cell) return;
    kick_out_cell(cell);
    execute_all_tasks_sequential((error: Error) => {
        if (error) console.log("ERROR in kick_out:", error.message);
    });
}

export const bring_in = (dependence: string) => {
    const cell = get_dependence_cell(dependence) as Cell<any>;
    if (!cell) return;
    bring_in_cell(cell);
    execute_all_tasks_sequential((error: Error) => {
        if (error) console.log("ERROR in bring_in:", error.message);
    });
}



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
    cell.update(BeliefState.NotBelieved);

    const broadcast_value = emit_broad_cast_message(cell);
   
    cell.update(broadcast_value);

}

export const bring_in_cell = (cell: Cell<any>) => {
    cell.update(BeliefState.Believed);

    const broadcast_value = emit_broad_cast_message(cell);
   
    cell.update(broadcast_value);
}


export const p_dispatch = (dependent: Cell<Map<Cell<any>, any>>, output: Cell<any>) => function_to_primitive_propagator("dispatch",
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
    })(dependent, output)

// source update 
// source update could be multiple value
export const dependent_update = (dependent: string) => (updates: Map<Cell<any>, any>) => {
    if (!has_dependence_cell(dependent)) {
        const dependent_cell = construct_dependent_cell(dependent);
        for (const [cell, value] of updates){
            p_dispatch(dependent_cell, cell)
        }
        dependent_cell.update(updates)
    }
    else{
        const dependent_cell = get_dependence_cell(dependent) as Cell<any>;

        for (const [target, value] of updates){
            if (dependence_has_neighbor(dependent, target)) {
                // cell.update(value);
            }
            else{
                p_dispatch(dependent_cell, target)
                
            }
            dependent_cell.update(updates)
     }
    }
}