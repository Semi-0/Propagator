import type { Socket, Server } from "bun";
import { construct_reactor } from "../../Shared/Reactivity/Reactor";
import type { RemoteConnector } from "../../RemoteServer/RemoteConnector";
import { left, right } from "fp-ts/lib/Either";
import { closed, remote_cell } from "./RemoteCell";
import type { Option } from "fp-ts/lib/Option";
import { none, some } from "fp-ts/lib/Option";
import  * as O from "fp-ts/lib/Option"

async function socket_server_wrapper(port: number, ip: string = "0.0.0.0"): Promise<RemoteConnector>{
    let server: Option<Server> = none;
    const connectedSockets = new Set<Socket>();
    var events = construct_reactor() 

    return {
        connect: async () => {
            server = some(Bun.listen({
                hostname: ip,
                port: port,
                socket: {
                    data: (socket: Socket, data: any) => {
                        events.next(right(data))
                    },
                    open: (socket: Socket) => {
                        connectedSockets.add(socket);
                    },
                    close: (socket: Socket) => {
                        connectedSockets.delete(socket);
                    },
                    error: (socket: Socket, error: Error) => {
                        events.next(left(error))
                    },
                    drain: (socket: Socket) => {
                        // 
                    }
                }
            }))
        },
        send(data: any): void {
            // Broadcast to all connected clients
            for (const socket of connectedSockets) {
                socket.write(data);
            }
        },
        events: events,
        dispose: () => {
            // Close all sockets
            for (const socket of connectedSockets) {
                socket.end();
            }
            connectedSockets.clear();
            
            O.match(
                () => {}, 
                (s: Server) => {
                    s.stop();
                }
            )(server)
            events.dispose();
        }
    }
}

export async function socket_IO_server_cell(name: string, port: number, ip: string = "0.0.0.0"){
    const remote_server = await socket_server_wrapper(port, ip)
    return remote_cell(name, remote_server)
}

