/**
 * @fileoverview Hookable Object Wrapper System
 * 
 * Provides a flexible way to wrap any object and make its methods observable.
 * Allows installing callbacks to monitor inputs and outputs of all methods.
 * 
 * Features:
 * - Wraps objects and preserves method signatures
 * - Hook registry per method
 * - Multiple independent hooks per method
 * - Error resilience (one failed hook doesn't crash others)
 * - Type-safe hook registration
 */

import { construct_advice, install_advice } from "generic-handler/built_in_generics/generic_advice";

/**
 * Callback fired before method execution
 */
export type PreHook = (methodName: string, args: any[]) => void | any;

/**
 * Callback fired after method execution
 */
export type PostHook = (methodName: string, args: any[], result: any) => void | any;

/**
 * Callback fired if method throws
 */
export type ErrorHook = (methodName: string, args: any[], error: Error) => void;

/**
 * Hot-editable hook wrapper - allows dynamic replacement of hook implementations
 */
export interface HotHook {
  current: PreHook | PostHook | ErrorHook;
  update: (newHook: PreHook | PostHook | ErrorHook) => void;
  version: number;
}

/**
 * Configuration for hookable wrapper
 */
export interface HookableConfig {
  pre?: PreHook[];      // Callbacks before method execution
  post?: PostHook[];    // Callbacks after method execution
  error?: ErrorHook[];  // Callbacks on error
  debug?: boolean;      // Log all hook activity
}

/**
 * Hook registry for a single method
 */
interface MethodHooks {
  pre: (PreHook | HotHook)[];
  post: (PostHook | HotHook)[];
  error: (ErrorHook | HotHook)[];
}

/**
 * Internal hook registry
 */
interface HookRegistry {
  [methodName: string]: MethodHooks;
}

/**
 * Creates a wrapper that makes an object's methods hookable
 * 
 * @param obj - Object to wrap
 * @param config - Initial hook configuration
 * @returns Proxy that intercepts method calls
 * 
 * @example
 * const obj = { add: (a, b) => a + b };
 * const wrapped = make_hookable(obj, {
 *   pre: [(name, args) => console.log(`Calling ${name} with`, args)],
 *   post: [(name, args, result) => console.log(`${name} returned`, result)]
 * });
 * wrapped.add(2, 3); // Logs both pre and post hooks
 */
export function make_hookable<T extends Record<string, any>>(
  obj: T,
  config?: HookableConfig
): T {
  const registry: HookRegistry = {};
  const debug = config?.debug ?? false;

  /**
   * Get or create hooks for a method
   */
  const ensure_method_hooks = (methodName: string): MethodHooks => {
    if (!registry[methodName]) {
      registry[methodName] = {
        pre: [...(config?.pre ?? [])],
        post: [...(config?.post ?? [])],
        error: [...(config?.error ?? [])]
      };
    }
    return registry[methodName];
  };

  /**
   * Execute all hooks of a type for a method
   */
  const execute_hooks = (
    hooks: (PreHook | PostHook | ErrorHook | HotHook)[],
    methodName: string,
    args: any[]
  ) => {
    hooks.forEach(hook => {
      try {
        // Handle hot-editable hooks
        const actualHook = is_hot_hook(hook) ? hook.current : hook;
        (actualHook as any)(methodName, ...args);
      } catch (e) {
        if (debug) {
          console.error(`Hook error in ${methodName}:`, e);
        }
      }
    });
  };

  /**
   * Main proxy handler
   */
  const handler: ProxyHandler<T> = {
    get(target, prop: string) {
      const value = target[prop];

      // Return hook management methods
      if (prop === '__add_pre_hook') {
        return (methodName: string, hook: PreHook | HotHook) => {
          ensure_method_hooks(methodName).pre.push(hook);
          return () => {
            const hooks = ensure_method_hooks(methodName).pre;
            const idx = hooks.indexOf(hook);
            if (idx > -1) hooks.splice(idx, 1);
          };
        };
      }

      if (prop === '__add_post_hook') {
        return (methodName: string, hook: PostHook | HotHook) => {
          ensure_method_hooks(methodName).post.push(hook);
          return () => {
            const hooks = ensure_method_hooks(methodName).post;
            const idx = hooks.indexOf(hook);
            if (idx > -1) hooks.splice(idx, 1);
          };
        };
      }

      if (prop === '__add_error_hook') {
        return (methodName: string, hook: ErrorHook | HotHook) => {
          ensure_method_hooks(methodName).error.push(hook);
          return () => {
            const hooks = ensure_method_hooks(methodName).error;
            const idx = hooks.indexOf(hook);
            if (idx > -1) hooks.splice(idx, 1);
          };
        };
      }

      if (prop === '__get_registry') {
        return () => registry;
      }

      if (prop === '__enable_debug') {
        return () => {
          (debug as any) = true;
        };
      }

      if (prop === '__disable_debug') {
        return () => {
          (debug as any) = false;
        };
      }

      // Add update hook method for hot-editing
      if (prop === '__update_hook') {
        return (methodName: string, hookIndex: number, newHook: PreHook | PostHook | ErrorHook) => {
          const hooks = registry[methodName];
          if (hooks && hooks.pre[hookIndex]) {
            (hooks.pre[hookIndex] as any) = newHook;
            return true;
          }
          if (hooks && hooks.post[hookIndex]) {
            (hooks.post[hookIndex] as any) = newHook;
            return true;
          }
          if (hooks && hooks.error[hookIndex]) {
            (hooks.error[hookIndex] as any) = newHook;
            return true;
          }
          return false;
        };
      }

      // Return methods wrapped with hooks
      if (typeof value === 'function') {
        return function(...args: any[]) {
          const methodName = String(prop);
          const hooks = registry[methodName] ?? ensure_method_hooks(methodName);

          // Execute pre-hooks
          execute_hooks(hooks.pre, methodName, [args]);

          try {
            // Execute original method
            const result = value.apply(target, args);

            // Execute post-hooks
            execute_hooks(hooks.post, methodName, [args, result]);

            return result;
          } catch (error) {
            // Execute error hooks
            execute_hooks(hooks.error as ErrorHook[], methodName, [args, error as Error]);
            throw error;
          }
        };
      }

      return value;
    }
  };

  return new Proxy(obj, handler) as T;
}

/**
 * Type-safe interface for hookable objects
 */
export interface Hookable<T extends Record<string, any>> {
  __add_pre_hook(methodName: keyof T, hook: PreHook | HotHook): () => void;
  __add_post_hook(methodName: keyof T, hook: PostHook | HotHook): () => void;
  __add_error_hook(methodName: keyof T, hook: ErrorHook | HotHook): () => void;
  __get_registry(): HookRegistry;
  __enable_debug(): void;
  __disable_debug(): void;
  __update_hook(methodName: keyof T, hookIndex: number, newHook: PreHook | PostHook | ErrorHook): boolean;
}

/**
 * Register a pre-hook on a method
 */
export function on_method_start<T extends Record<string, any>>(
  obj: Hookable<T>,
  methodName: keyof T,
  callback: PreHook
): () => void {
  return obj.__add_pre_hook(methodName, callback);
}

/**
 * Register a post-hook on a method
 */
export function on_method_end<T extends Record<string, any>>(
  obj: Hookable<T>,
  methodName: keyof T,
  callback: PostHook
): () => void {
  return obj.__add_post_hook(methodName, callback);
}

/**
 * Register an error-hook on a method
 */
export function on_method_error<T extends Record<string, any>>(
  obj: Hookable<T>,
  methodName: keyof T,
  callback: ErrorHook
): () => void {
  return obj.__add_error_hook(methodName, callback);
}

/**
 * Register hooks for both start and end
 */
export function on_method<T extends Record<string, any>>(
  obj: Hookable<T>,
  methodName: keyof T,
  handlers: {
    start?: PreHook;
    end?: PostHook;
    error?: ErrorHook;
  }
): () => void {
  const unsubscribers: Array<() => void> = [];

  if (handlers.start) {
    unsubscribers.push(obj.__add_pre_hook(methodName, handlers.start));
  }

  if (handlers.end) {
    unsubscribers.push(obj.__add_post_hook(methodName, handlers.end));
  }

  if (handlers.error) {
    unsubscribers.push(obj.__add_error_hook(methodName, handlers.error));
  }

  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}

/**
 * Create a tracing hook that logs all activity
 */
export function create_tracing_hooks(label: string = 'TRACE') {
  return {
    pre: (methodName: string, args: any[]) => {
      console.log(`[${label}] → ${methodName}(`, args, ')');
    },
    post: (methodName: string, args: any[], result: any) => {
      console.log(`[${label}] ← ${methodName}() = `, result);
    },
    error: (methodName: string, args: any[], error: Error) => {
      console.error(`[${label}] ✗ ${methodName}() threw:`, error.message);
    }
  };
}

/**
 * Create hooks that collect call statistics
 */
export function create_stats_hooks() {
  const stats: Map<string, {
    calls: number;
    successes: number;
    failures: number;
    totalTime: number;
    errors: string[];
  }> = new Map();

  const timers: Map<string, number> = new Map();

  return {
    hooks: {
      pre: (methodName: string) => {
        timers.set(`${methodName}_${Date.now()}`, Date.now());
      },
      post: (methodName: string, args: any[], result: any) => {
        const key = methodName;
        if (!stats.has(key)) {
          stats.set(key, { calls: 0, successes: 0, failures: 0, totalTime: 0, errors: [] });
        }
        const stat = stats.get(key)!;
        stat.calls++;
        stat.successes++;
      },
      error: (methodName: string, args: any[], error: Error) => {
        const key = methodName;
        if (!stats.has(key)) {
          stats.set(key, { calls: 0, successes: 0, failures: 0, totalTime: 0, errors: [] });
        }
        const stat = stats.get(key)!;
        stat.calls++;
        stat.failures++;
        stat.errors.push(error.message);
      }
    },
    get_stats: () => Object.fromEntries(stats),
    reset_stats: () => stats.clear()
  };
}

/**
 * Create hooks that filter and transform method calls
 */
export function create_filtering_hooks(predicate: (methodName: string, args: any[]) => boolean) {
  return {
    pre: (methodName: string, args: any[]) => {
      if (!predicate(methodName, args)) {
        console.log(`[FILTERED] Skipped ${methodName} (predicate returned false)`);
      }
    }
  };
}

/**
 * Compose multiple hook configurations
 */
export function compose_hooks(...configs: HookableConfig[]): HookableConfig {
  return {
    pre: configs.flatMap(c => c.pre ?? []),
    post: configs.flatMap(c => c.post ?? []),
    error: configs.flatMap(c => c.error ?? []),
    debug: configs.some(c => c.debug)
  };
}

/**
 * Create a memoizing decorator that caches results
 */
export function create_memoizing_hooks() {
  const cache = new Map<string, any>();

  return {
    pre: (methodName: string, args: any[]) => {
      const key = `${methodName}:${JSON.stringify(args)}`;
      if (cache.has(key)) {
        console.log(`[CACHE HIT] ${methodName}`, args);
      }
    },
    post: (methodName: string, args: any[], result: any) => {
      const key = `${methodName}:${JSON.stringify(args)}`;
      cache.set(key, result);
    }
  };
}

/**
 * Create a hot-editable pre-hook
 */
export function create_hot_pre_hook(initial: PreHook): HotHook {
  return {
    current: initial,
    update(newHook: PreHook | PostHook | ErrorHook) {
      this.current = newHook as PreHook;
      this.version++;
    },
    version: 0
  };
}

/**
 * Create a hot-editable post-hook
 */
export function create_hot_post_hook(initial: PostHook): HotHook {
  return {
    current: initial,
    update(newHook: PreHook | PostHook | ErrorHook) {
      this.current = newHook as PostHook;
      this.version++;
    },
    version: 0
  };
}

/**
 * Create a hot-editable error-hook
 */
export function create_hot_error_hook(initial: ErrorHook): HotHook {
  return {
    current: initial,
    update(newHook: PreHook | PostHook | ErrorHook) {
      this.current = newHook as ErrorHook;
      this.version++;
    },
    version: 0
  };
}

/**
 * Check if a hook is a hot-editable hook
 */
export function is_hot_hook(hook: any): hook is HotHook {
  return hook && typeof hook === 'object' && 'current' in hook && 'update' in hook && 'version' in hook;
}

/**
 * Update a hook implementation dynamically (hot-edit)
 */
export function update_hook<T extends Record<string, any>>(
  obj: Hookable<T>,
  methodName: keyof T,
  hookIndex: number,
  newHook: PreHook | PostHook | ErrorHook
): boolean {
  return obj.__update_hook(methodName, hookIndex, newHook);
}

/**
 * Update a hot-editable hook's implementation
 */
export function update_hot_hook(hotHook: HotHook, newImplementation: PreHook | PostHook | ErrorHook): void {
  hotHook.update(newImplementation);
}

/**
 * Get hook version (for detecting changes)
 */
export function get_hot_hook_version(hotHook: HotHook): number {
  return hotHook.version;
}
