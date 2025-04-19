import type { Socket } from "bun";
import { construct_reactor } from "../../Shared/Reactivity/Reactor";
import type { RemoteConnector } from "../../RemoteServer/RemoteConnector";
import * as E from "fp-ts/lib/Either"
import { left, right } from "fp-ts/lib/Either";
import { closed, encode_remote_data, remote_cell } from "./RemoteCell";
import type { Option } from "fp-ts/lib/Option";
import { none, some } from "fp-ts/lib/Option";
import  * as O from "fp-ts/lib/Option"

async function socket_wrapper(ip: string, port: number): Promise<RemoteConnector>{
    let socket: Option<Socket> = none;
    var events = construct_reactor() 

    return {
        connect: async () => {
            socket = some(await Bun.connect({
                hostname: ip,
                port: port,
                socket: {
                    data: (socket: Socket, data: any) => {
                        events.next(right(data))
                    },
                    error: (socket: Socket, error: Error) => {
                        events.next(left(error))
                    },
                    close: () => {
                        events.next(left(new Error(closed)))
                    }
                }
            }))
        },
        send(data: any): void {
            O.match(
                // onNone
                () => {}, 
                // onSome
                (socket: Socket) => {
                    socket.write(data)
                }
            )(socket)
        },
        events: events,
        dispose: () => {
            O.match(
                // onNone
                () => {}, 
                // onSome
                (socket: Socket) => {
                    socket.write = () => 0;
                    socket.end();
                }
            )(socket)
            events.dispose();
        }
    }
}

export async function socket_IO_client_cell(name: string, ip: string, port: number){
    const remote_server = await socket_wrapper(ip, port)
    return remote_cell(name, remote_server)

}