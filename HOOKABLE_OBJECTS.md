# Hookable Objects System

## Overview

The **Hookable Objects** system allows you to wrap any object and make all of its methods observable without modifying the original implementation. You can install callbacks to monitor:

- **Inputs** - What arguments are being passed
- **Outputs** - What results are being returned
- **Errors** - What exceptions are thrown

## Quick Start

### Basic Usage

```typescript
import { make_hookable, on_method } from "../Helper/Hooks";

// Create an object
const math = {
  add: (a: number, b: number) => a + b,
  multiply: (a: number, b: number) => a * b
};

// Wrap it to make methods hookable
const wrapped = make_hookable(math);

// Add hooks
on_method(wrapped, 'add', {
  start: (name, args) => console.log(`Calling ${name}(${args})`),
  end: (name, args, result) => console.log(`${name} returned ${result}`),
  error: (name, args, error) => console.error(`${name} failed:`, error)
});

// Use the wrapped object normally
wrapped.add(2, 3); // Logs both start and end hooks
```

### Simple Tracing

```typescript
import { make_hookable, create_tracing_hooks } from "../Helper/Hooks";

const obj = { 
  getValue: () => 42,
  setValue: (v: number) => { /* ... */ }
};

const wrapped = make_hookable(obj, create_tracing_hooks('MY_TRACE'));
wrapped.getValue();
// Output: [MY_TRACE] → getValue( )
//         [MY_TRACE] ← getValue() = 42
```

## API Reference

### `make_hookable<T>(obj, config?): T`

Creates a hookable proxy wrapper around an object.

```typescript
// Wrap with initial hooks
const wrapped = make_hookable(obj, {
  pre: [(name, args) => console.log('Called:', name)],
  post: [(name, args, result) => console.log('Result:', result)],
  error: [(name, args, error) => console.error('Error:', error)],
  debug: true
});
```

**Returns**: A Proxy that preserves all original object properties and methods while intercepting method calls.

### `on_method_start<T>(obj, methodName, callback): () => void`

Register a callback that runs **before** a method executes.

```typescript
const unsub = on_method_start(wrapped, 'add', (name, args) => {
  console.log(`Before: ${name}(${args.join(', ')})`);
});

// Unsubscribe later
unsub();
```

### `on_method_end<T>(obj, methodName, callback): () => void`

Register a callback that runs **after** a method executes.

```typescript
on_method_end(wrapped, 'add', (name, args, result) => {
  console.log(`After: ${name}(${args.join(', ')}) = ${result}`);
});
```

### `on_method_error<T>(obj, methodName, callback): () => void`

Register a callback that runs if a method **throws an error**.

```typescript
on_method_error(wrapped, 'divide', (name, args, error) => {
  console.error(`Failed: ${name}(${args.join(', ')}) - ${error.message}`);
});
```

### `on_method<T>(obj, methodName, handlers): () => void`

Register multiple hooks at once.

```typescript
const unsub = on_method(wrapped, 'add', {
  start: (name, args) => console.log('Start:', name),
  end: (name, args, result) => console.log('End:', result),
  error: (name, args, error) => console.error('Error:', error)
});
```

## Built-in Hook Factories

### `create_tracing_hooks(label?): HookableConfig`

Creates hooks that log all method calls with inputs and outputs.

```typescript
const traced = make_hookable(obj, create_tracing_hooks('API'));
// Output:
// [API] → method( arg1, arg2 )
// [API] ← method() =  result
// [API] ✗ method() threw: Error message
```

### `create_stats_hooks(): { hooks, get_stats, reset_stats }`

Collects statistics about method calls.

```typescript
const { hooks, get_stats } = create_stats_hooks();
const wrapped = make_hookable(obj, hooks);

// Use the object...
wrapped.add(2, 3);
wrapped.add(5, 7);
wrapped.divide(10, 0); // Error

// Get statistics
console.log(get_stats());
// Output:
// {
//   add: { calls: 2, successes: 2, failures: 0, ... },
//   divide: { calls: 1, successes: 0, failures: 1, errors: ['Division by zero'] }
// }
```

### `create_memoizing_hooks(): HookableConfig`

Creates hooks that cache and log cache hits.

```typescript
const { pre, post } = create_memoizing_hooks();
const wrapped = make_hookable(obj, { pre, post });

wrapped.expensiveCalc(5); // Computes
wrapped.expensiveCalc(5); // [CACHE HIT]
```

### `compose_hooks(...configs): HookableConfig`

Combines multiple hook configurations.

```typescript
const composed = compose_hooks(
  create_tracing_hooks('TRACE'),
  create_stats_hooks().hooks,
  create_memoizing_hooks()
);

const wrapped = make_hookable(obj, composed);
// Now traces, collects stats, AND memoizes!
```

## Advanced Usage

### Monitoring Data Flow

```typescript
import { make_hookable, on_method } from "../Helper/Hooks";
import { victor_clock_layer } from "../AdvanceReactivity/victor_clock";

// Wrap a processor
const processor = {
  process: (data: any) => ({ ...data, processed: true })
};

const wrapped = make_hookable(processor);

// Monitor inputs and outputs
on_method(wrapped, 'process', {
  start: (name, args) => {
    console.log('Input data:', args[0]);
  },
  end: (name, args, result) => {
    console.log('Output data:', result);
  }
});
```

### Performance Profiling

```typescript
const { hooks, get_stats } = create_stats_hooks();
const wrapped = make_hookable(complexObject, hooks);

// Run operations...
for (let i = 0; i < 1000; i++) {
  wrapped.heavyComputation(i);
}

// Analyze performance
const stats = get_stats();
stats.heavyComputation.forEach((stat: any) => {
  console.log(`
    Calls: ${stat.calls}
    Successes: ${stat.successes}
    Failures: ${stat.failures}
    Success Rate: ${(stat.successes / stat.calls * 100).toFixed(2)}%
  `);
});
```

### Conditional Logging

```typescript
const wrapped = make_hookable(obj);

// Only log calls with specific arguments
on_method_start(wrapped, 'process', (name, args) => {
  if (args[0]?.priority === 'high') {
    console.log('High priority call:', name, args);
  }
});
```

### Method Call Sequencing

```typescript
const wrapped = make_hookable(obj);
const sequence: string[] = [];

on_method_start(wrapped, 'methodA', (name) => sequence.push('A_start'));
on_method_end(wrapped, 'methodA', (name) => sequence.push('A_end'));

on_method_start(wrapped, 'methodB', (name) => sequence.push('B_start'));
on_method_end(wrapped, 'methodB', (name) => sequence.push('B_end'));

wrapped.methodA();
wrapped.methodB();

console.log(sequence);
// Output: ['A_start', 'A_end', 'B_start', 'B_end']
```

### Error Recovery Hooks

```typescript
const wrapped = make_hookable(obj);

let errorCount = 0;

on_method_error(wrapped, 'riskyOperation', (name, args, error) => {
  errorCount++;
  console.warn(`Attempt ${errorCount} failed: ${error.message}`);
  
  if (errorCount < 3) {
    console.log('Retrying...');
    // Could implement retry logic here
  }
});

try {
  wrapped.riskyOperation();
} catch (e) {
  console.log('All retries exhausted');
}
```

## Hook Management

### Built-in Methods

The wrapped object exposes special methods for hook management:

```typescript
const wrapped = make_hookable(obj);

// Access hook registry
const registry = wrapped.__get_registry();
console.log('Registered hooks:', registry);

// Enable/disable debug logging
wrapped.__enable_debug();
wrapped.__disable_debug();

// Manually add hooks
wrapped.__add_pre_hook('methodName', (name, args) => { ... });
wrapped.__add_post_hook('methodName', (name, args, result) => { ... });
wrapped.__add_error_hook('methodName', (name, args, error) => { ... });
```

### Unsubscribing

All hook registration functions return an unsubscribe function:

```typescript
const unsub = on_method_start(wrapped, 'add', (name, args) => {
  console.log('Before:', name);
});

// Later, remove the hook
unsub();
```

## Best Practices

### 1. Wrap at Boundaries

```typescript
// ✓ Good: Wrap at API boundaries
const apiClient = make_hookable(httpClient);

// ❌ Bad: Wrapping internal utilities repeatedly
const wrapped1 = make_hookable(util);
const wrapped2 = make_hookable(util);
```

### 2. Use Appropriate Hook Type

```typescript
// ✓ Good: Use pre-hooks for logging inputs
on_method_start(wrapped, 'process', (name, args) => {
  console.log('Input:', args);
});

// ✓ Good: Use post-hooks for logging outputs
on_method_end(wrapped, 'process', (name, args, result) => {
  console.log('Output:', result);
});
```

### 3. Compose Related Concerns

```typescript
// ✓ Good: Combine related hooks
const config = compose_hooks(
  create_tracing_hooks('DEBUG'),
  create_stats_hooks().hooks
);

// ❌ Bad: Multiple separate wrappers
const wrap1 = make_hookable(obj, create_tracing_hooks());
const wrap2 = make_hookable(wrap1, create_stats_hooks().hooks);
```

### 4. Clean Up Subscriptions

```typescript
// ✓ Good: Unsubscribe when done
const unsub = on_method_start(wrapped, 'expensive', handler);
// ... use it ...
unsub();

// ❌ Bad: Leaking hooks
on_method_start(wrapped, 'expensive', handler);
// ... no cleanup ...
```

## Performance Considerations

### Overhead

- **Per-method call**: O(h) where h = number of hooks for that method
- **Hook registration**: O(1) 
- **Memory**: O(m × h) where m = number of methods, h = average hooks per method

### Optimization Tips

1. **Unsubscribe unused hooks** - Don't let hooks accumulate
2. **Use efficient hook code** - Heavy operations in hooks slow down everything
3. **Filter early** - Check conditions in pre-hooks before expensive operations

## Use Cases

### 1. API Debugging

```typescript
const api = make_hookable(externalService, create_tracing_hooks('API'));
// See exactly what's being sent and received
```

### 2. Performance Monitoring

```typescript
const { hooks, get_stats } = create_stats_hooks();
const service = make_hookable(service, hooks);
// Monitor call rates and failure rates
```

### 3. Contract Testing

```typescript
on_method_end(wrapped, 'getData', (name, args, result) => {
  if (!result || !result.id) {
    throw new Error('Contract violated: getData must return object with id');
  }
});
```

### 4. Audit Logging

```typescript
on_method(wrapped, 'deleteRecord', {
  start: (name, args) => {
    auditLog.record({ action: 'DELETE_START', id: args[0] });
  },
  end: (name, args, result) => {
    auditLog.record({ action: 'DELETE_SUCCESS', id: args[0] });
  },
  error: (name, args, error) => {
    auditLog.record({ action: 'DELETE_FAILED', id: args[0], error: error.message });
  }
});
```

## See Also

- `Helper/Hooks.ts` - Full implementation
- `Cell.ts` - Cell-specific hooks
- `Cell Hooks as Advice` guide - AOP patterns
