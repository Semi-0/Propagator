# WorkerCell Architecture

## Overview

This document explains the architecture and design decisions for making cells work in worker threads, enabling truly distributed computation.

## Problem Statement

The original Cell implementation runs synchronously in the main thread. To make cells truly distributed and enable parallel computation, we need to:

1. Run each cell in an isolated worker thread
2. Maintain the synchronous Cell interface
3. Handle async communication between threads
4. Coordinate propagator execution across threads
5. Serialize/deserialize cell values and messages

## Solution Architecture

### 1. Message Protocol (`WorkerMessageProtocol.ts`)

**Purpose**: Define a serializable message protocol for cell-worker communication.

**Key Design Decisions**:
- Use SuperJSON for serialization (supports complex types, dates, Maps, Sets)
- Request-response pattern with message IDs for correlation
- Notification pattern for async updates (strongest changed, neighbor alerts)
- Type-safe message payloads

**Message Types**:
- **Operations**: `CELL_UPDATE`, `CELL_GET_CONTENT`, `CELL_GET_STRONGEST`, etc.
- **Responses**: `CELL_RESPONSE`, `CELL_ERROR`
- **Notifications**: `CELL_STRONGEST_CHANGED`, `CELL_NEIGHBOR_ALERT`
- **Lifecycle**: `CELL_INIT`, `CELL_READY`, `CELL_TERMINATE`

### 2. Worker Script (`CellWorker.ts`)

**Purpose**: Run cells in isolation within a worker thread.

**Key Design Decisions**:
- Each worker can host multiple cells (for efficiency)
- Cells are created using `primitive_construct_cell` (same as main thread)
- Propagator references are stored as IDs (can't pass objects across threads)
- Override cell methods to send notifications to main thread
- Handle all cell operations via message handlers

**Challenges Solved**:
- **Propagator References**: Can't pass propagator objects to workers. Solution: Store propagator IDs, send notifications to main thread where actual propagators exist.
- **State Synchronization**: Worker state needs to sync with main thread. Solution: Notifications on state changes, cached values in main thread.

### 3. Worker Pool (`WorkerPool.ts`)

**Purpose**: Manage worker threads and route messages.

**Key Design Decisions**:
- Round-robin distribution of cells across workers
- Dynamic worker creation up to `maxWorkers` limit
- Request-response correlation using message IDs
- Timeout handling for requests

**State Management**:
- Immutable state updates (functional approach)
- `cellToWorker` map for routing
- `pendingRequests` per worker for response correlation

### 4. WorkerCell Proxy (`WorkerCell.ts`)

**Purpose**: Implement Cell interface while delegating to worker threads.

**Key Design Decisions**:
- **Synchronous Interface**: Maintains Cell interface compatibility
- **Cached State**: Local cache updated via worker notifications
- **Async Operations**: Fire-and-forget pattern for updates
- **Notification Handling**: Listen for state changes from worker

**Synchronization Strategy**:
1. Operations return immediately using cached values
2. Updates sent to worker asynchronously
3. Worker sends notifications on state changes
4. Cache updated when notifications arrive
5. Propagators alerted in main thread (where they exist)

## Data Flow

### Cell Update Flow

```
Main Thread                    Worker Thread
-----------                    ------------
1. cell.update(value)
   ↓
2. Send CELL_UPDATE message
   ↓
3. Return immediately (optimistic)
   ↓
4. Worker receives message
   ↓
5. Worker updates cell state
   ↓
6. Worker sends CELL_STRONGEST_CHANGED notification
   ↓
7. Main thread updates cache
   ↓
8. Main thread alerts propagators
```

### Propagator Alert Flow

```
Main Thread                    Worker Thread
-----------                    ------------
1. Worker cell strongest changes
   ↓
2. Worker sends CELL_NEIGHBOR_ALERT
   ↓
3. Main thread receives notification
   ↓
4. Main thread looks up propagator by ID
   ↓
5. Main thread calls alert_propagator()
   ↓
6. Scheduler queues propagator execution
```

## Key Challenges and Solutions

### Challenge 1: Synchronous Interface, Async Communication

**Problem**: Cell interface is synchronous, but worker communication is async.

**Solution**: 
- Use cached state for immediate returns
- Update cache via notifications
- Fire-and-forget for updates (optimistic updates)

### Challenge 2: Propagator References

**Problem**: Can't pass propagator objects to workers (not serializable, contain functions).

**Solution**:
- Store propagator IDs in worker
- Keep actual propagator objects in main thread
- Send notifications to main thread for alerts
- Main thread routes alerts to actual propagators

### Challenge 3: State Consistency

**Problem**: Worker state and main thread cache can diverge.

**Solution**:
- Worker is source of truth for cell state
- Main thread cache is updated via notifications
- Operations that need current state can query worker (with async overhead)
- Most operations use cached values (eventually consistent)

### Challenge 4: Serialization

**Problem**: Cell values can be complex (layered objects, BetterSets, etc.).

**Solution**:
- Use SuperJSON for serialization
- Supports complex types, dates, Maps, Sets
- Custom handlers for special types (BetterSet, LayeredObject)

## Performance Considerations

### Advantages

1. **Parallel Computation**: Cells can compute in parallel across threads
2. **Isolation**: Worker crashes don't affect main thread
3. **Resource Management**: Better CPU utilization with multiple threads

### Overhead

1. **Message Passing**: Serialization/deserialization overhead
2. **State Synchronization**: Cache updates via notifications
3. **Request Latency**: Async operations have latency

### When to Use WorkerCells

**Good for**:
- CPU-intensive cell computations
- Isolated cell operations
- Parallel processing scenarios
- Large-scale distributed systems

**Not ideal for**:
- Simple, fast operations
- Tightly coupled cells (high message overhead)
- Real-time systems requiring immediate consistency

## Future Improvements

1. **SharedArrayBuffer**: Zero-copy data sharing for large values
2. **Message Batching**: Batch multiple operations to reduce overhead
3. **Streaming**: Stream large values instead of single messages
4. **Worker Thread Pooling**: More sophisticated allocation strategies
5. **Automatic Scaling**: Scale workers based on load
6. **Debugging Tools**: Better tools for debugging distributed cells

## Testing Strategy

Tests should verify:
1. Cell creation and initialization
2. State synchronization (cache updates)
3. Propagator alerts across threads
4. Worker pool distribution
5. Error handling and cleanup
6. Disposal and resource cleanup

## Conclusion

The WorkerCell implementation enables truly distributed cells while maintaining the existing Cell interface. The architecture uses message passing, cached state, and notification patterns to bridge the gap between synchronous interfaces and async worker communication.
