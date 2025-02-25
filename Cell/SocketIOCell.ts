import type { Socket } from "bun";
import { make_relation } from "../DataTypes/Relation";
import { deep_equal, get_global_parent, PublicStateCommand, set_global_state } from "../Shared/PublicState";
import { scheduled_reactive_state } from "../Shared/Reactivity/Scheduler";
import { the_contradiction, the_nothing } from "./CellValue";
import { pipe } from "fp-ts/lib/function";
import { general_contradiction, type Cell } from "./Cell";
import { strongest_value } from "./StrongestValue";
import { subscribe } from "../Shared/Reactivity/Reactor";
import { map, filter } from "../Shared/Reactivity/Reactor";
import { handle_contradiction } from "./Cell";
import { strong } from "fp-ts";
import { cell_merge } from "./Merge";
import type { Propagator } from "../Propagator/Propagator";
import { describe } from "../Helper/UI";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { mark_error } from "sando-layer/Specified/ErrorLayer"


export async function socket_IO_client_cell(name: string, ip: string, port: number){

    const relation = make_relation(name, get_global_parent())
    const strongest = scheduled_reactive_state(the_nothing);
    const content = scheduled_reactive_state(the_nothing);
    const socket = await Bun.connect({
        hostname: ip,
        port: port,
        socket: {
            error: (socket: Socket, error: Error) => {
                content.next(mark_error(the_contradiction, error))
            },
    
            data: (socket: Socket, data: any) => {
                const decodedData = JSON.parse(data.toString());
                const result = cell_merge(content.get_value(), decodedData);
                content.next(result)
            }
        }
    })
    const neighbors: Map<string, Propagator> = new Map();

    

    pipe(
        content,
        map((content: any) => strongest_value(content)),
        filter((content: any) => !deep_equal(content, strongest.get_value())),
        subscribe((content: any) => {
          strongest.next(content)
        })
      )

    const cell: Cell<any> = {
        getRelation: () => relation,
        getContent: () => content,
        getStrongest: () => strongest,
        getNeighbors: () => new Map(),
        addContent: (increment: any) => {
            socket.write(JSON.stringify(increment))
        },
        force_update: () => {
            content.next(content.get_value())
        }, 
        addNeighbor: (propagator: Propagator) => {
            neighbors.set(propagator.getRelation().get_id(), propagator);
        },
        testContent: (content: any, strongest: any) => {
            return content;
        },
        summarize: () => {
            const name = relation.get_name();
            const strongestValue = strongest.get_value();
            const contentValue = content.get_value();
            return `name: ${name}\nstrongest: ${describe(strongestValue)}\ncontent: ${describe(contentValue)}`;
        },
        observe_update: (observer: (cellValues: any) => void) => {
            strongest.subscribe(observer);
        },
        dispose: () => {
            content.dispose();  
            strongest.dispose();
            socket.end()
          
        }
    };

    set_global_state(PublicStateCommand.ADD_CELL, cell);
    set_global_state(PublicStateCommand.ADD_CHILD, relation);
    

    strongest.subscribe((v: any) => {
        if (general_contradiction(v)){
          handle_contradiction(cell)
        }
    })    

    return cell;
    
}