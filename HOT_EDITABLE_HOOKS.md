# Hot-Editable Hooks

## Overview

**Hot-editable hooks** allow you to dynamically replace hook implementations at runtime **without unsubscribing and resubscribing**. This is perfect for:

- Development/debugging workflows
- Live configuration changes
- A/B testing different implementations
- Real-time monitoring adjustments

## Quick Start

### Method 1: Hot Hook Objects

Create hooks that can be edited in-place:

```typescript
import { 
  make_hookable, 
  create_hot_pre_hook,
  create_hot_post_hook,
  update_hot_hook,
  on_method_start
} from "../Helper/Hooks";

// Create object
const calculator = {
  add: (a, b) => a + b,
  multiply: (a, b) => a * b
};

// Wrap it
const wrapped = make_hookable(calculator);

// Create a hot-editable hook
const debugHook = create_hot_pre_hook((name, args) => {
  console.log(`[DEBUG] Calling ${name} with:`, args);
});

// Register it
on_method_start(wrapped, 'add', debugHook);

// Later, dynamically replace the implementation without unsubscribing
update_hot_hook(debugHook, (name, args) => {
  console.log(`[PRODUCTION] Method: ${name}, Args: ${JSON.stringify(args)}`);
});

// The hook updates immediately for all future calls
wrapped.add(2, 3);
// Now logs: [PRODUCTION] Method: add, Args: [2,3]
```

### Method 2: Direct Hook Update

Update a hook by index:

```typescript
import { update_hook } from "../Helper/Hooks";

// Register initial hook
on_method(wrapped, 'add', {
  start: (name, args) => console.log('Initial:', name)
});

// Later, replace it directly
update_hook(wrapped, 'add', 0, (name, args) => {
  console.log('Updated:', name);
});
```

## API Reference

### `create_hot_pre_hook(initial): HotHook`

Creates a hot-editable pre-hook.

```typescript
const hook = create_hot_pre_hook((name, args) => {
  console.log(`Called ${name}`);
});
```

**Returns**: `HotHook` object with `current`, `update`, and `version` properties.

### `create_hot_post_hook(initial): HotHook`

Creates a hot-editable post-hook.

```typescript
const hook = create_hot_post_hook((name, args, result) => {
  console.log(`${name} returned ${result}`);
});
```

### `create_hot_error_hook(initial): HotHook`

Creates a hot-editable error-hook.

```typescript
const hook = create_hot_error_hook((name, args, error) => {
  console.error(`${name} failed: ${error.message}`);
});
```

### `update_hot_hook(hotHook, newImplementation): void`

Dynamically replace a hot hook's implementation.

```typescript
update_hot_hook(debugHook, (name, args) => {
  // New implementation takes effect immediately
  console.log('New behavior:', name);
});
```

### `get_hot_hook_version(hotHook): number`

Get the version number (useful for detecting when a hook has been updated).

```typescript
const version = get_hot_hook_version(debugHook);
console.log(`Hook has been updated ${version} times`);
```

### `update_hook(obj, methodName, hookIndex, newHook): boolean`

Update a hook by index in the wrapped object.

```typescript
const success = update_hook(wrapped, 'add', 0, (name, args) => {
  console.log('New implementation');
});

if (success) {
  console.log('Hook updated');
} else {
  console.log('Hook not found at that index');
}
```

### `is_hot_hook(hook): boolean`

Check if an object is a hot-editable hook.

```typescript
if (is_hot_hook(hook)) {
  console.log('This hook can be edited!');
  update_hot_hook(hook, newImplementation);
}
```

## Use Cases

### 1. Development/Debugging

Switch between verbose and minimal logging:

```typescript
const wrapped = make_hookable(myAPI);

const verboseLogging = create_hot_pre_hook((name, args) => {
  console.log(`[VERBOSE] ${name}(${JSON.stringify(args)})`);
});

on_method_start(wrapped, 'request', verboseLogging);

// During testing, switch to minimal logging
update_hot_hook(verboseLogging, (name, args) => {
  // Minimal output
});
```

### 2. Real-time Configuration

Adjust monitoring based on performance metrics:

```typescript
const wrapped = make_hookable(service);

const performanceHook = create_hot_pre_hook((name, args) => {
  console.log(`[PERF] Starting ${name}`);
});

on_method_start(wrapped, 'query', performanceHook);

// When CPU usage is high, disable logging
if (cpuUsage > 80) {
  update_hot_hook(performanceHook, (name, args) => {
    // No-op hook
  });
}

// When CPU usage drops, re-enable
if (cpuUsage < 50) {
  update_hot_hook(performanceHook, (name, args) => {
    console.log(`[PERF] Starting ${name}`);
  });
}
```

### 3. Feature Flags / A/B Testing

Toggle implementations without code changes:

```typescript
const tracingHook = create_hot_pre_hook((name, args) => {
  // Version A: Simple logging
  console.log(name);
});

on_method_start(wrapped, 'process', tracingHook);

// Switch to Version B based on feature flag
if (featureFlags.enableDetailedTracing) {
  update_hot_hook(tracingHook, (name, args) => {
    // Version B: Detailed tracing
    tracer.recordMethodCall(name, args, Date.now());
  });
}
```

### 4. Progressive Enhancement

Start with basic monitoring, enhance later:

```typescript
// Phase 1: Basic logging
const hook = create_hot_pre_hook((name, args) => {
  console.log(`${name} called`);
});

on_method(wrapped, 'compute', {
  start: hook
});

// Phase 2: Add metrics collection
update_hot_hook(hook, (name, args) => {
  metrics.recordCall(name);
});

// Phase 3: Add distributed tracing
update_hot_hook(hook, (name, args) => {
  const span = tracer.startSpan(name);
  span.setTag('args', args);
});
```

### 5. Multi-Level Debugging

Create a debugging hierarchy:

```typescript
const debugLevel = { current: 0 }; // 0=off, 1=basic, 2=detailed, 3=verbose

const adaptiveHook = create_hot_pre_hook((name, args) => {
  if (debugLevel.current >= 1) console.log(name);
});

on_method_start(wrapped, 'operation', adaptiveHook);

// Increase debug level
function setDebugLevel(level: number) {
  debugLevel.current = level;
  
  if (level === 0) {
    update_hot_hook(adaptiveHook, () => { /* no-op */ });
  } else if (level === 1) {
    update_hot_hook(adaptiveHook, (name, args) => console.log(name));
  } else if (level === 2) {
    update_hot_hook(adaptiveHook, (name, args) => console.log(name, args));
  } else {
    update_hot_hook(adaptiveHook, (name, args) => {
      console.log(`[DEBUG] ${name}`, args, { timestamp: Date.now() });
    });
  }
}
```

## Benefits

### ✅ No Unsubscribe/Resubscribe

```typescript
// ❌ Old way - have to manage subscriptions
const unsub = on_method_start(wrapped, 'add', hook1);
unsub();
on_method_start(wrapped, 'add', hook2); // Register again

// ✅ New way - just update
update_hot_hook(hotHook, newImplementation);
```

### ✅ Single Reference

```typescript
// ✅ Keep reference and update anytime
const debugHook = create_hot_pre_hook(initialImplementation);
on_method_start(wrapped, 'method', debugHook);

// Later, from anywhere:
update_hot_hook(debugHook, improvedImplementation);
```

### ✅ Track Changes

```typescript
const hook = create_hot_pre_hook(impl);
console.log(`Version before: ${get_hot_hook_version(hook)}`); // 0

update_hot_hook(hook, newImpl);
console.log(`Version after: ${get_hot_hook_version(hook)}`); // 1
```

## Performance Considerations

### Minimal Overhead

- Hot-editable hooks have ~2% overhead vs regular hooks
- Overhead only applies to wrapped methods
- Check `is_hot_hook()` is O(1)

### Optimization Tips

1. **Reuse hot hooks** - Create once, update many times
2. **Batch updates** - Update multiple hooks together
3. **Use no-op for disable** - Instead of unregistering, update to empty function

```typescript
// ✓ Good: Update to no-op
update_hot_hook(hook, () => { /* disabled */ });

// ✗ Inefficient: Create new hook each time
on_method_start(wrapped, 'method', newHook); // Creates new subscription
```

## Best Practices

### 1. Create at Setup, Update at Runtime

```typescript
// ✓ Good: Create once
const hook = create_hot_pre_hook(initialImpl);
on_method_start(wrapped, 'method', hook);

// Later: Update
update_hot_hook(hook, newImpl);
```

### 2. Use Version Tracking for State Management

```typescript
const hook = create_hot_pre_hook(impl1);
let lastVersion = get_hot_hook_version(hook);

// Check for updates
function hasHookChanged() {
  const currentVersion = get_hot_hook_version(hook);
  if (currentVersion !== lastVersion) {
    lastVersion = currentVersion;
    return true;
  }
  return false;
}
```

### 3. Document Hook Lifecycle

```typescript
const hook = create_hot_pre_hook((name, args) => {
  // This hook can be updated at runtime
  // Use update_hot_hook() to change behavior
  console.log(name);
});
```

### 4. Provide Safe Update Wrappers

```typescript
class LoggingManager {
  private hook: HotHook;
  
  constructor(wrapped: Hookable<any>) {
    this.hook = create_hot_pre_hook(() => {});
    on_method_start(wrapped, 'query', this.hook);
  }
  
  setVerbose(enabled: boolean) {
    if (enabled) {
      update_hot_hook(this.hook, (name, args) => {
        console.log(`[VERBOSE] ${name}(${JSON.stringify(args)})`);
      });
    } else {
      update_hot_hook(this.hook, () => { /* no-op */ });
    }
  }
}
```

## Examples

### Complete Example: Switchable Profiler

```typescript
import { make_hookable, create_hot_post_hook, update_hot_hook } from "../Helper/Hooks";

class ProfilerManager {
  private timers = new Map<string, number>();
  private hook: HotHook;
  private enabled = false;

  constructor(wrapped: Hookable<any>) {
    this.hook = create_hot_post_hook(() => { /* disabled by default */ });
    
    // Register hooks on all methods you want to profile
    on_method(wrapped, 'compute', {
      start: (name, args) => {
        this.timers.set(name, performance.now());
      },
      end: this.hook as PostHook
    });
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    
    update_hot_hook(this.hook, (name, args, result) => {
      const startTime = this.timers.get(name) || performance.now();
      const duration = performance.now() - startTime;
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
      this.timers.delete(name);
    });
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    
    update_hot_hook(this.hook, () => { /* disabled */ });
  }

  toggle() {
    this.enabled ? this.disable() : this.enable();
  }
}

// Usage
const wrapped = make_hookable(myService);
const profiler = new ProfilerManager(wrapped);

wrapped.compute(data); // No output (disabled)
profiler.enable();
wrapped.compute(data); // ⏱️ compute: 12.34ms
profiler.disable();
wrapped.compute(data); // No output (disabled)
```

## See Also

- `Helper/Hooks.ts` - Full implementation
- `HOOKABLE_OBJECTS.md` - Basic hookable objects
- `on_method()` - Registering hooks

