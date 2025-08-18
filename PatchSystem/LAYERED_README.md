# Patch System - Layered Procedure Implementation

This document describes the layered procedure implementation of the Patch System, which extends the AdvanceReactivity system using the layered procedure pattern.

## Overview

The layered procedure implementation uses the `sando-layer` framework to create a patch layer that wraps existing cells and extends their behavior dynamically. This approach provides seamless integration with the existing AdvanceReactivity system while maintaining the core patch system functionality.

## Key Concepts

### Layered Procedures
- **Layered Objects**: Values wrapped with additional layers that can intercept and modify operations
- **Patch Layer**: A specific layer that adds patch system functionality to any cell
- **Layered Procedures**: Procedures that can work with layered objects and access layer-specific data

### Architecture
```
Base Cell (AdvanceReactivity) 
    ↓ (wrapped with)
Patch Layer (CellContent: buffer, strategy, lineage, caps)
    ↓ (result)
Layered Cell with dynamic behavior
```

## Core Components

### 1. Patch Layer (`patch_layer`)
```typescript
export const patch_layer = make_annotation_layer<CellContent, any>("patch", ...)
```
- Creates a layer that stores `CellContent` (buffer, strategy, lineage, caps)
- Provides default values and procedure handlers
- Integrates with the layered object system

### 2. Layered Procedures
```typescript
export const patch_merge = make_layered_procedure("patch_merge", 2, generic_merge);
export const patch_strongest = make_layered_procedure("patch_strongest", 1, strongest_value);
```
- Extend existing procedures to work with patch layers
- Automatically handle patch-specific logic

### 3. API Functions
```typescript
// Core operations
export const ps_write = (dst: LayeredObject<any>, value: any, meta: {...}): void
export const ps_strategy_extend_memory = (cell: LayeredObject<any>, memory: Memory): void
export const ps_strategy_extend_selection = (cell: LayeredObject<any>, selection: SelectionCaps): void
export const ps_strategy_extend_intake = (cell: LayeredObject<any>, intake: Intake): void
export const ps_strategy_extend_emit = (cell: LayeredObject<any>, emit: Emit): void
export const ps_strategy_extend_channels = (cell: LayeredObject<any>, channels: Channels): void

// Access functions
export const ps_buffer = (cell: LayeredObject<any>): ValueItem[]
export const ps_strategy = (cell: LayeredObject<any>): Strategy
export const ps_lineage = (cell: LayeredObject<any>): PatchFrontier
export const ps_effective = (cell: LayeredObject<any>): any
export const ps_strongest = (cell: LayeredObject<any>): any

// Creation
export const create_patched_cell = (baseCell: any, initialContent?: Partial<CellContent>): LayeredObject<any>
```

## Usage Examples

### Basic Usage
```typescript
import { create_patched_cell, ps_write, ps_strategy_extend_memory, ps_strategy_extend_selection } from "./PatchSystem/core/layeredPatch";
import { r_constant } from "../AdvanceReactivity/interface";

// Create a base cell and wrap it with patch layer
const baseCell = r_constant(0, "my_cell");
const patchedCell = create_patched_cell(baseCell);

// Extend with memory strategy
ps_strategy_extend_memory(patchedCell, { kind: 'count', n: 3 });

// Write values
ps_write(patchedCell, 1, { sourceCellId: "sensor1", strength: 0.5 });
ps_write(patchedCell, 2, { sourceCellId: "sensor2", strength: 0.8 });

// Extend with selection strategy
ps_strategy_extend_selection(patchedCell, { 
    ranks: new Set(['strongest']), 
    reducers: new Set() 
});

// Get effective value
const effectiveValue = ps_effective(patchedCell); // Returns 2 (strongest)
```

### Advanced Usage
```typescript
// Create with initial content
const patchedCell = create_patched_cell(baseCell, {
    strategy: {
        memory: { kind: 'count', n: 5 },
        selection: { ranks: new Set(['last']), reducers: new Set() }
    }
});

// Extend multiple strategies
ps_strategy_extend_intake(patchedCell, {
    key: 'tag',
    quota: { 'temp': 2, 'humidity': 1 },
    order: 'strength'
});

ps_strategy_extend_emit(patchedCell, { mode: 'spread', maxPerTick: 3 });

// Use layered procedures
const strongestValue = ps_strongest(patchedCell);
```

## Integration with AdvanceReactivity

### Seamless Integration
- Works with existing `Cell` types from AdvanceReactivity
- Uses `r_constant` and other reactive functions
- Maintains compatibility with existing reactive patterns

### Layered Procedure Handlers
```typescript
define_layered_procedure_handler(patch_strongest, patch_layer,
    (base: any, patchContent: CellContent) => {
        const effectiveValue = computeEffectiveValue(patchContent.buffer, patchContent.strategy);
        return effectiveValue !== undefined ? effectiveValue : get_base_value(base);
    }
);
```

## Advantages of Layered Implementation

### 1. **Seamless Integration**
- No changes needed to existing AdvanceReactivity code
- Works with any cell type
- Maintains backward compatibility

### 2. **Clean Separation**
- Patch logic is isolated in its own layer
- Base cell functionality remains unchanged
- Clear boundaries between concerns

### 3. **Extensibility**
- Easy to add new layers for different behaviors
- Can combine multiple layers on the same cell
- Supports complex layering scenarios

### 4. **Performance**
- Minimal overhead for cells without patches
- Efficient layer access and updates
- Lazy computation of effective values

### 5. **Type Safety**
- Full TypeScript support
- Compile-time checking of layer operations
- Type-safe access to patch content

## Comparison with Simple Adapter

| Feature | Simple Adapter | Layered Implementation |
|---------|----------------|----------------------|
| Integration | Direct cell modification | Layer wrapping |
| Compatibility | Requires cell modification | Works with any cell |
| Performance | Minimal overhead | Minimal overhead |
| Extensibility | Limited to patch system | Supports multiple layers |
| Type Safety | Full | Full |
| Complexity | Lower | Higher (but more flexible) |

## Testing

Run the layered implementation tests:
```bash
bun test test/patchSystem_layered.test.ts
```

## Demo

Run the layered demo:
```bash
bun run PatchSystem/layered_demo.ts
```

## Architecture Benefits

### 1. **Functional Design**
- Pure functions for strategy operations
- Immutable data structures
- Composition-based approach

### 2. **Layered Abstraction**
- Clear separation of concerns
- Reusable layer components
- Extensible architecture

### 3. **Reactive Integration**
- Works with existing reactive patterns
- Maintains reactive properties
- Supports reactive updates

### 4. **Governance**
- Built-in projection and validation
- Extend-only safety guarantees
- Configurable capabilities

## Future Extensions

### 1. **Multiple Layers**
- Support for multiple patch layers
- Layer composition and ordering
- Cross-layer communication

### 2. **Advanced Procedures**
- More sophisticated merge procedures
- Custom layer-specific operations
- Performance optimizations

### 3. **Integration Features**
- Better integration with existing operators
- Support for compound propagators
- Enhanced reactive patterns

## Conclusion

The layered procedure implementation provides a powerful and flexible way to extend the AdvanceReactivity system with dynamic behavior. It maintains the core benefits of the patch system while providing seamless integration and extensibility through the layered architecture. 