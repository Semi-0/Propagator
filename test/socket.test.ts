import { socket_IO_client_cell } from "../Cell/SocketIOCell";
import { r_inspect_content } from "../AdvanceReactivity/operator";
import { execute_all_tasks_sequential } from "../Shared/Reactivity/Scheduler";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { test } from "bun:test";
import { cell_strongest_base_value } from "@/cell/Cell";
import { construct_cell, cell_strongest_value } from "@/cell/Cell";
import { c_add } from "../Propagator/BuiltInProps";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";

describe("SocketIOCell", () => {
  let server: ReturnType<typeof Bun.listen>;
  let serverPort: number;
  let receivedData: any;

  beforeEach(async () => {
    serverPort = 3000 + Math.floor(Math.random() * 1000); // Random port to avoid conflicts
    // @ts-ignore
    server = Bun.listen({
      hostname: "localhost",
      port: serverPort,
      socket: {
        data(socket, data) {
          // Parse incoming data
          receivedData = JSON.parse(data.toString());
          console.log("Server received:", receivedData);
          
          // Send response back
          socket.write(JSON.stringify({ confirmation: true, newValue: 100 }));
        },
        open(socket) {
          console.log("Client connected");
        },
        close(socket) {
          console.log("Client disconnected");
        },
        error(socket, error) {
          console.error("Socket error:", error);
        }
      }
    });
    
    console.log(`Server listening on port ${serverPort}`);
  });

  afterEach(() => {
    server.stop();
  });

  test("should able to send data to server", async () => {
    const testData = { value: 42, premise: "test" };
    const serverResponseData = { confirmation: true, newValue: 100 };
    
    // Create SocketIO cell
    const cell = await socket_IO_client_cell("socket-cell", "localhost", serverPort);
    
    // Test sending data
    cell.addContent(testData);

    // Wait for data exchange to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    execute_all_tasks_sequential((e) => {});
    
    // Verify data was received by the server
    expect(receivedData).toEqual(testData);

    // Wait for client to process the server's response 
    await new Promise(resolve => setTimeout(resolve, 200));
    execute_all_tasks_sequential((e) => {});

    // Verify cell received the data from server
    expect(cell_strongest_base_value(cell)).toEqual(serverResponseData);

    cell.dispose();
  });

});