import { socket_IO_client_cell } from "../Cell/SocketIOCell";
import { execute_all_tasks_sequential } from "../Shared/Reactivity/Scheduler";
import { describe, it, expect, beforeEach, afterEach, test } from "bun:test";
import { cell_strongest_base_value, construct_cell } from "@/cell/Cell";
import { make_partial_data } from "../DataTypes/PartialData";
import { c_multiply } from "../Propagator/BuiltInProps";
import { tell } from "../Helper/UI";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { update } from "../AdvanceReactivity/update";
import { r_inspect_content, r_inspect_strongest } from "../AdvanceReactivity/operator";
import SuperJSON from "superjson";
describe("SocketIOCell Propagator Integration", () => {
    /// FOR EFFECTIVE IO WE NEED TO FIGURE OUT A WAY TO JSONIFY THE DATA EFFECTIVELY
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
          receivedData = SuperJSON.parse(data.toString());
          console.log("Server received:", to_string(receivedData));
          
          // Send response back with multiplication result
          if (receivedData && typeof receivedData.value === 'number') {
            socket.write(SuperJSON.stringify({ value: receivedData.value * 2 }));
          } else {
            socket.write(SuperJSON.stringify(receivedData));
          }
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

  test("should integrate socket cell with propagator network", async () => {
    // Create socket cell and local cells
    const socketCell = await socket_IO_client_cell("socket-cell", "localhost", serverPort);
    const localCell = construct_cell("local-cell");
    const resultCell = construct_cell("result-cell");
    
    // Set up propagator network with c_multiply
    c_multiply(socketCell, localCell, resultCell);
    
    // Add content to the cells
    tell(localCell, make_partial_data(5), "initial-value");
    
    // Wait a bit for socket connection to establish
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Send data through socket cell
    update(socketCell, 10);
    
    // Wait for server to process and respond
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Execute all tasks to process propagator updates
    await execute_all_tasks_sequential((e) => {
      if (e) console.error("Scheduler error:", e);
    });
    
    // Inspect cells for debugging
    r_inspect_content(socketCell);
    r_inspect_content(localCell);
    r_inspect_content(resultCell);
    
    // Verify that data was received by the server
    expect(receivedData).toHaveProperty('value', 10);
    
    // Wait for propagation to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    await execute_all_tasks_sequential((e) => {});
    
    // Verify that the socket cell received the doubled value from server
    expect(cell_strongest_base_value(socketCell)).toHaveProperty('value', 20);
    
    // Verify that the result cell has the correct multiplication
    // Socket cell value (20) * local cell value (5) = 100
    expect(cell_strongest_base_value(resultCell)).toBe(100);
    
    // Test bidirectional constraint propagation by updating the result
    update(resultCell, 200);
    
    // Wait for propagation
    await new Promise(resolve => setTimeout(resolve, 300));
    await execute_all_tasks_sequential((e) => {});
    
    // Verify that the local cell value was updated to maintain the constraint
    // Result (200) / socket cell value (20) = 10
    expect(cell_strongest_base_value(localCell)).toBe(10);
    
    // Clean up
    socketCell.dispose();
  });

  test("should handle multiple socket cells in a constraint network", async () => {
    // Create two socket cells and a local result cell
    const socketCellA = await socket_IO_client_cell("socket-cell-A", "localhost", serverPort);
    const socketCellB = await socket_IO_client_cell("socket-cell-B", "localhost", serverPort);
    const resultCell = construct_cell("sum-result");
    
    // Connect cells with a constraint
    c_multiply(socketCellA, socketCellB, resultCell);
    
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