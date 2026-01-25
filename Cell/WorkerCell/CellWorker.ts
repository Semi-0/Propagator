/**
 * Worker script that runs a cell in isolation
 * This file runs in a worker thread context
 */

import { primitive_construct_cell, type Cell } from "../Cell";
import { WorkerMessageType, type WorkerMessage, type CellInitPayload, type CellUpdatePayload, type CellAddNeighborPayload } from "./WorkerMessageProtocol";
import { deserializeMessage, serializeMessage, createResponse, createMessage } from "./WorkerMessageProtocol";
import { alert_interested_propagators, NeighborType } from "../Cell";
import { the_nothing } from "../CellValue";
import type { Propagator } from "../../Propagator/Propagator";

// Worker-local cell storage
const cells = new Map<string, Cell<any>>();

// Propagator registry - stores propagator references by ID
// In worker context, we only store IDs, not actual propagator objects
const propagatorRegistry = new Map<string, {
  id: string;
  interestedIn: NeighborType[];
}>();

/**
 * Handle cell initialization
 */
const handleCellInit = (message: WorkerMessage): WorkerMessage => {
  const payload = message.payload as CellInitPayload;
  
  try {
    // Create the cell in the worker thread
    const cell = primitive_construct_cell(
      payload.name,
      payload.id,
      {
        content: payload.initialContent ?? the_nothing,
        strongest: payload.initialStrongest ?? the_nothing,
        neighbors: new Map(),
        active: true,
      }
    );
    
    cells.set(message.cellId, cell);
    
    // Override addNeighbor to work with propagator IDs instead of objects
    const originalAddNeighbor = cell.addNeighbor;
    cell.addNeighbor = (propagator: Propagator, interestedIn: NeighborType[]) => {
      // Store propagator ID instead of object
      const propagatorId = propagator.getRelation().get_id();
      propagatorRegistry.set(propagatorId, {
        id: propagatorId,
        interestedIn,
      });
      
      // Create a mock neighbor entry
      const neighbors = cell.getNeighbors();
      neighbors.set(propagatorId, {
        type: interestedIn,
        propagator: propagator, // Keep reference for internal use
      });
      
      // Notify main thread about neighbor addition
      self.postMessage(createMessage(
        WorkerMessageType.CELL_NEIGHBOR_ALERT,
        message.cellId,
        {
          propagatorId,
          neighborType: NeighborType.neighbor_added,
        }
      ));
      
      // Alert interested propagators (this will be handled by main thread)
      if (!interestedIn.includes(NeighborType.dependents)) {
        self.postMessage(createMessage(
          WorkerMessageType.CELL_NEIGHBOR_ALERT,
          message.cellId,
          {
            propagatorId,
            neighborType: NeighborType.updated,
          }
        ));
      }
    };
    
    // Override removeNeighbor
    const originalRemoveNeighbor = cell.removeNeighbor;
    cell.removeNeighbor = (propagator: Propagator) => {
      const propagatorId = propagator.getRelation().get_id();
      propagatorRegistry.delete(propagatorId);
      originalRemoveNeighbor.call(cell, propagator);
      
      // Notify main thread
      self.postMessage(createMessage(
        WorkerMessageType.CELL_NEIGHBOR_ALERT,
        message.cellId,
        {
          propagatorId,
          neighborType: NeighborType.neighbor_removed,
        }
      ));
    };
    
    // Override set_strongest to notify main thread
    // We need to intercept strongest changes
    const originalUpdate = cell.update;
    let lastStrongest = cell.getStrongest();
    
    cell.update = (increment: any) => {
      const result = originalUpdate.call(cell, increment);
      const newStrongest = cell.getStrongest();
      
      // If strongest changed, notify main thread
      if (newStrongest !== lastStrongest) {
        lastStrongest = newStrongest;
        self.postMessage(createMessage(
          WorkerMessageType.CELL_STRONGEST_CHANGED,
          message.cellId,
          {
            strongest: newStrongest,
            content: cell.getContent(),
          }
        ));
      }
      
      return result;
    };
    
    // Override testContent to notify on strongest changes
    const originalTestContent = cell.testContent;
    cell.testContent = () => {
      const result = originalTestContent.call(cell);
      const newStrongest = cell.getStrongest();
      
      if (newStrongest !== lastStrongest) {
        lastStrongest = newStrongest;
        self.postMessage(createMessage(
          WorkerMessageType.CELL_STRONGEST_CHANGED,
          message.cellId,
          {
            strongest: newStrongest,
            content: cell.getContent(),
          }
        ));
      }
      
      return result;
    };
    
    return createResponse(message, true, {
      cellId: message.cellId,
      name: payload.name,
    });
  } catch (error: any) {
    return createResponse(message, false, undefined, error.message);
  }
};

/**
 * Handle cell update
 */
const handleCellUpdate = (message: WorkerMessage): WorkerMessage => {
  const cell = cells.get(message.cellId);
  if (!cell) {
    return createResponse(message, false, undefined, `Cell ${message.cellId} not found`);
  }
  
  try {
    const payload = message.payload as CellUpdatePayload;
    cell.update(payload.increment ?? the_nothing);
    return createResponse(message, true, { success: true });
  } catch (error: any) {
    return createResponse(message, false, undefined, error.message);
  }
};

/**
 * Handle get content
 */
const handleGetContent = (message: WorkerMessage): WorkerMessage => {
  const cell = cells.get(message.cellId);
  if (!cell) {
    return createResponse(message, false, undefined, `Cell ${message.cellId} not found`);
  }
  
  try {
    return createResponse(message, true, { content: cell.getContent() });
  } catch (error: any) {
    return createResponse(message, false, undefined, error.message);
  }
};

/**
 * Handle get strongest
 */
const handleGetStrongest = (message: WorkerMessage): WorkerMessage => {
  const cell = cells.get(message.cellId);
  if (!cell) {
    return createResponse(message, false, undefined, `Cell ${message.cellId} not found`);
  }
  
  try {
    return createResponse(message, true, { strongest: cell.getStrongest() });
  } catch (error: any) {
    return createResponse(message, false, undefined, error.message);
  }
};

/**
 * Handle test content
 */
const handleTestContent = (message: WorkerMessage): WorkerMessage => {
  const cell = cells.get(message.cellId);
  if (!cell) {
    return createResponse(message, false, undefined, `Cell ${message.cellId} not found`);
  }
  
  try {
    cell.testContent();
    return createResponse(message, true, { success: true });
  } catch (error: any) {
    return createResponse(message, false, undefined, error.message);
  }
};

/**
 * Handle dispose
 */
const handleDispose = (message: WorkerMessage): WorkerMessage => {
  const cell = cells.get(message.cellId);
  if (!cell) {
    return createResponse(message, false, undefined, `Cell ${message.cellId} not found`);
  }
  
  try {
    cell.dispose();
    cells.delete(message.cellId);
    propagatorRegistry.clear();
    return createResponse(message, true, { success: true });
  } catch (error: any) {
    return createResponse(message, false, undefined, error.message);
  }
};

/**
 * Handle summarize
 */
const handleSummarize = (message: WorkerMessage): WorkerMessage => {
  const cell = cells.get(message.cellId);
  if (!cell) {
    return createResponse(message, false, undefined, `Cell ${message.cellId} not found`);
  }
  
  try {
    return createResponse(message, true, { summary: cell.summarize() });
  } catch (error: any) {
    return createResponse(message, false, undefined, error.message);
  }
};

/**
 * Handle get neighbors
 */
const handleGetNeighbors = (message: WorkerMessage): WorkerMessage => {
  const cell = cells.get(message.cellId);
  if (!cell) {
    return createResponse(message, false, undefined, `Cell ${message.cellId} not found`);
  }
  
  try {
    const neighbors = cell.getNeighbors();
    // Convert to serializable format
    const neighborIds = Array.from(neighbors.keys());
    return createResponse(message, true, { neighborIds });
  } catch (error: any) {
    return createResponse(message, false, undefined, error.message);
  }
};

/**
 * Main message handler
 */
const handleMessage = (event: MessageEvent) => {
  try {
    const message = deserializeMessage(event.data);
    let response: WorkerMessage;
    
    switch (message.type) {
      case WorkerMessageType.CELL_INIT:
        response = handleCellInit(message);
        break;
      case WorkerMessageType.CELL_UPDATE:
        response = handleCellUpdate(message);
        break;
      case WorkerMessageType.CELL_GET_CONTENT:
        response = handleGetContent(message);
        break;
      case WorkerMessageType.CELL_GET_STRONGEST:
        response = handleGetStrongest(message);
        break;
      case WorkerMessageType.CELL_TEST_CONTENT:
        response = handleTestContent(message);
        break;
      case WorkerMessageType.CELL_DISPOSE:
        response = handleDispose(message);
        break;
      case WorkerMessageType.CELL_SUMMARIZE:
        response = handleSummarize(message);
        break;
      case WorkerMessageType.CELL_GET_NEIGHBORS:
        response = handleGetNeighbors(message);
        break;
      case WorkerMessageType.CELL_TERMINATE:
        // Clean up all cells
        cells.forEach(cell => cell.dispose());
        cells.clear();
        propagatorRegistry.clear();
        self.close();
        return;
      default:
        response = createResponse(message, false, undefined, `Unknown message type: ${message.type}`);
    }
    
    self.postMessage(serializeMessage(response));
  } catch (error: any) {
    const errorMessage = createMessage(
      WorkerMessageType.CELL_ERROR,
      "unknown",
      { error: error.message, stack: error.stack }
    );
    self.postMessage(serializeMessage(errorMessage));
  }
};

// Set up message listener
self.addEventListener("message", handleMessage);

// Signal readiness
self.postMessage(serializeMessage(createMessage(
  WorkerMessageType.CELL_READY,
  "worker",
  { ready: true }
)));
