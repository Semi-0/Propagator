# WorkerCell - Distributed Cell Implementation

## Overview

WorkerCell enables cells to run in isolated worker threads, making the propagator system truly distributed. Each cell can run in its own worker thread, allowing for parallel computation and better resource utilization.

## Architecture

### Components

1. **WorkerMessageProtocol** - Defines the message protocol for communication between main thread and workers
2. **CellWorker** - The worker script that runs cells in isolation
3. **WorkerPool** - Manages worker threads and routes messages
4. **WorkerCell** - Proxy cell that implements the Cell interface but delegates to workers

### Design Principles

- **Functional Approach**: Uses immutable state updates and pure functions where possible
- **Message Passing**: All communication is via serializable messages
- **Async Operations**: Worker communication is async, but the Cell interface remains synchronous using cached state
- **Isolation**: Each cell runs in its own worker thread, isolated from the main thread

## Usage

### Basic Example

```typescript
import { 
  construct_worker_cell, 
  createWorkerPoolState, 
  terminateWorkerPool 
} from "./Cell/WorkerCell";

// Create a worker pool
const poolState = createWorkerPoolState(4); // 4 worker threads

// Create a cell in a worker thread
const { cell, poolState: updatedPoolState } = await construct_worker_cell(
  "my_cell",
  null,
  poolState,
  {
    content: 42,
    strongest: 42,
  }
);

// Use the cell like a normal cell
cell.update(100);
const value = cell.getStrongest();

// Clean up
terminateWorkerPool(updatedPoolState);
```

### With Propagators

```typescript
import { construct_worker_cell, createWorkerPoolState } from "./Cell/WorkerCell";
import { construct_cell } from "./Cell/Cell";
import { function_to_primitive_propagator } from "./Propagator/Propagator";

const poolState = createWorkerPoolState();

// Create cells in workers
const { cell: cell1 } = await construct_worker_cell("cell1", null, poolState);
const { cell: cell2 } = await construct_worker_cell("cell2", null, poolState);
const { cell: cell3 } = await construct_worker_cell("cell3", null, poolState);

// Create a propagator that connects them
const add = function_to_primitive_propagator("add", (a: number, b: number) => a + b);
const prop = add(cell1, cell2, cell3);

// Update cell1, propagation happens across threads
cell1.update(10);
cell2.update(20);
// cell3 will eventually receive 30
```

## Message Protocol

The system uses a message-based protocol for communication:

- `CELL_INIT` - Initialize a cell in a worker
- `CELL_UPDATE` - Update cell content
- `CELL_GET_CONTENT` - Get cell content
- `CELL_GET_STRONGEST` - Get strongest value
- `CELL_TEST_CONTENT` - Test and update strongest
- `CELL_ADD_NEIGHBOR` - Add a propagator neighbor
- `CELL_REMOVE_NEIGHBOR` - Remove a propagator neighbor
- `CELL_DISPOSE` - Dispose a cell
- `CELL_STRONGEST_CHANGED` - Notification when strongest changes
- `CELL_NEIGHBOR_ALERT` - Notification for neighbor alerts

## Worker Pool Management

The worker pool distributes cells across available worker threads using a round-robin strategy:

- Cells are assigned to workers based on capacity
- New workers are created up to `maxWorkers` limit
- Messages are routed to the correct worker based on cell ID

## Serialization

All messages and cell values are serialized using SuperJSON, which supports:
- Complex objects
- Dates
- Maps and Sets
- Custom types
- Circular references (with limitations)

## Limitations and Considerations

1. **Async Operations**: While the Cell interface is synchronous, worker communication is async. State is cached locally and updated via notifications.

2. **Propagator References**: Propagators cannot be passed directly to workers. Instead, propagator IDs are used, and the actual propagator objects remain in the main thread.

3. **Serialization**: All data must be serializable. Functions and non-serializable objects cannot be passed to workers.

4. **Performance**: There's overhead in message passing. Worker cells are best for:
   - CPU-intensive computations
   - Isolated cell operations
   - Parallel processing scenarios

5. **Browser Compatibility**: Requires Web Workers support. For Node.js, use Worker Threads API.

## Future Improvements

- [ ] Support for SharedArrayBuffer for zero-copy data sharing
- [ ] Worker thread pooling with dynamic allocation
- [ ] Message batching for better performance
- [ ] Support for streaming large values
- [ ] Worker thread debugging tools
- [ ] Automatic worker thread scaling based on load
