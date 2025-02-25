
import { make_relation } from "../../DataTypes/Relation";
import { get_global_parent, PublicStateCommand, set_global_state } from "../../Shared/PublicState";
import { scheduled_reactive_state } from "../../Shared/Reactivity/Scheduler";
import { the_contradiction, the_nothing } from "../CellValue";

import { general_contradiction, type Cell } from "../Cell";

import { handle_contradiction } from "../Cell";

import type { Propagator } from "../../Propagator/Propagator";
import { describe } from "../../Helper/UI";
import { mark_error } from "sando-layer/Specified/ErrorLayer"
import SuperJSON from "superjson";

import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure";
import type { RemoteConnector } from "../../RemoteServer/RemoteConnector";
import * as E from "fp-ts/lib/Either"




export const parse_remote_data = construct_simple_generic_procedure("parse_socket_data", 1, (data: any) => {
    return SuperJSON.parse(data.toString());
})

export const encode_remote_data = construct_simple_generic_procedure("encode_socket_data", 1, (data: any) => {
    return SuperJSON.stringify(data);
})


export const closed = "closed"



export async function remote_cell(name: string, remote_server: RemoteConnector){
    const relation = make_relation(name, get_global_parent())
    const strongest = scheduled_reactive_state(the_nothing);
    const content = scheduled_reactive_state(the_contradiction);
    const neighbors: Map<string, Propagator> = new Map();

    await remote_server.connect()

    remote_server.events.subscribe((data: any) => {
        E.match(
            // onLeft
            (error: Error) => {
                if (error.message === closed){
                    strongest.next(mark_error(the_contradiction, error))
                }else{
                    strongest.next(mark_error(the_contradiction, error))
                }
            },
            // onRight
            (data: any) => {
                const decodedData = parse_remote_data(data)
                strongest.next(decodedData)
            }
        )(data)
    })


    const cell: Cell<any> = {
        getRelation: () => relation,
        getContent: () => content,
        getStrongest: () => strongest,
        getNeighbors: () => neighbors,
        addNeighbor: (propagator: Propagator) => {
            neighbors.set(propagator.getRelation().get_id(), propagator);
        }, 
 
        summarize: () => {
            const name = relation.get_name();
            const strongestValue = strongest.get_value();
            const contentValue = content.get_value();
            return `name: ${name}\nstrongest: ${describe(strongestValue)}\ncontent: ${describe(contentValue)}`;
        },
        addContent: (increment: any) => {
            remote_server.send(increment)
        },
        force_update: () => {
            remote_server.send(strongest.get_value())
        }, 
        observe_update: (observer: (cellValues: any) => void) => {
            strongest.subscribe(observer);
        },
        dispose: () => {
            strongest.dispose();
            content.dispose();
            remote_server.dispose()
        }
    }


    set_global_state(PublicStateCommand.ADD_CELL, cell);
    set_global_state(PublicStateCommand.ADD_CHILD, relation);

    strongest.subscribe((v: any) => {
        if (general_contradiction(v)){
          handle_contradiction(cell)
        }
    })    

    return cell;
}
