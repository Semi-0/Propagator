import { socket_IO_client_cell } from "../Cell/RemoteCell/SocketClientCell";
import { execute_all_tasks_sequential } from "../Shared/Reactivity/Scheduler";
import { describe, it, expect, beforeEach, afterEach, test } from "bun:test";
import { cell_id, cell_strongest, cell_strongest_base_value, construct_cell, type Cell } from "@/cell/Cell";

import { c_multiply } from "../Propagator/BuiltInProps";
import { tell } from "../Helper/UI";
import { update } from "../AdvanceReactivity/interface";

import SuperJSON from "superjson";
import type { TCPSocketConnectOptions, TCPSocketListenOptions } from "bun";
import { inspect, type Server } from "bun";
import { p_multiply } from "../Propagator/BuiltInProps";
import { the_nothing } from "@/cell/CellValue";
import { compound_propagator, construct_propagator } from "../Propagator/Propagator";
import { pipe } from "fp-ts/lib/function";

import { map, subscribe } from "../Shared/Reactivity/Reactor" 
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { get_base_value } from "sando-layer/Basic/Layer";
import { annotate_identified_timestamp } from "../AdvanceReactivity/traced_timestamp/Annotater";
import { link, make_ce_arithmetical } from "../Propagator/Sugar";
import { to_number } from "generic-handler/built_in_generics/generic_conversation";
import { inspect_content } from "../Helper/Debug";


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
            socket.write(SuperJSON.stringify(20));
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

    const unwrap = (input: Cell<LayeredObject>, output: Cell<any>) =>  construct_propagator("unwrap_time", [input], [output], 
      () => {
        // @ts-ignore
        pipe(cell_strongest(input),
          map((a: LayeredObject) => {
            return get_base_value(a)
          }),
          subscribe((a: number) => {
            output.addContent(a)
          })
        )
      }
    )

    const wrap = (input: Cell<any>, output: Cell<LayeredObject>) => construct_propagator("wrap_time", [input], [output],
      () => {

        pipe(cell_strongest(input),
          // @ts-ignore
          map((a: number) => {
            return pipe(a,
              // @ts-ignore
              (a: number) => annotate_identified_timestamp(cell_id(input))(a, Date.now())
            )
          }),
          subscribe((a: LayeredObject) => {
            output.addContent(a)
          })
      )
      }
    )

    const timed = (a: Cell<any>, b: Cell<any>) => compound_propagator([a, b], [a, b], () => {
      link(a, b, unwrap, wrap)
    }, "timed")

    const ce_timed = make_ce_arithmetical(timed)

    //@ts-ignore
    p_multiply(ce_timed(socketCell), localCell, resultCell);
    update(localCell, 5) 


    update(socketCell, 10)

    await new Promise(resolve => setTimeout(resolve, 200));
    await execute_all_tasks_sequential(console.error);
    
    // Verify server received data
    expect(receivedData).toEqual("10\ntime_stamp layer: ");
    
    // Verify server response processing
    await execute_all_tasks_sequential(console.error);
    expect(cell_strongest_base_value(socketCell)).toEqual(20);
    expect(cell_strongest_base_value(resultCell)).toBe(100);
    inspect_content(socketCell)
    
    socketCell.dispose();

    
    // Reset receivedData to track if server receives any more messages
    receivedData = null;
    
    // Verify sending messages after disposal doesn't cause errors
    socketCell.addContent(30); // This should be safely ignored after disposal
    
    await new Promise(resolve => setTimeout(resolve, 100));
    await execute_all_tasks_sequential(console.error);
    
    // Verify no data was sent to the server after disposal
    expect(receivedData).toBeNull();
  });

  // test("should handle multiple socket cells in a constraint network", async () => {
  //   // Create two socket cells and a local result cell
  //   const socketCellA = await socket_IO_client_cell("socket-cell-A", "localhost", serverPort);
  //   const socketCellB = await socket_IO_client_cell("socket-cell-B", "localhost", serverPort);
  //   const resultCell = construct_cell("sum-result");
    
  //   // Connect cells with a constraint
  //   p_multiply(socketCellA, socketCellB, resultCell);
    
  //   // Update socket cells
  //   update(socketCellA, 5);
    
  //   // Wait for communication
  //   await new Promise(resolve => setTimeout(resolve, 200));
  //   await execute_all_tasks_sequential((e) => {});
    
  //   // Server doubles the value, so socketCellA should now have value 10
  //   update(socketCellB, 3);
    
  //   // Wait for communication
  //   await new Promise(resolve => setTimeout(resolve, 200));
  //   await execute_all_tasks_sequential((e) => {});
    
  //   // Server doubles the value, so socketCellB should now have value 6
    
  //   // Wait for constraint propagation
  //   await new Promise(resolve => setTimeout(resolve, 200));
  //   await execute_all_tasks_sequential((e) => {});
    
  //   // Verify result: socketCellA (10) * socketCellB (6) = 60
  //   expect(cell_strongest_base_value(resultCell)).toBe(60);
    
  //   // Clean up
  //   socketCellA.dispose();
  //   socketCellB.dispose();
  // });
}); 