import { make_relation } from "../../DataTypes/Relation";
import {  get_global_parent, PublicStateCommand, set_global_state } from "../../Shared/PublicState";
import { the_contradiction, the_nothing, is_nothing, type CellValue } from "../CellValue";
import { pipe } from "fp-ts/lib/function";
import { general_contradiction, type Cell, type interesetedNeighbor, CellHooks, alert_interested_propagators, handle_contradiction } from "../Cell";
import { cell_merge } from "../Merge";
import type { Propagator } from "../../Propagator/Propagator";
import { describe } from "../../Helper/UI";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { mark_error } from "sando-layer/Specified/ErrorLayer"
import SuperJSON from "superjson";

import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import type { RemoteConnector } from "../../RemoteServer/RemoteConnector";
import * as E from "fp-ts/lib/Either"
import { match_args } from "generic-handler/Predicates";
import { is_layered_object } from "../../Helper/Predicate";
import { is_better_set } from "generic-handler/built_in_generics/generic_better_set";
import { get_id } from "../../Shared/Generics";

// Initialize the BetterSet serialization support
export const parse_remote_data = construct_simple_generic_procedure("parse_socket_data", 1, (data: any) => {
    try {
        // If plain JSON parsing fails, try with SuperJSON
        const parsed = SuperJSON.parse(data.toString());
        return parsed;
        } catch (superJsonError) {
            // If both fail, return the data as is (might be a primitive value)
            console.warn("Failed to parse data using JSON and SuperJSON, using raw value");
            return data.toString();
        }
    }
)

export const encode_remote_data = construct_simple_generic_procedure("encode_socket_data", 1, (data: any) => {
    return SuperJSON.stringify(data);
})

define_generic_procedure_handler(encode_remote_data, match_args(is_layered_object),
    (data: any) => {
        return SuperJSON.stringify(data.describe_self());
    }
)

// Add special handler for BetterSet objects
define_generic_procedure_handler(encode_remote_data, match_args(is_better_set),
    (data: any) => {
        return SuperJSON.stringify(data);
    }
)

export const closed = "closed"

export async function remote_cell(name: string, remote_server: RemoteConnector){
    const relation = make_relation(name, get_global_parent())
    const neighbors: Map<string, interesetedNeighbor> = new Map();

    var content: CellValue<any> = the_nothing;
    var strongest: CellValue<any> = the_nothing;
    var active = true;

    await remote_server.connect()

    const set_strongest = (new_strongest: CellValue<any>) => {
        strongest = new_strongest;
        alert_interested_propagators(neighbors, CellHooks.updated);
        
        if (general_contradiction(strongest)){
            handle_contradiction(cell);
        }
    }

    remote_server.events.subscribe((data: any) => {
        E.match(
            // onLeft
            (error: Error) => {
                if (error.message === closed){
                    set_strongest("closed")
                }else{
                    set_strongest(mark_error(the_contradiction, error))
                }
            },
            // onRight
            (data: any) => {
                try {
                    const decodedData = parse_remote_data(data);
                    set_strongest(decodedData);
                } catch (error) {
                    console.error("Error parsing remote data:", error);
                    set_strongest(mark_error(the_contradiction, error));
                }
            }
        )(data)
    })


    const cell: Cell<any> = {
        getRelation: () => relation,
        getContent: () => content,
        getStrongest: () => strongest,
        getNeighbors: () => neighbors,
        
        addNeighbor: (propagator: Propagator, interested_in: CellHooks[]) => {
            neighbors.set(propagator.getRelation().get_id(), {
                interested_in: interested_in,
                propagator: propagator
            });
            alert_interested_propagators(neighbors, CellHooks.neighbor_added);
            // If we have a value, notify the new neighbor (and others)
            if (!is_nothing(strongest)) {
                alert_interested_propagators(neighbors, CellHooks.updated);
            }
        }, 
        
        removeNeighbor: (propagator: Propagator) => {
            neighbors.delete(get_id(propagator));
            alert_interested_propagators(neighbors, CellHooks.neighbor_removed);
        },
 
        summarize: () => {
            const name = relation.get_name();
            const strongestValue = strongest;
            const contentValue = content;
            return `name: ${name}\nstrongest: ${describe(strongestValue)}\ncontent: ${describe(contentValue)}`;
        },
        
        update: (increment: any) => {
            if (active) {
                try {
                    remote_server.send(encode_remote_data(increment));
                    return true;
                } catch (error) {
                    console.error("Error encoding data for remote server:", error);
                    return false;
                }
            }
            return false;
        },
        
        testContent: () => {
            // No-op for remote cell as strongest is driven by server
            return true;
        },
        
        dispose: () => {
            active = false;
            remote_server.dispose()
        }
    }
    
    // Legacy support if interface demands force_update or observe_update not in Cell interface
    // (The Cell interface I read earlier didn't have force_update/observe_update, so I omit them)

    set_global_state(PublicStateCommand.ADD_CELL, cell);
    set_global_state(PublicStateCommand.ADD_CHILD, relation);

    return cell;
}
