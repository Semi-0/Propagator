# Patch System for AdvanceReactivity

A dynamic, hot-swappable behavior system for reactive cells that extends the AdvanceReactivity system with configurable memory, intake, selection, and emission strategies.

## Overview

The Patch System allows you to dynamically configure how cells handle data:

- **Memory**: Control how much data to keep (count-based or time-based)
- **Intake**: Manage data flow with quotas and ordering
- **Selection**: Choose how to compute the effective value (first, last, strongest, or custom reducers)
- **Emission**: Control when and how to emit updates

## Core Concepts

### Strategy
A cell's behavior is defined by its **Strategy**, which consists of:
- `memory`: How much data to retain
- `intake`: How to accept and filter incoming data
- `selection`: How to compute the effective value
- `emit`: When and how to emit updates
- `channels`: How to organize data (global vs per-tag)

### Patches
**Patches** are partial strategies that extend or modify cell behavior. They are applied using idempotent, commutative, associative joins, ensuring:
- Order-independent application
- Duplicate-safe operations
- Deterministic results

### Lineage
Every patch is tracked with metadata including:
- Unique ID
- Origin information
- Application timestamp
- Optional expiration

## Quick Start

```typescript
import {
    create_patched_cell,
    ce_write,
    ce_strategy_extend_memory,
    ce_strategy_extend_selection,
    get_effective_value
} from "./PatchSystem/adapter/simpleAdapter";

// Create a patched cell
const cell = create_patched_cell("my_cell");

// Configure memory: keep last 5 items
ce_strategy_extend_memory(cell, { kind: 'count', n: 5 });

// Configure selection: use strongest value
ce_strategy_extend_selection(cell, {
    ranks: new Set(['strongest']),
    reducers: new Set()
});

// Write data with metadata
ce_write(cell, 42, { sourceCellId: "sensor1", strength: 0.8 });
ce_write(cell, 100, { sourceCellId: "sensor2", strength: 0.3 });

// Get the effective value
const effective = get_effective_value(cell); // Returns 42 (strongest)
```

## API Reference

### Cell Creation
```typescript
create_patched_cell<T>(name?: string): Cell<T>
```
Creates a new patched cell with empty initial state.

### Writing Data
```typescript
ce_write(
    cell: Cell<any>,
    value: any,
    meta: { sourceCellId: string, strength?: number, tag?: string }
): void
```
Writes a value to the cell with metadata for tracking and selection.

### Memory Strategies
```typescript
ce_strategy_extend_memory(cell: Cell<any>, patch: Memory): void
```

**Memory Types:**
- `{ kind: 'count', n: number }`: Keep last N items
- `{ kind: 'time', ms: number }`: Keep items from last N milliseconds

### Selection Strategies
```typescript
ce_strategy_extend_selection(cell: Cell<any>, patch: SelectionCaps): void
```

**Selection Ranks:**
- `'first'`: Use the first value in the buffer
- `'last'`: Use the last value in the buffer
- `'strongest'`: Use the value with highest strength
- `'reduce'`: Apply a reducer function to all values

**Built-in Reducers:**
- `'sum'`: Sum all numeric values
- `'avg'`: Average all numeric values
- `'max'`: Maximum value
- `'min'`: Minimum value
- `'median'`: Median value
- `'first'`: First value
- `'last'`: Last value
- `'strongest'`: Value with highest strength

### Intake Strategies
```typescript
ce_strategy_extend_intake(cell: Cell<any>, patch: Intake): void
```

**Intake Configuration:**
```typescript
{
    key: 'source' | 'tag',           // Group by source or tag
    quota: Record<string, number>,   // Max items per source/tag
    order?: 'time' | 'strength'      // Sort order
}
```

### Emit Strategies
```typescript
ce_strategy_extend_emit(cell: Cell<any>, patch: Emit): void
```

**Emit Modes:**
- `{ mode: 'immediate' }`: Emit updates immediately
- `{ mode: 'spread', maxPerTick: number }`: Spread updates over time

### Reading Data
```typescript
get_buffer_value(cell: Cell<any>): ValueItem[]
get_strategy_value(cell: Cell<any>): Strategy
get_effective_value(cell: Cell<any>): any
```

## Examples

### Sensor Data Aggregation
```typescript
const sensorCell = create_patched_cell("sensor_aggregator");

// Keep last 10 readings
ce_strategy_extend_memory(sensorCell, { kind: 'count', n: 10 });

// Use average of all readings
ce_strategy_extend_selection(sensorCell, {
    ranks: new Set(['reduce']),
    reducers: new Set(['avg'])
});

// Write sensor data
ce_write(sensorCell, 25.5, { sourceCellId: "temp_sensor", strength: 0.9 });
ce_write(sensorCell, 26.1, { sourceCellId: "temp_sensor", strength: 0.8 });
ce_write(sensorCell, 24.8, { sourceCellId: "temp_sensor", strength: 0.7 });

const average = get_effective_value(sensorCell); // Average of all readings
```

### Real-time Stream Processing
```typescript
const streamCell = create_patched_cell("data_stream");

// Keep last 1 second of data
ce_strategy_extend_memory(streamCell, { kind: 'time', ms: 1000 });

// Sum all values in the window
ce_strategy_extend_selection(streamCell, {
    ranks: new Set(['reduce']),
    reducers: new Set(['sum'])
});

// Rapid data stream
for (let i = 1; i <= 10; i++) {
    ce_write(streamCell, i, { sourceCellId: "stream_source" });
}

const sum = get_effective_value(streamCell); // Sum of all values in window
```

### Conflict Resolution
```typescript
const conflictCell = create_patched_cell("conflict_resolver");

// Use strongest value when conflicts arise
ce_strategy_extend_selection(conflictCell, {
    ranks: new Set(['strongest']),
    reducers: new Set()
});

// Conflicting data from multiple sources
ce_write(conflictCell, "data_a", { sourceCellId: "source_a", strength: 0.3 });
ce_write(conflictCell, "data_b", { sourceCellId: "source_b", strength: 0.8 });
ce_write(conflictCell, "data_c", { sourceCellId: "source_c", strength: 0.5 });

const resolved = get_effective_value(conflictCell); // "data_b" (strongest)
```

## Architecture

### Core Components

1. **Types** (`core/types.ts`): Core type definitions
2. **Joins** (`core/joins.ts`): Strategy combination logic
3. **Projection** (`core/projection.ts`): Governance and validation
4. **Lineage** (`core/lineage.ts`): Patch tracking and management
5. **Reducers** (`core/reducers.ts`): Built-in reduction functions
6. **Adapter** (`adapter/simpleAdapter.ts`): Integration with AdvanceReactivity

### Key Features

- **Extend-only Safety**: Patches can only add capabilities, never remove them
- **Deterministic**: Results are consistent regardless of patch application order
- **Hot-swappable**: Change behavior at runtime without rewiring
- **Lineage Tracking**: Full audit trail of applied patches
- **Governance**: Configurable caps and validation rules

## Testing

Run the test suite:
```bash
bun test test/patchSystem_simple.test.ts
bun test test/patchSystem_verification.test.ts
```

Run the demo:
```bash
bun run PatchSystem/working_demo.ts
```

## Integration with AdvanceReactivity

The Patch System integrates seamlessly with the existing AdvanceReactivity system:

- Uses the same `Cell` type
- Leverages existing `update` and `r_constant` functions
- Maintains compatibility with existing propagators
- Extends rather than replaces existing functionality

## Future Enhancements

- **Custom Reducers**: User-defined reduction functions
- **Advanced Intake**: Complex filtering and routing rules
- **Time-based Strategies**: Sophisticated temporal reasoning
- **Distributed Patches**: Cross-cell strategy coordination
- **Visualization**: Tools for inspecting cell state and lineage 