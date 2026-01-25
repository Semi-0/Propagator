/**
 * Worker pool manager for distributing cells across worker threads
 * Uses a functional approach with immutable state updates
 */

import { WorkerMessageType, type WorkerMessage } from "./WorkerMessageProtocol";
import { serializeMessage, deserializeMessage, createMessage } from "./WorkerMessageProtocol";
import { pipe } from "fp-ts/lib/function";

export interface WorkerState {
  worker: Worker;
  cellIds: Set<string>;
  isReady: boolean;
  pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>;
}

export type WorkerPoolState = {
  workers: WorkerState[];
  cellToWorker: Map<string, number>; // cellId -> worker index
  nextWorkerIndex: number;
  maxWorkers: number;
};

/**
 * Create initial worker pool state
 */
export const createWorkerPoolState = (maxWorkers: number = navigator.hardwareConcurrency || 4): WorkerPoolState => {
  return {
    workers: [],
    cellToWorker: new Map(),
    nextWorkerIndex: 0,
    maxWorkers,
  };
};

/**
 * Create a new worker and initialize it
 */
const createWorker = (): Promise<WorkerState> => {
  return new Promise((resolve, reject) => {
    // For Bun, we can use import.meta.resolve or a direct path
    // The worker script should be a separate file that can be loaded
    const workerPath = new URL('./CellWorker.ts', import.meta.url).pathname;
    
    // Bun supports Worker with file paths
    const worker = new Worker(workerPath, {
      type: 'module',
    });
    
    const state: WorkerState = {
      worker,
      cellIds: new Set(),
      isReady: false,
      pendingRequests: new Map(),
    };
    
    // Set up message handler
    worker.onmessage = (event) => {
      try {
        const message = deserializeMessage(event.data);
        
        if (message.type === WorkerMessageType.CELL_READY) {
          state.isReady = true;
          resolve(state);
        } else if (message.type === WorkerMessageType.CELL_RESPONSE) {
          const request = state.pendingRequests.get(message.messageId);
          if (request) {
            clearTimeout(request.timeout);
            state.pendingRequests.delete(message.messageId);
            request.resolve(message.payload);
          }
        } else if (message.type === WorkerMessageType.CELL_ERROR) {
          const request = state.pendingRequests.get(message.messageId);
          if (request) {
            clearTimeout(request.timeout);
            state.pendingRequests.delete(message.messageId);
            request.reject(new Error(message.payload?.error || 'Unknown error'));
          }
        } else {
          // Handle notifications (strongest changed, neighbor alerts, etc.)
          // These will be handled by the WorkerCell proxy
        }
      } catch (error: any) {
        reject(error);
      }
    };
    
    worker.onerror = (error) => {
      reject(error);
    };
    
    // Set timeout for worker initialization
    setTimeout(() => {
      if (!state.isReady) {
        reject(new Error('Worker initialization timeout'));
      }
    }, 5000);
  });
};

/**
 * Get or create a worker for a cell
 */
export const getWorkerForCell = async (
  poolState: WorkerPoolState,
  cellId: string
): Promise<{ poolState: WorkerPoolState; workerIndex: number }> => {
  // Check if cell already has a worker
  const existingIndex = poolState.cellToWorker.get(cellId);
  if (existingIndex !== undefined && poolState.workers[existingIndex]) {
    return { poolState, workerIndex: existingIndex };
  }
  
  // Find a worker with capacity (round-robin)
  let workerIndex = poolState.nextWorkerIndex;
  
  // If we haven't reached max workers, create a new one
  if (poolState.workers.length < poolState.maxWorkers) {
    const newWorker = await createWorker();
    const newWorkers = [...poolState.workers, newWorker];
    workerIndex = newWorkers.length - 1;
    
    return {
      poolState: {
        ...poolState,
        workers: newWorkers,
        cellToWorker: new Map(poolState.cellToWorker).set(cellId, workerIndex),
        nextWorkerIndex: (workerIndex + 1) % poolState.maxWorkers,
      },
      workerIndex,
    };
  }
  
  // Use round-robin to assign to existing worker
  const worker = poolState.workers[workerIndex];
  worker.cellIds.add(cellId);
  
  return {
    poolState: {
      ...poolState,
      cellToWorker: new Map(poolState.cellToWorker).set(cellId, workerIndex),
      nextWorkerIndex: (workerIndex + 1) % poolState.maxWorkers,
    },
    workerIndex,
  };
};

/**
 * Send a message to a worker and wait for response
 */
export const sendMessageToWorker = (
  poolState: WorkerPoolState,
  workerIndex: number,
  message: WorkerMessage,
  timeout: number = 5000
): Promise<any> => {
  const worker = poolState.workers[workerIndex];
  if (!worker) {
    return Promise.reject(new Error(`Worker ${workerIndex} not found`));
  }
  
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      worker.pendingRequests.delete(message.messageId);
      reject(new Error(`Request timeout for message ${message.messageId}`));
    }, timeout);
    
    worker.pendingRequests.set(message.messageId, {
      resolve,
      reject,
      timeout: timeoutId,
    });
    
    worker.worker.postMessage(serializeMessage(message));
  });
};

/**
 * Remove a cell from its worker
 */
export const removeCellFromWorker = (
  poolState: WorkerPoolState,
  cellId: string
): WorkerPoolState => {
  const workerIndex = poolState.cellToWorker.get(cellId);
  if (workerIndex === undefined) {
    return poolState;
  }
  
  const worker = poolState.workers[workerIndex];
  if (worker) {
    worker.cellIds.delete(cellId);
  }
  
  const newCellToWorker = new Map(poolState.cellToWorker);
  newCellToWorker.delete(cellId);
  
  return {
    ...poolState,
    cellToWorker: newCellToWorker,
  };
};

/**
 * Terminate all workers and clean up
 */
export const terminateWorkerPool = (poolState: WorkerPoolState): void => {
  poolState.workers.forEach(worker => {
    // Send terminate message to each worker
    const terminateMessage = createMessage(
      WorkerMessageType.CELL_TERMINATE,
      "all"
    );
    worker.worker.postMessage(serializeMessage(terminateMessage));
    
    // Clear pending requests
    worker.pendingRequests.forEach(request => {
      clearTimeout(request.timeout);
      request.reject(new Error('Worker pool terminated'));
    });
    worker.pendingRequests.clear();
    
    // Terminate worker
    worker.worker.terminate();
  });
};
