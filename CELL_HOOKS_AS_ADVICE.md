# Cell Hooks as Advice/AOP Pattern

## Overview

Cells now support hooks through **two complementary patterns**:

1. **Direct Hook Registration** - Simple, direct listener pattern (from previous guide)
2. **Advice/AOP Pattern** - Composable aspect-oriented programming using the advice system

This document focuses on the **advice/AOP pattern**, which allows hooks to be installed as cross-cutting concerns.

## Quick Start: Hook Registration via Advice

### Pattern 1: Global Hook Registry

```typescript
import { register_cell_hook, emit_hook } from "@/cell/Cell";

const cell = construct_cell("myCell");

// Register hook listener
const unsubscribe = register_cell_hook(cell, 'strongest_changed', (hook) => {
  console.log("Value changed to:", hook.data.new);
});

// Unregister
unsubscribe();
```

### Pattern 2: Create and Install Advices

```typescript
import { 
  create_hook_emission_advice,
  register_cell_hook,
  type Cell
} from "@/cell/Cell";
import { install_advice } from "generic-handler/built_in_generics/generic_advice";

const cell = construct_cell("myCell");

// Create an advice that emits hooks
const hookAdvice = create_hook_emission_advice('strongest_changed');

// Advices wrap functions to intercept and modify behavior
// Usage: install_advice(advice, functionToWrap)
```

## Architecture: Why Advice/AOP for Hooks?

### ✅ Advantages of Advice Pattern

1. **Composition** - Stack multiple advices without nesting
2. **Decoupling** - Hooks don't need to modify cell implementation
3. **Reusability** - Same advice can apply to multiple cells
4. **Centralized** - Global registry manages all hooks
5. **Aspect-Oriented** - Cross-cutting concerns (logging, debugging, metrics)

### How It Works

```
Cell Method (addContent)
    ↓
Advice 1: Hook Emission
    ↓
Advice 2: Error Handling
    ↓
Advice 3: Logging
    ↓
Original Implementation
    ↓
Result returns through advice stack
```

## Advanced Usage

### Create Custom Advice Factories

```typescript
import { construct_advice } from "generic-handler/built_in_generics/generic_advice";

// Create advice factory for content tracking
export function create_content_tracking_advice() {
  return construct_advice(
    [], // No input modifications
    (result: any) => {
      const [cell, oldContent, newContent] = result;
      console.log(`Cell ${cell.getRelation().get_name()}: content updated`);
      console.log(`  Old:`, oldContent);
      console.log(`  New:`, newContent);
    }
  );
}

// Create advice factory for metric collection
export function create_metrics_advice() {
  const metrics = { total_changes: 0, total_time: 0 };
  
  return {
    construct_advice([], (result: any) => {
      metrics.total_changes++;
      console.log(`Total changes so far: ${metrics.total_changes}`);
    }),
    get_metrics: () => metrics
  };
}
```

### Stack Multiple Advices

```typescript
import { install_advices } from "generic-handler/built_in_generics/generic_advice";

const cell = construct_cell("myCell");

// Create multiple advices
const hookAdvice = create_hook_emission_advice('strongest_changed');
const trackingAdvice = create_content_tracking_advice();
const loggingAdvice = construct_advice([], () => {
  console.log("Operation completed");
});

// Stack them: advice1 → advice2 → advice3 → original
const advisedFunction = install_advices(
  [hookAdvice, trackingAdvice, loggingAdvice],
  cell.addContent.bind(cell)  // Wrap the addContent method
);

// Now when called, all advices execute in sequence
advisedFunction(newValue);
```

### Filter Based on Conditions

```typescript
// Create advice that only emits on specific conditions
export function create_conditional_hook_advice(condition: (data: any) => boolean) {
  return construct_advice([], (result: any) => {
    const [cell, ...data] = result;
    if (condition(data[0])) {
      emit_hook(cell, 'strongest_changed', { values: data });
    }
  });
}

// Example: Only emit hook for values > 100
const largeValueHook = create_conditional_hook_advice(
  (value) => typeof value === 'number' && value > 100
);
```

## Comparison: Direct vs Advice Pattern

### Direct Pattern (Simple)

```typescript
// ✅ Simple and direct
register_cell_hook(cell, 'strongest_changed', (hook) => {
  console.log("Value:", hook.data.new);
});

// ✅ Good for: One-off listeners, debugging, testing
// ❌ Bad for: Multiple related concerns, composable behaviors
```

### Advice Pattern (Composable)

```typescript
// ✅ Composable and reusable
const advices = [
  create_hook_emission_advice('strongest_changed'),
  create_metrics_advice(),
  create_error_handling_advice()
];

const wrapped = install_advices(advices, originalMethod);

// ✅ Good for: Multiple concerns, generic infrastructure
// ❌ Bad for: Simple one-off hooks (use direct pattern)
```

## Use Cases

### 1. Global Hook Installation

```typescript
// Install hooks on all cells globally
function enable_debug_hooks() {
  return construct_advice([], (result: any) => {
    const [cell, ...data] = result;
    console.log(`[DEBUG] ${cell.getRelation().get_name()} updated`);
  });
}

// Apply to cell methods
```

### 2. Victor Clock Tracking

```typescript
import { victor_clock_layer } from "../AdvanceReactivity/victor_clock";

export function create_victor_clock_advice() {
  return construct_advice([], (result: any) => {
    const [cell, oldValue, newValue] = result;
    
    if (newValue && victor_clock_layer.has_value(newValue)) {
      const clock = victor_clock_layer.get_value(newValue);
      console.log(`Updated with clock:`, clock);
    }
  });
}
```

### 3. Performance Monitoring

```typescript
export function create_performance_advice() {
  const times: number[] = [];
  
  return {
    advice: construct_advice([], (result: any) => {
      const startTime = performance.now();
      times.push(performance.now() - startTime);
    }),
    get_average_time: () => {
      const sum = times.reduce((a, b) => a + b, 0);
      return sum / times.length;
    },
    get_stats: () => ({
      count: times.length,
      avg: sum / times.length,
      max: Math.max(...times),
      min: Math.min(...times)
    })
  };
}
```

### 4. Contradiction Detection Hook

```typescript
import { is_contradiction } from "@/cell/CellValue";

export function create_contradiction_alert_advice() {
  return construct_advice([], (result: any) => {
    const [cell, oldValue, newValue] = result;
    
    if (is_contradiction(newValue)) {
      console.warn(`⚠️  CONTRADICTION in ${cell.getRelation().get_name()}`);
      emit_hook(cell, 'strongest_changed', {
        is_contradiction: true,
        old: oldValue,
        new: newValue
      });
    }
  });
}
```

### 5. Reactive Sink Integration

```typescript
export function create_reactive_sink_advice(sink: ExternalSystem) {
  return construct_advice([], (result: any) => {
    const [cell, oldValue, newValue] = result;
    
    // Send updates to external system
    sink.notify({
      cellId: cell.getRelation().get_id(),
      cellName: cell.getRelation().get_name(),
      oldValue,
      newValue,
      timestamp: Date.now()
    });
  });
}
```

## TypeScript Decorators (Future Enhancement)

While decorators aren't currently used, they could provide even cleaner syntax:

```typescript
// Future possibility - not yet implemented
@AddHook('strongest_changed')
@Performance()
@ErrorHandling()
class MyCell extends Cell {
  addContent(increment) {
    // Implementation
  }
}

// Equivalent to:
const advices = [
  create_hook_emission_advice('strongest_changed'),
  create_performance_advice(),
  create_error_handling_advice()
];
const wrappedMethod = install_advices(advices, originalMethod);
```

Decorators would require experimental TypeScript features and would primarily be syntactic sugar over the advice pattern.

## Best Practices

### 1. Use Direct Hooks for Simple Cases

```typescript
// ✓ Good: Simple debugging
register_cell_hook(cell, 'strongest_changed', (hook) => {
  console.log("Changed:", hook.data.new);
});
```

### 2. Use Advices for Infrastructure

```typescript
// ✓ Good: Reusable monitoring infrastructure
const monitoring = create_performance_advice();
const wrapped = install_advice(monitoring.advice, cell.addContent);
```

### 3. Compose Orthogonal Concerns

```typescript
// ✓ Good: Multiple independent concerns
const advices = [
  create_hook_emission_advice('strongest_changed'),
  create_performance_advice(),
  create_error_handling_advice()
];
```

### 4. Avoid Over-nesting

```typescript
// ❌ Bad: Too many nested advices
const wrap = (fn) => install_advices([a1, a2, a3, a4, a5], fn);

// ✓ Better: Group related concerns
const wrappedMonitoring = install_advices([a1, a2], fn);
const wrappedWithErrors = install_advice(a3, wrappedMonitoring);
```

## See Also

- `Cell.ts` - Core implementation with hook registry and advice factories
- `ErrorHandling.ts` - Example advice usage for error handling
- `generic-handler/generic_advice.ts` - Advice system documentation
- Direct Hook Guide (previous documentation) - For simple hook usage
