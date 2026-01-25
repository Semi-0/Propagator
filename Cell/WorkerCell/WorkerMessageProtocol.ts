/**
 * Message protocol for communication between main thread and worker threads
 * All messages are serializable and follow a functional, immutable pattern
 */

import type { CellValue } from "../CellValue";
import type { NeighborType } from "../Cell";
import SuperJSON from "superjson";

export enum WorkerMessageType {
  // Cell operations
  CELL_UPDATE = "cell_update",
  CELL_GET_CONTENT = "cell_get_content",
  CELL_GET_STRONGEST = "cell_get_strongest",
  CELL_TEST_CONTENT = "cell_test_content",
  CELL_DISPOSE = "cell_dispose",
  CELL_SUMMARIZE = "cell_summarize",
  
  // Neighbor operations
  CELL_ADD_NEIGHBOR = "cell_add_neighbor",
  CELL_REMOVE_NEIGHBOR = "cell_remove_neighbor",
  CELL_GET_NEIGHBORS = "cell_get_neighbors",
  
  // Responses
  CELL_RESPONSE = "cell_response",
  CELL_ERROR = "cell_error",
  
  // Notifications (worker -> main)
  CELL_STRONGEST_CHANGED = "cell_strongest_changed",
  CELL_NEIGHBOR_ALERT = "cell_neighbor_alert",
  
  // Lifecycle
  CELL_INIT = "cell_init",
  CELL_READY = "cell_ready",
  CELL_TERMINATE = "cell_terminate",
}

export interface WorkerMessage {
  type: WorkerMessageType;
  cellId: string;
  messageId: string; // For request/response correlation
  payload?: any;
  timestamp?: number;
}

export interface CellInitPayload {
  name: string;
  id: string | null;
  initialContent?: CellValue<any>;
  initialStrongest?: CellValue<any>;
  parentId?: string | null;
}

export interface CellUpdatePayload {
  increment: CellValue<any>;
}

export interface CellAddNeighborPayload {
  propagatorId: string;
  interestedIn: NeighborType[];
}

export interface CellNeighborAlertPayload {
  propagatorId: string;
  neighborType: NeighborType;
}

export interface CellResponsePayload {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Serialize a message for transmission
 */
export const serializeMessage = (message: WorkerMessage): string => {
  return SuperJSON.stringify(message);
};

/**
 * Deserialize a message from transmission
 */
export const deserializeMessage = (data: string): WorkerMessage => {
  return SuperJSON.parse(data);
};

/**
 * Create a message with automatic ID generation
 */
export const createMessage = (
  type: WorkerMessageType,
  cellId: string,
  payload?: any
): WorkerMessage => {
  return {
    type,
    cellId,
    messageId: `${cellId}_${Date.now()}_${Math.random()}`,
    payload,
    timestamp: Date.now(),
  };
};

/**
 * Create a response message
 */
export const createResponse = (
  originalMessage: WorkerMessage,
  success: boolean,
  data?: any,
  error?: string
): WorkerMessage => {
  return {
    type: WorkerMessageType.CELL_RESPONSE,
    cellId: originalMessage.cellId,
    messageId: originalMessage.messageId,
    payload: {
      success,
      data,
      error,
    } as CellResponsePayload,
    timestamp: Date.now(),
  };
};
