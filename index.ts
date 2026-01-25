/**
 * Copyright © 2024–2026 semi-0
 *
 * Based on propagator and interpreter ideas originally developed by
 * Chris Hanson and Gerald Jay Sussman as part of the SDF system
 * accompanying the book "Software Design for Flexibility".
 *
 * This file is part of a substantially modified TypeScript
 * reimplementation with a different execution, scheduling,
 * and distribution model.
 *
 * Licensed under the GNU General Public License v3.0 or later.
 */

/**
 * Propogator - A Constraint Propagation System
 * 
 * This is the main entry point for the Propogator library, providing easy access to
 * all core functionality including cells, propagators, schedulers, and different modes.
 * 
 * @example
 * ```typescript
 * import { 
 *   cell, 
 *   propagator, 
 *   reactive_mode, 
 *   constraint_mode, 
 *   run_immediate,
 *   record_propagators 
 * } from './index';
 * 
 * // Set up reactive mode with immediate execution
 * reactive_mode();
 * run_immediate();
 * 
 * // Create cells and propagators
 * const a = cell("a");
 * const b = cell("b");
 * const result = cell("result");
 * 
 * // Create a propagator
 * propagator.add(a, b, result);
 * 
 * // Add content to trigger propagation
 * a.addContent(5);
 * b.addContent(3);
 * // result will automatically contain 8
 * ```
 */

// ============================================================================
// CORE IMPORTS
// ============================================================================

// Initialize all generic procedure handlers (must be imported early to avoid circular dependencies)

// Cell-related imports
import { 
  construct_cell, 
  internal_cell_dispose,
  cell_strongest,
  cell_strongest_base_value,
  cell_id,
  cell_name,
  cell_content,
  update_cell,
  make_temp_cell,
  type Cell,
  is_cell,
  general_contradiction,
  set_handle_contradiction,
  handle_cell_contradiction
} from "./Cell/Cell";

// Propagator-related imports
import { 
  construct_propagator,
  compound_propagator,
  constraint_propagator,
  primitive_propagator,
  function_to_primitive_propagator,
  propagator_id,
  propagator_name,
  dispose_propagator,
  propagator_activate,
  type Propagator
} from "./Propagator/Propagator";

// Built-in propagators
import {
  p_add,
  p_subtract,
  p_multiply,
  p_divide,
  p_equal,
  p_less_than,
  p_greater_than,
  p_and,
  p_or,
  p_not,
  p_switch,
  p_sync,
  p_map_a,
  p_filter_a,
  p_zip,
  p_range,
 
  p_reduce,
  p_index,
  c_add,
  c_subtract,
  c_multiply,
  c_divide,
  c_range,
  ce_add,
  ce_subtract,
  ce_multiply,
  ce_divide,
  ce_equal,
  ce_less_than,
  ce_greater_than,
  ce_and,
  ce_or,
  ce_not,
  ce_switch,
  com_if,
  com_celsius_to_fahrenheit,
  com_meters_feet_inches,
  ce_constant
} from "./Propagator/BuiltInProps";

// Cell values and predicates
import {
  the_nothing,
  the_contradiction,
  the_disposed,
  is_nothing,
  is_contradiction,
  is_disposed,
  is_layered_contradiction,
  get_base_value,
  type CellValue
} from "./Cell/CellValue";

// Merge and value handling
import { 
  set_merge, 
  generic_merge, 
  define_handler 
} from "./Cell/Merge";
import { strongest_value } from "./Cell/StrongestValue";

// Scheduler and execution
import {
  Current_Scheduler,
  set_scheduler,
  clear_all_tasks,
  execute_all_tasks_sequential,
  steppable_run_task,
  set_immediate_execute,
  mark_for_disposal,
  disposal_queue_size
} from "./Shared/Scheduler/Scheduler";
import { simple_scheduler } from "./Shared/Scheduler/SimpleScheduler";
import { reactive_scheduler } from "./Shared/Scheduler/ReactiveScheduler";

// Public state management
import {
  set_global_state,
  PublicStateCommand,
  cell_snapshot,
  propagator_snapshot,
  observe_all_cells_update,
  observe_all_propagators_update
} from "./Shared/PublicState";

// Generic handler utilities
import { 
  match_args, 
  all_match,
  register_predicate 
} from "generic-handler/Predicates";

// Disposal utilities
import { dispose } from "./Shared/Reactivity/Dispose";

// Reactive interface
import { update, r_constant } from "./AdvanceReactivity/interface";

// Reactive merge functions
import { 
  reactive_merge, 
  reactive_fresh_merge,
  trace_earliest_emerged_value,
  trace_latest_emerged_value
} from "./AdvanceReactivity/traced_timestamp/genericPatch";

// Debug and inspection
import { 
  inspect_strongest, 
  inspect_content, 
  observe_cell 
} from "./Helper/Debug";

// Sugar and composition
import { 
  ce_pipe, 
  link, 
  bi_pipe 
} from "./Propagator/Sugar";

// Search and AMB
import {
  p_amb,
  p_amb_a,
  binary_amb,
  configure_log_amb_choose,
  configure_log_nogoods,
  configure_log_process_contradictions
} from "./Propagator/Search";

// UI helpers
import { 
  tell, 
  kick_out, 
  all_results, 
  enum_num_set 
} from "./Helper/UI";
import { trace_func } from "./helper";

// ============================================================================
// SHORTHAND FUNCTIONS
// ============================================================================

/**
 * Shorthand for construct_cell
 */
export const cell = construct_cell;


/**
 * Shorthand for add_cell_content
 */
export const add_content = update_cell;

/**
 * Shorthand for cell_strongest
 */
export const strongest = cell_strongest;

/**
 * Shorthand for cell_strongest_base_value
 */
// export const strongest_base_value = cell_strongest_base_value;

/**
 * Shorthand for cell_content
 */
export const content = cell_content;

/**
 * Shorthand for cell_id
 */
export const id = cell_id;

/**
 * Shorthand for cell_name
 */
export const name = cell_name;

// ============================================================================
// MODE CONFIGURATION FUNCTIONS
// ============================================================================

/**
 * Configure the system for reactive mode
 * - Sets up reactive scheduler
 * - Sets reactive merge function
 * - Clears all tasks
 * - Enables immediate execution
 */
export function reactive_mode() {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_merge(reactive_fresh_merge);
  clear_all_tasks();
  console.log("✅ Reactive mode enabled");
}

/**
 * Configure the system for constraint mode
 * - Sets up simple scheduler
 * - Sets generic merge function
 * - Clears all tasks
 * - Enables immediate execution
 */
export function constraint_mode() {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_global_state(PublicStateCommand.SET_SCHEDULER, simple_scheduler());
  set_merge(generic_merge);
  clear_all_tasks();
  console.log("✅ Constraint mode enabled");
}

/**
 * Enable immediate execution of propagators
 * - Propagators will execute immediately when their inputs change
 */
export function run_immediate() {
  set_immediate_execute(true);
  console.log("✅ Immediate execution enabled");
}

/**
 * Disable immediate execution of propagators
 * - Propagators will be queued and executed later
 */
export function run_deferred() {
  set_immediate_execute(false);
  console.log("✅ Deferred execution enabled");
}

/**
 * Enable recording of alerted propagators
 * - Useful for debugging and understanding propagation order
 */
export function record_propagators() {
  Current_Scheduler.record_alerted_propagator(true);
  console.log("✅ Propagator recording enabled");
}

/**
 * Disable recording of alerted propagators
 */
export function stop_recording_propagators() {
  Current_Scheduler.record_alerted_propagator(false);
  console.log("✅ Propagator recording disabled");
}

/**
 * Execute all pending tasks sequentially
 * - Useful when immediate execution is disabled
 */
export function execute() {
  return execute_all_tasks_sequential(() => {});
}

/**
 * Execute all pending tasks using steppable run
 * - Alternative to sequential execution
 */
export function execute_steppable() {
  return steppable_run_task(() => {});
}

/**
 * Clear all pending tasks
 */
export function clear_tasks() {
  clear_all_tasks();
  console.log("✅ All tasks cleared");
}

/**
 * Get the current disposal queue size
 */
export function get_disposal_queue_size() {
  return disposal_queue_size();
}

/**
 * Clean up disposed items
 */
export function cleanup() {
  Current_Scheduler.cleanup_disposed_items();
}

// ============================================================================
// REACTIVE CONSTANTS
// ============================================================================

/**
 * Create a reactive constant cell
 * - Use this instead of constant() in reactive mode
 * Note: Re-exported as alias to avoid circular dependency
 */

// ============================================================================
// LAZY OBJECT HELPER
// ============================================================================

/**
 * Create a lazy object that is only initialized when first accessed
 */
function lazyObject<T extends Record<string | number | symbol, any>>(factory: () => T): T {
  let value: T | undefined = undefined;
  return new Proxy({} as T, {
    get(_target, prop) {
      if (value === undefined) {
        value = factory();
      }
      return (value as any)[prop];
    },
    has(_target, prop) {
      if (value === undefined) {
        value = factory();
      }
      return prop in (value as any);
    },
    ownKeys(_target) {
      if (value === undefined) {
        value = factory();
      }
      return Reflect.ownKeys(value as any);
    }
  }) as T;
}

// ============================================================================
// CONVENIENCE OBJECTS (LAZY)
// ============================================================================

/**
 * Convenience object for creating primitive propagators (lazy)
 */
export const propagator = lazyObject(() => ({
        // Arithmetic
        add: p_add,
        subtract: p_subtract,
        multiply: p_multiply,
        divide: p_divide,
        
        // Comparison
        equal: p_equal,
        less_than: p_less_than,
        greater_than: p_greater_than,
        
        // Logical
        and: p_and,
        or: p_or,
        not: p_not,
        
        // Control
        switch: p_switch,
        sync: p_sync,
        
        // Functional
        map: p_map_a,
        filter: p_filter_a,
        zip: p_zip,
        range: p_range,

        reduce: p_reduce,
        index: p_index,
        
        // Constraint
        constraint: {
          add: c_add,
          subtract: c_subtract,
          multiply: c_multiply,
          divide: c_divide,
          range: c_range
        },
        
        // Cell expression
        expr: {
          add: ce_add,
          subtract: ce_subtract,
          multiply: ce_multiply,
          divide: ce_divide,
          equal: ce_equal,
          less_than: ce_less_than,
          greater_than: ce_greater_than,
          and: ce_and,
          or: ce_or,
          not: ce_not,
          switch: ce_switch
        },
        
        // Compound
        compound: {
          if: com_if,
          celsius_to_fahrenheit: com_celsius_to_fahrenheit,
          meters_feet_inches: com_meters_feet_inches
        },
        
        // Construction
        create: construct_propagator,
        compound_propagator: compound_propagator,
        constraint_propagator: constraint_propagator,
        primitive: primitive_propagator,
        function: function_to_primitive_propagator,
}));

/**
 * Convenience object for cell operations (lazy)
 */
export const cells = lazyObject(() => ({
  create: construct_cell,
  constant: ce_constant,
  reactive_constant: r_constant,
  temp: make_temp_cell,
  dispose: internal_cell_dispose,
  strongest: cell_strongest,
  // strongest_base_value: cell_strongest_base_value,
  id: cell_id,
  name: cell_name,
  content: cell_content,
  add_content: update_cell,
  tell: update_cell
}));

/**
 * Convenience object for predicates (lazy)
 */
export const predicates = lazyObject(() => ({
  nothing: is_nothing,
  contradiction: is_contradiction,
  disposed: is_disposed,
  layered_contradiction: is_layered_contradiction,
  base_value: get_base_value
}));

/**
 * Convenience object for values (lazy)
 */
export const values = lazyObject(() => ({
  nothing: the_nothing,
  contradiction: the_contradiction,
  disposed: the_disposed
}));

/**
 * Convenience object for debugging and inspection (lazy)
 */
export const debug = lazyObject(() => ({
  inspect_strongest: inspect_strongest,
  inspect_content: inspect_content,
  observe_cell: observe_cell
}));

/**
 * Convenience object for composition and piping (lazy)
 */
export const compose = lazyObject(() => ({
  pipe: ce_pipe,
  link: link,
  bi_pipe: bi_pipe
}));

/**
 * Convenience object for search and AMB (lazy)
 */
export const search = lazyObject(() => ({
  amb: p_amb,
  amb_a: p_amb_a,
  binary_amb: binary_amb,
  configure_log_amb_choose: configure_log_amb_choose,
  configure_log_nogoods: configure_log_nogoods,
  configure_log_process_contradictions: configure_log_process_contradictions
}));

/**
 * Convenience object for system state (lazy)
 */
export const system = lazyObject(() => ({
  // Mode configuration
  reactive_mode,
  constraint_mode,
  run_immediate,
  run_deferred,
  record_propagators,
  stop_recording_propagators,
  
  // Execution
  execute,
  execute_steppable,
  clear_tasks,
  
  // Cleanup
  cleanup,
  get_disposal_queue_size,
  
  // State observation
  cell_snapshot: cell_snapshot,
  propagator_snapshot: propagator_snapshot,
  observe_cells: observe_all_cells_update,
  observe_propagators: observe_all_propagators_update,
  
  // Global disposal
  dispose
}));

// ============================================================================
// FUNCTIONAL INTERFACES
// ============================================================================

/**
 * Functional interface for cell operations (lazy)
 */
export const cell_ops = lazyObject(() => ({
  // Cell creation
  create: construct_cell,
  constant: ce_constant,
  reactive_constant: r_constant,
  temp: make_temp_cell,
  
  // Cell access
  strongest: cell_strongest,
  strongest_base_value: cell_strongest_base_value,
  content: cell_content,
  id: cell_id,
  name: cell_name,
  
  // Cell modification
  add_content: update_cell,
  dispose: internal_cell_dispose,
  
  // Cell update (reactive)
  update: update
}));

/**
 * Functional interface for propagator operations (lazy)
 */
export const prop_ops = lazyObject(() => ({
  // Primitive propagators
  add: p_add,
  subtract: p_subtract,
  multiply: p_multiply,
  divide: p_divide,
  equal: p_equal,
  less_than: p_less_than,
  greater_than: p_greater_than,
  and: p_and,
  or: p_or,
  not: p_not,
  switch: p_switch,
  sync: p_sync,
  map: p_map_a,
  filter: p_filter_a,
  zip: p_zip,
  range: p_range,

  reduce: p_reduce,
  index: p_index,
  
  // Constraint propagators
  constraint_add: c_add,
  constraint_subtract: c_subtract,
  constraint_multiply: c_multiply,
  constraint_divide: c_divide,
  constraint_range: c_range,
  
  // Cell expression propagators
  expr_add: ce_add,
  expr_subtract: ce_subtract,
  expr_multiply: ce_multiply,
  expr_divide: ce_divide,
  expr_equal: ce_equal,
  expr_less_than: ce_less_than,
  expr_greater_than: ce_greater_than,
  expr_and: ce_and,
  expr_or: ce_or,
  expr_not: ce_not,
  expr_switch: ce_switch,
  
  // Compound propagators
  compound_if: com_if,
  compound_celsius_to_fahrenheit: com_celsius_to_fahrenheit,
  compound_meters_feet_inches: com_meters_feet_inches,
  
  // Construction
  create: construct_propagator,
  compound: compound_propagator,
  constraint: constraint_propagator,
  primitive: primitive_propagator,
  function: function_to_primitive_propagator,
  
  
  // Management
  id: propagator_id,
  name: propagator_name,
  dispose: dispose_propagator,
  activate: propagator_activate
}));

/**
 * Functional interface for system operations (lazy)
 */
export const sys_ops = lazyObject(() => ({
  // Mode configuration
  reactive_mode,
  constraint_mode,
  run_immediate,
  run_deferred,
  record_propagators,
  stop_recording_propagators,
  
  // Execution
  execute,
  execute_steppable,
  clear_tasks,
  
  // Cleanup
  cleanup,
  get_disposal_queue_size,
  
  // State observation
  cell_snapshot: cell_snapshot,
  propagator_snapshot: propagator_snapshot,
  observe_cells: observe_all_cells_update,
  observe_propagators: observe_all_propagators_update,
  
  // Global disposal
  dispose
}));

// ============================================================================
// EXPORTS
// ============================================================================

// Core exports
export {
  // Cell exports
    construct_cell as construct_cell,
  ce_constant,
  ce_constant as constant, // Shorthand alias
  ce_constant as reactive_constant, // Reactive constant alias
  internal_cell_dispose as cell_dispose,
  cell_strongest,
  cell_strongest_base_value,
  cell_id,
  cell_name,
  cell_content,
  update_cell as add_cell_content,
  make_temp_cell,
  type Cell,
  is_cell,
  general_contradiction,
  set_handle_contradiction,
  handle_cell_contradiction,
  
  // Propagator exports
    construct_propagator,
  compound_propagator,
  constraint_propagator,
  primitive_propagator,
  function_to_primitive_propagator,

  propagator_id,
  propagator_name,
  dispose_propagator as propagator_dispose,
  propagator_activate,
  
  // Built-in propagators
  p_add,
  p_subtract,
  p_multiply,
  p_divide,
  p_equal,
  p_less_than,
  p_greater_than,
  p_and,
  p_or,
  p_not,
  p_switch,
  p_sync,
  p_map_a,
  p_filter_a,
  p_zip,
  p_range,

  p_reduce,
  p_index,
  c_add,
  c_subtract,
  c_multiply,
  c_divide,
  c_range,
  ce_add,
  ce_subtract,
  ce_multiply,
  ce_divide,
  ce_equal,
  ce_less_than,
  ce_greater_than,
  ce_and,
  ce_or,
  ce_not,
  ce_switch,
  com_if,
  com_celsius_to_fahrenheit,
  com_meters_feet_inches,
  
  // Cell values
  the_nothing,
  the_contradiction,
  the_disposed,
  is_nothing,
  is_contradiction,
  is_disposed,
  is_layered_contradiction,
  get_base_value,
  type CellValue,
  
  // Merge and values
    set_merge,
  generic_merge,
    define_handler,
  strongest_value,
  
  // Scheduler
  Current_Scheduler,
  set_scheduler,
  clear_all_tasks,
  execute_all_tasks_sequential,
  steppable_run_task,
  set_immediate_execute,
  mark_for_disposal as markForDisposal,
  simple_scheduler,
  reactive_scheduler,
  
  // Public state
  set_global_state,
  PublicStateCommand,
  cell_snapshot,
  propagator_snapshot,
  observe_all_cells_update,
  observe_all_propagators_update,
  
  // Generic handler
    match_args,
    all_match,
  register_predicate,
  
  // Disposal
  dispose,
  
  // Reactive interface
  update,
  r_constant,
  
  // Reactive merge
  reactive_merge,
  reactive_fresh_merge,
  trace_earliest_emerged_value,
  trace_latest_emerged_value,
  
  // Debug
  inspect_strongest,
  inspect_content,
  observe_cell,
  
  // Composition
  ce_pipe,
  link,
  bi_pipe,
  
  // Search
  p_amb,
  p_amb_a,
  binary_amb,
  configure_log_amb_choose,
  configure_log_nogoods,
  configure_log_process_contradictions,
  
  // UI
  tell,
  kick_out,
  all_results,
  enum_num_set
};

// Separate type exports for better compatibility
export type { Propagator } from "./Propagator/Propagator";
export type { Cell } from "./Cell/Cell";

// Default export for convenience (lazy)
export default lazyObject(() => ({
  // Shorthand functions
  cell,
  constant: ce_constant, // Re-exported alias
  reactive_constant: ce_constant, // Re-exported alias
  
  dispose_propagator,
  add_content,
  strongest,
  // strongest_base_value,
  content,
  id,
  name,
  
  // Mode configuration
  reactive_mode,
  constraint_mode,
  run_immediate,
  run_deferred,
  record_propagators,
  stop_recording_propagators,
  
  // Convenience objects
  propagator,
  cells,
  predicates,
  values,
  debug,
  compose,
  search,
  system,
  
  // Functional interfaces
  cell_ops,
  prop_ops,
  sys_ops,
  
  // Core functionality
  construct_cell: construct_cell,
  construct_propagator,
  p_add,
  p_multiply,
  c_add,
  c_multiply,
  ce_add,
  ce_multiply,
  the_nothing,
  is_nothing,
  execute,
  update,
  r_constant
}));