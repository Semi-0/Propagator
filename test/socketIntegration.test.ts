import { socket_IO_client_cell } from "../Cell/RemoteCell/SocketClientCell";
import { execute_all_tasks_sequential } from "../Shared/Reactivity/Scheduler";
import { describe, it, expect, beforeEach, afterEach, test } from "bun:test";
import { cell_strongest_base_value, construct_cell } from "@/cell/Cell";

import { c_multiply } from "../Propagator/BuiltInProps";
import { tell } from "../Helper/UI";
import { update } from "../AdvanceReactivity/update";

import SuperJSON from "superjson";
import type { TCPSocketConnectOptions, TCPSocketListenOptions } from "bun";
import { type Server } from "bun";
import { r_multiply } from "../AdvanceReactivity/operator";

describe("SocketIOCell Propagator Integration", () => {
    /// FOR EFFECTIVE IO WE NEED TO FIGURE OUT A WAY TO JSONIFY THE DATA EFFECTIVELY
  let server: ReturnType<typeof Bun.listen<undefined>>;
  let serverPort: number;
  let receivedData: any;
  let connectionPromise: Promise<void>;
  let resolveConnection: () => void;

  beforeEach(async () => {
    serverPort = 3000 + Math.floor(Math.random() * 1000);
    connectionPromise = new Promise(resolve => resolveConnection = resolve);
    //@ts-ignore
    server = await Bun.listen({
      hostname: "localhost",
      port: serverPort,
      socket: {
        data(socket, data) {
          // Parse incoming data and extract the actual object from SuperJSON format
          try {
            const parsedData = SuperJSON.parse(data.toString());
            receivedData = parsedData.json || parsedData;
            console.log("Server received:", parsedData);
            socket.write(SuperJSON.stringify({ confirmation: true, newValue: 100 }));
          } catch (err) {
            console.log("parse failed ")
            console.log(data.toString())
            console.error("Parsing error:", err);
          }
        },
        open(socket) {
          console.log("Client connected");
        },
        close(socket) {
          console.log("Client disconnected");
        },
        error(socket, error) {
          console.error("Socket error:", error )
        }
      }
    });
    
    console.log(`Server listening on port ${serverPort}`);
  });

  afterEach(async () => {
    server.stop();
    await execute_all_tasks_sequential(() => {});
  });

  test("should integrate socket cell with propagator network", async () => {
    const socketCell = await socket_IO_client_cell("socket-cell", "localhost", serverPort);
    const localCell = construct_cell("local-cell");
    const resultCell = construct_cell("result-cell");
    //@ts-ignore
    r_multiply(socketCell, localCell, resultCell);
    update(localCell, 5) 


    update(socketCell, 10)

    await new Promise(resolve => setTimeout(resolve, 200));
    await execute_all_tasks_sequential(console.error);
    
    // Verify server received data
    expect(receivedData).toEqual("10\ntime_stamp layer: ");
    
    // Verify server response processing
    await execute_all_tasks_sequential(console.error);
    expect(cell_strongest_base_value(socketCell)).toEqual({ value: 20 });
    expect(cell_strongest_base_value(resultCell)).toBe(100);

    // Test bidirectional propagation
    update(resultCell, 200);
    await execute_all_tasks_sequential(console.error);
    expect(cell_strongest_base_value(localCell)).toBe(10);

    // Verify cleanup
    socketCell.dispose();
    await execute_all_tasks_sequential(console.error);
    expect(socketCell.getContent().get_value()).toEqual(the_nothing);
  });

  test("should handle multiple socket cells in a constraint network", async () => {
    // Create two socket cells and a local result cell
    const socketCellA = await socket_IO_client_cell("socket-cell-A", "localhost", serverPort);
    const socketCellB = await socket_IO_client_cell("socket-cell-B", "localhost", serverPort);
    const resultCell = construct_cell("sum-result");
    
    // Connect cells with a constraint
    r_multiply(socketCellA, socketCellB, resultCell);
    
    // Update socket cells
    update(socketCellA, 5);
    
    // Wait for communication
    await new Promise(resolve => setTimeout(resolve, 200));
    await execute_all_tasks_sequential((e) => {});
    
    // Server doubles the value, so socketCellA should now have value 10
    update(socketCellB, 3);
    
    // Wait for communication
    await new Promise(resolve => setTimeout(resolve, 200));
    await execute_all_tasks_sequential((e) => {});
    
    // Server doubles the value, so socketCellB should now have value 6
    
    // Wait for constraint propagation
    await new Promise(resolve => setTimeout(resolve, 200));
    await execute_all_tasks_sequential((e) => {});
    
    // Verify result: socketCellA (10) * socketCellB (6) = 60
    expect(cell_strongest_base_value(resultCell)).toBe(60);
    
    // Clean up
    socketCellA.dispose();
    socketCellB.dispose();
  });
}); 