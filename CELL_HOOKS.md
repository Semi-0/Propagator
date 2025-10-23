# Cell Hooks System

## Overview

Cells now have a **built-in, type-safe hook system** for observing internal state changes. Hooks allow you to react to:

- **`content_added`**: New content merged into cell
- **`strongest_changed`**: Strongest value updated  
- **`neighbor_added`**: Propagator neighbor registered
- **`neighbor_removed`**: Propagator neighbor unregistered
- **`disposed`**: Cell disposed

## Quick Start

### Basic Usage

```typescript
import { construct_cell, type CellHook } from "@/cell/Cell";

const cell = construct_cell("myCell");

// Subscribe to a specific hook type
const unsubscribe = cell.on('strongest_changed', (hook: CellHook) => {
  console.log("Value changed from", hook.data.old, "to", hook.data.new);
});

// Unsubscribe
unsubscribe();

// Or use off()
cell.off('strongest_changed', listener);
```

### Hook Event Structure

Every hook has this shape:

```typescript
interface CellHook {
  type: CellHookType;              // 'content_added' | 'strongest_changed' | etc.
  cell: Cell<any>;                 // Reference to the cell
  timestamp: number;               // When the hook fired (Date.now())
  data?: any;                      // Hook-specific data
}
```

### Hook Type Data

#### `content_added`
```typescript
hook.data = {
  old: CellValue<A>;               // Previous content
  new: CellValue<A>;               // New merged content
  increment: CellValue<A>;         // The added value
}
```

#### `strongest_changed`
```typescript
hook.data = {
  old: CellValue<A>;               // Previous strongest value
  new: CellValue<A>;               // New strongest value
  is_contradiction: boolean;       // Whether new value is a contradiction
}
```

#### `neighbor_added`
```typescript
hook.data = {
  propagator: Propagator;          // The propagator neighbor
  propagator_id: string;           // ID of the propagator
}
```

#### `disposed`
```typescript
hook.data = {
  neighbors_count: number;         // How many neighbors the cell had
}
```

## Advanced Usage

### Listen to All Hook Types

```typescript
import { on_all_hooks } from "@/cell/Cell";

const cell = construct_cell("myCell");

const unsubscribe = on_all_hooks(cell, (hook) => {
  console.log(`${hook.type} at ${hook.timestamp}`);
});
```

### Debug Logging

```typescript
import { create_debug_hook_listener } from "@/cell/Cell";

const cell = construct_cell("myCell");
const debugListener = create_debug_hook_listener("DEBUG_LABEL");

cell.on('content_added', debugListener);
cell.on('strongest_changed', debugListener);
```

Output:
```
[DEBUG_LABEL] myCell content_added: {
  increment: LayeredObject {...},
  timestamp: 1234567890
}
[DEBUG_LABEL] myCell strongest_changed: {
  old: "&&the_nothing&&",
  new: LayeredObject {...},
  is_contradiction: false,
  timestamp: 1234567891
}
```

### Filter by Hook Type

```typescript
import { create_filtered_hook_listener } from "@/cell/Cell";

const cell = construct_cell("myCell");

const filtered = create_filtered_hook_listener('strongest_changed', (hook) => {
  console.log("Value is now", hook.data.new);
});

// This will only fire for 'strongest_changed' events
cell.on('content_added', filtered);
cell.on('strongest_changed', filtered);
```

### Collect Hooks for Testing

```typescript
import { create_collecting_hook_listener } from "@/cell/Cell";

const cell = construct_cell("myCell");
const { listener, get_hooks, clear } = create_collecting_hook_listener(100);

cell.on('content_added', listener);
cell.on('strongest_changed', listener);

// Add some content...
cell.addContent(value1);
cell.addContent(value2);

// Inspect all collected hooks
const hooks = get_hooks();
console.log("Collected", hooks.length, "hooks");

// Clear for next test
clear();
```

### One-Time Listener

```typescript
import { create_once_hook_listener } from "@/cell/Cell";

const { listener, unsubscribe } = create_once_hook_listener((hook) => {
  console.log("First hook event:", hook.type);
  // Won't fire again after this
});

cell.on('content_added', listener);
cell.on('strongest_changed', listener);
```

## Hook Ordering Guarantees

Hooks fire in this order when content is added:

1. **`content_added`** - Fired first, before strongest value is computed
2. **`strongest_changed`** - Fired after content is merged and strongest is recalculated
3. **Propagator alerts** - If value changed, connected propagators are alerted

This ordering is **guaranteed** - it reflects the actual execution order.

## Error Handling

If a hook listener throws an error:

✅ The error is **caught and logged** to console  
✅ **Other listeners still fire** (no cascade failures)  
✅ The **cell operation completes** normally

```typescript
cell.on('content_added', () => {
  throw new Error("Oops!");  // Logged but doesn't break anything
});

cell.on('content_added', () => {
  console.log("This still fires!");  // ✓ Executes normally
});
```

## Performance Considerations

### When Hooks Fire

Hooks are **synchronous** and fire **immediately** during:
- `cell.addContent()`
- When `test_content()` recalculates strongest value
- `cell.dispose()`

### Minimal Overhead

- Hooks only execute if there are registered listeners
- No listener = no performance penalty
- Set-based listener management (O(1) add/remove)

### Timestamps

Hooks include `timestamp: Date.now()` - useful for:
- Debugging execution order
- Performance analysis  
- Causal analysis (especially with Victor Clock!)

## Use Cases

### 1. Debugging & Tracing

```typescript
const debugger = create_debug_hook_listener("TRACE");
cell.on('content_added', debugger);
cell.on('strongest_changed', debugger);
// See all changes in detail
```

### 2. Victor Clock Analysis

```typescript
import { victor_clock_layer } from "../AdvanceReactivity/victor_clock";

cell.on('strongest_changed', (hook) => {
  const newValue = hook.data.new;
  const clock = victor_clock_layer.get_value(newValue);
  console.log("New version vector:", clock);
});
```

### 3. Support Layer Tracking

```typescript
import { support_layer } from "sando-layer/Specified/SupportLayer";

cell.on('strongest_changed', (hook) => {
  const supports = support_layer.get_value(hook.data.new);
  console.log("Value now supported by:", Array.from(supports));
});
```

### 4. Integration Testing

```typescript
const { listener, get_hooks } = create_collecting_hook_listener();

cell.on('content_added', listener);
cell.on('strongest_changed', listener);

// Run your test...
operation();

// Verify exact sequence of hooks
const hooks = get_hooks();
expect(hooks[0].type).toBe('content_added');
expect(hooks[1].type).toBe('strongest_changed');
expect(hooks[1].data.new).toEqual(expectedValue);
```

### 5. Reactive Sinks

```typescript
// Send all value changes to external system
cell.on('strongest_changed', (hook) => {
  if (!hook.data.is_contradiction) {
    externalSystem.update(cell_id(hook.cell), hook.data.new);
  }
});
```

## Architecture

### Internal Implementation

Each cell maintains:

```typescript
const hook_listeners: Map<CellHookType, Set<CellHookListener>> = new Map();

const emit_hook = (type: CellHookType, data?: any) => {
  const listeners = hook_listeners.get(type);
  if (listeners && listeners.size > 0) {
    const hook: CellHook = { type, cell, timestamp: Date.now(), data };
    listeners.forEach(listener => {
      try {
        listener(hook);
      } catch (e) {
        console.error(`Error in hook listener for ${type}:`, e);
      }
    });
  }
};
```

### Why Not Proxies?

Proxies add unpredictable timing overhead that could affect:
- Victor Clock ordering (timing-dependent)
- Support layer updates (dependently-timed)
- Reactive propagation (causality-dependent)

**Hooks are explicit** - you opt-in where you need observability.

## Type Safety

All hook types and listeners are TypeScript-safe:

```typescript
// ✅ Catches at compile time
cell.on('invalid_hook_type', listener);  // ❌ TypeScript error!
cell.on('strongest_changed', listener);   // ✓ OK

// ✅ Hook data is typed
cell.on('strongest_changed', (hook) => {
  console.log(hook.data.old);           // ✓ Exists in strongest_changed
  console.log(hook.data.propagator);     // ❌ TypeScript error - not in this hook
});
```

## See Also

- `test/cell_hooks.test.ts` - Comprehensive test examples
- `Cell.ts` - Full implementation with detailed JSDoc comments
