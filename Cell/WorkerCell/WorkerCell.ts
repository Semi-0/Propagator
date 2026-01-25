/**
 * WorkerCell - A proxy cell that communicates with a worker thread
 * Implements the Cell interface but delegates operations to a worker
 */

import type { Cell, NeighborType, interesetedNeighbor } from "../Cell";
import type { CellValue } from "../CellValue";
import type { Primitive_Relation } from "../../DataTypes/Relation";
import type { Propagator } from "../../Propagator/Propagator";
import { WorkerMessageType, type WorkerMessage, type CellInitPayload } from "./WorkerMessageProtocol";
import { createMessage, serializeMessage, deserializeMessage } from "./WorkerMessageProtocol";
import { getWorkerForCell, sendMessageToWorker, removeCellFromWorker, type WorkerPoolState } from "./WorkerPool";
import { make_relation } from "../../DataTypes/Relation";
import { get_global_parent, PublicStateCommand, set_global_state } from "../../Shared/PublicState";
import { alert_propagator } from "../../Shared/Scheduler/Scheduler";
import { alert_interested_propagators } from "../Cell";
import { get_id } from "../../Shared/Generics";

/**
 * Create a cell that runs in a worker thread
 */
export async function construct_worker_cell<A>(
  name: string,
  id: string | null = null,
  poolState: WorkerPoolState,
  initialData?: {
    content?: CellValue<A>;
    strongest?: CellValue<A>;
  }
): Promise<{ cell: Cell<A>; poolState: WorkerPoolState }> {
  const relation = make_relation(name, get_global_parent(), id);
  const cellId = relation.get_id();
  
  // Get or create a worker for this cell
  const { poolState: updatedPoolState, workerIndex } = await getWorkerForCell(poolState, cellId);
  
  // Local cache for cell state (updated via notifications from worker)
  let cachedContent: CellValue<A> = initialData?.content ?? "&&the_nothing&&";
  let cachedStrongest: CellValue<A> = initialData?.strongest ?? "&&the_nothing&&";
  const neighbors: Map<string, interesetedNeighbor> = new Map();
  
  // Propagator registry - maps propagator IDs to actual propagator objects
  const propagatorRegistry = new Map<string, Propagator>();
  
  // Set up notification handler for this worker
  const worker = updatedPoolState.workers[workerIndex];
  
  // Add event listener for notifications (in addition to existing handler)
  const notificationHandler = (event: MessageEvent) => {
    try {
      const message = deserializeMessage(event.data);
      
      // Handle notifications from worker
      if (message.cellId === cellId) {
        if (message.type === WorkerMessageType.CELL_STRONGEST_CHANGED) {
          cachedStrongest = message.payload.strongest;
          cachedContent = message.payload.content;
          
          // Alert interested propagators in main thread
          alert_interested_propagators(neighbors, "updated" as NeighborType);
        } else if (message.type === WorkerMessageType.CELL_NEIGHBOR_ALERT) {
          const { propagatorId, neighborType } = message.payload;
          const propagator = propagatorRegistry.get(propagatorId);
          
          if (propagator) {
            // Alert the propagator in main thread
            alert_propagator(propagator);
          }
        }
      }
    } catch (error) {
      console.error("Error handling worker notification:", error);
    }
  };
  
  worker.worker.addEventListener("message", notificationHandler);
  
  // Initialize cell in worker
  const initMessage = createMessage(WorkerMessageType.CELL_INIT, cellId, {
    name,
    id,
    initialContent: cachedContent,
    initialStrongest: cachedStrongest,
    parentId: get_global_parent()?.get_id() ?? null,
  } as CellInitPayload);
  
  await sendMessageToWorker(updatedPoolState, workerIndex, initMessage);
  
  // Create the proxy cell with synchronous interface
  // State is cached locally and updated via worker notifications
  const cell: Cell<A> = {
    getRelation: () => relation,
    
    getContent: () => cachedContent,
    
    getStrongest: () => cachedStrongest,
    
    getNeighbors: () => neighbors,
    
    update: (increment: CellValue<A> = "&&the_nothing&&") => {
      // Send update to worker asynchronously (fire and forget)
      const message = createMessage(WorkerMessageType.CELL_UPDATE, cellId, {
        increment,
      });
      sendMessageToWorker(updatedPoolState, workerIndex, message).catch(
        (error) => console.error("Worker update error:", error)
      );
      return true; // Optimistically return true
    },
    
    testContent: () => {
      // Send test to worker asynchronously
      const message = createMessage(WorkerMessageType.CELL_TEST_CONTENT, cellId);
      sendMessageToWorker(updatedPoolState, workerIndex, message).catch(
        (error) => console.error("Worker testContent error:", error)
      );
      return true;
    },
    
    addNeighbor: (propagator: Propagator, interestedIn: NeighborType[]) => {
      const propagatorId = get_id(propagator);
      propagatorRegistry.set(propagatorId, propagator);
      
      neighbors.set(propagatorId, {
        type: interestedIn,
        propagator,
      });
      
      // Send to worker asynchronously
      const message = createMessage(WorkerMessageType.CELL_ADD_NEIGHBOR, cellId, {
        propagatorId,
        interestedIn,
      });
      sendMessageToWorker(updatedPoolState, workerIndex, message).catch(
        (error) => console.error("Worker addNeighbor error:", error)
      );
      
      // Alert in main thread immediately
      if (!interestedIn.includes("dependents" as NeighborType)) {
        alert_interested_propagators(neighbors, "neighbor_added" as NeighborType);
        alert_interested_propagators(neighbors, "updated" as NeighborType);
      }
    },
    
    removeNeighbor: (propagator: Propagator) => {
      const propagatorId = get_id(propagator);
      propagatorRegistry.delete(propagatorId);
      neighbors.delete(propagatorId);
      
      // Send to worker asynchronously
      const message = createMessage(WorkerMessageType.CELL_REMOVE_NEIGHBOR, cellId, {
        propagatorId,
      });
      sendMessageToWorker(updatedPoolState, workerIndex, message).catch(
        (error) => console.error("Worker removeNeighbor error:", error)
      );
      
      alert_interested_propagators(neighbors, "neighbor_removed" as NeighborType);
    },
    
    summarize: () => {
      // Return cached summary, could be enhanced to fetch from worker
      return `WorkerCell ${name}\n  ID: ${cellId}\n  STRONGEST: ${cachedStrongest}\n  CONTENT: ${cachedContent}\n  NEIGHBORS: ${neighbors.size}`;
    },
    
    dispose: () => {
      // Send dispose to worker asynchronously
      const message = createMessage(WorkerMessageType.CELL_DISPOSE, cellId);
      sendMessageToWorker(updatedPoolState, workerIndex, message).catch(
        (error) => console.error("Worker dispose error:", error)
      );
      
      // Clean up local state immediately
      neighbors.clear();
      propagatorRegistry.clear();
      cachedContent = "&&the_disposed&&" as CellValue<A>;
      cachedStrongest = "&&the_disposed&&" as CellValue<A>;
    },
  };
  
  // Register cell in global state
  set_global_state(PublicStateCommand.ADD_CELL, cell);
  set_global_state(PublicStateCommand.ADD_CHILD, relation);
  
  return { cell, poolState: updatedPoolState };
}

/**
 * Synchronous wrapper for async cell operations
 * This maintains interface compatibility while using async operations internally
 */
export const createSyncWorkerCell = <A>(
  name: string,
  id: string | null,
  poolState: WorkerPoolState,
  initialData?: {
    content?: CellValue<A>;
    strongest?: CellValue<A>;
  }
): { cell: Cell<A>; poolState: WorkerPoolState; initPromise: Promise<void> } => {
  let resolvedCell: Cell<A> | null = null;
  let resolvedPoolState: WorkerPoolState = poolState;
  
  const initPromise = construct_worker_cell(name, id, poolState, initialData).then(
    ({ cell, poolState: updatedPoolState }) => {
      resolvedCell = cell;
      resolvedPoolState = updatedPoolState;
    }
  );
  
  // Create a synchronous proxy that uses cached values
  const cell: Cell<A> = {
    getRelation: () => make_relation(name, get_global_parent(), id),
    getContent: () => {
      if (resolvedCell) {
        return (resolvedCell.getContent() as any) ?? "&&the_nothing&&";
      }
      return "&&the_nothing&&" as CellValue<A>;
    },
    getStrongest: () => {
      if (resolvedCell) {
        return (resolvedCell.getStrongest() as any) ?? "&&the_nothing&&";
      }
      return "&&the_nothing&&" as CellValue<A>;
    },
    getNeighbors: () => resolvedCell?.getNeighbors() ?? new Map(),
    update: (increment?: CellValue<A>) => {
      if (resolvedCell) {
        return (resolvedCell.update(increment ?? "&&the_nothing&&") as any) ?? false;
      }
      return false;
    },
    testContent: () => {
      if (resolvedCell) {
        return (resolvedCell.testContent() as any) ?? false;
      }
      return false;
    },
    addNeighbor: (propagator: Propagator, interestedIn: NeighborType[]) => {
      if (resolvedCell) {
        (resolvedCell.addNeighbor(propagator, interestedIn) as any);
      }
    },
    removeNeighbor: (propagator: Propagator) => {
      if (resolvedCell) {
        (resolvedCell.removeNeighbor(propagator) as any);
      }
    },
    summarize: () => {
      if (resolvedCell) {
        return (resolvedCell.summarize() as any) ?? `WorkerCell ${name} (initializing)`;
      }
      return `WorkerCell ${name} (initializing)`;
    },
    dispose: () => {
      if (resolvedCell) {
        (resolvedCell.dispose() as any);
      }
    },
  };
  
  return { cell, poolState: resolvedPoolState, initPromise };
};
