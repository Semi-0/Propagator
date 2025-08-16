# Propogator Index API

This document provides comprehensive documentation for the Propogator library's main index file, which provides easy access to all core functionality.

## Quick Start

```typescript
import { 
  cell, 
  propagator, 
  reactive_mode, 
  constraint_mode, 
  run_immediate,
  record_propagators 
} from './index';

// Set up reactive mode with immediate execution
reactive_mode();
run_immediate();

// Create cells and propagators
const a = cell("a");
const b = cell("b");
const result = cell("result");

// Create a propagator
propagator.add(a, b, result);

// Add content to trigger propagation
a.addContent(5);
b.addContent(3);
// result will automatically contain 8
```

## Mode Configuration

### Reactive Mode
Configure the system for reactive programming with timestamp-based updates:

```typescript
import { reactive_mode, reactive_constant } from './index';

reactive_mode();
// Sets up reactive scheduler, reactive merge, clears tasks, enables immediate execution

// Use reactive constants in reactive mode
const constant1 = reactive_constant(5);
const constant2 = reactive_constant(10);
```

### Constraint Mode
Configure the system for constraint propagation:

```typescript
import { constraint_mode } from './index';

constraint_mode();
// Sets up simple scheduler, generic merge, clears tasks, enables immediate execution
```

### Execution Control

```typescript
import { run_immediate, run_deferred, execute, execute_steppable } from './index';

// Enable immediate execution (default)
run_immediate();

// Disable immediate execution (manual control)
run_deferred();

// Execute all pending tasks sequentially
await execute();

// Execute using steppable run
await execute_steppable();
```

### Recording and Debugging

```typescript
import { record_propagators, stop_recording_propagators } from './index';

// Enable propagator recording for debugging
record_propagators();

// Disable recording
stop_recording_propagators();
```

## Cell Operations

### Creating Cells

```typescript
import { cell, constant, reactive_constant, cells } from './index';

// Create an empty cell
const a = cell("a");

// Create a cell with initial value
const b = constant(42, "b");

// Create a reactive constant (use in reactive mode)
const c = reactive_constant(100);

// Create a temporary cell
const temp = cells.temp();
```

### Cell Content Management

```typescript
import { add_content, strongest, strongest_base_value, content, id, name } from './index';

const a = cell("a");

// Add content to cell
a.addContent(5);
add_content(a, 10); // Functional interface

// Get cell values
const strongest_value = strongest(a);
const base_value = strongest_base_value(a);
const cell_content = content(a);
const cell_id = id(a);
const cell_name = name(a);
```

### Cell Disposal

```typescript
import { dispose_cell, cells } from './index';

const a = cell("a");
dispose_cell(a); // or cells.dispose(a)
```

## Propagator Operations

### Primitive Propagators

```typescript
import { propagator } from './index';

const a = cell("a");
const b = cell("b");
const result = cell("result");

// Arithmetic
propagator.add(a, b, result);
propagator.subtract(a, b, result);
propagator.multiply(a, b, result);
propagator.divide(a, b, result);

// Comparison
propagator.equal(a, b, result);
propagator.less_than(a, b, result);
propagator.greater_than(a, b, result);

// Logical
propagator.and(a, b, result);
propagator.or(a, b, result);
propagator.not(a, result);

// Control
propagator.switch(condition, value, output);
propagator.sync(input, output);

// Functional
propagator.map(input, output, (x) => x * 2);
propagator.filter(input, output, (x) => x > 0);
propagator.zip([a, b], output, (x, y) => [x, y]);
propagator.range(input, min, max, output);
propagator.composite([a, b], output);
propagator.reduce(input, output, (acc, x) => acc + x, 0);
propagator.index(1)(input, output);
```

### Constraint Propagators

```typescript
import { propagator } from './index';

const a = cell("a");
const b = cell("b");
const c = cell("c");

// Constraint propagators maintain relationships
propagator.constraint.add(a, b, c); // c = a + b
propagator.constraint.subtract(a, b, c); // c = a - b
propagator.constraint.multiply(a, b, c); // c = a * b
propagator.constraint.divide(a, b, c); // c = a / b
propagator.constraint.range(a, min, max); // Constrain a to range
```

### Cell Expression Propagators

```typescript
import { propagator } from './index';

const a = cell("a");
const b = cell("b");

// Cell expressions return new cells
const sum = propagator.expr.add(a, b);
const product = propagator.expr.multiply(a, b);
const is_equal = propagator.expr.equal(a, b);
const is_less = propagator.expr.less_than(a, b);
const is_greater = propagator.expr.greater_than(a, b);
const logical_and = propagator.expr.and(a, b);
const logical_or = propagator.expr.or(a, b);
const logical_not = propagator.expr.not(a);
const switched = propagator.expr.switch(condition, value);
```

### Compound Propagators

```typescript
import { propagator } from './index';

const condition = cell("condition");
const then_value = cell("then_value");
const else_value = cell("else_value");
const output = cell("output");

// Compound if propagator
propagator.compound.if(condition, then_value, else_value, output);

// Temperature conversion
const celsius = cell("celsius");
const fahrenheit = cell("fahrenheit");
propagator.compound.celsius_to_fahrenheit(celsius, fahrenheit);

// Unit conversion
const meters = cell("meters");
const feet = cell("feet");
const inches = cell("inches");
propagator.compound.meters_feet_inches(meters, feet, inches);
```

### Custom Propagators

```typescript
import { propagator } from './index';

// Create custom primitive propagator
const custom_prop = propagator.primitive((a, b) => a + b, "custom")(a, b, result);

// Create compound propagator
const compound_prop = propagator.compound_propagator([a, b], [result], () => {
  // Custom logic here
}, "compound");

// Create constraint propagator
const constraint_prop = propagator.constraint_propagator([a, b, c], () => {
  // Constraint logic here
}, "constraint");

// Create function-based propagator
const func_prop = propagator.function("func", (a, b) => a + b)(a, b, result);

// Create error-logged propagator
const error_prop = propagator.error_logged((a, b) => a + b, "error")(a, b, result);
```

## Debugging and Inspection

### Inspect Operators

```typescript
import { debug } from './index';

const a = cell("a");
const b = cell("b");
const result = cell("result");

// Inspect strongest values when cells update
debug.inspect_strongest(a, b, result);

// Inspect content when cells update
debug.inspect_content(a, b, result);

// Custom observation
const observer = debug.observe_cell((str) => console.log(str));
observer(a, b, result);
```

### Composition and Piping

```typescript
import { compose } from './index';

const input = cell("input");

// Pipe operations
const result = compose.pipe(
  input,
  propagator.map((x) => x * 2),
  propagator.filter((x) => x > 10),
  propagator.map((x) => x + 5)
);

// Link cells
compose.link(input, result);

// Bi-directional pipe
compose.bi_pipe(input, result);
```

### Search and AMB

```typescript
import { search } from './index';

const x = cell("x");
const y = cell("y");

// Configure logging
search.configure_log_amb_choose(true);
search.configure_log_nogoods(true);
search.configure_log_process_contradictions(true);

// AMB operators
search.amb(x, possibilities);
search.amb_a(x, possibilities);
search.binary_amb(x);
```

## Functional Interfaces

### Cell Operations

```typescript
import { cell_ops } from './index';

// Cell creation
const a = cell_ops.create("a");
const b = cell_ops.constant(42, "b");
const c = cell_ops.reactive_constant(100);
const temp = cell_ops.temp();

// Cell access
const value = cell_ops.strongest(a);
const base_value = cell_ops.strongest_base_value(a);
const content = cell_ops.content(a);
const cell_id = cell_ops.id(a);
const cell_name = cell_ops.name(a);

// Cell modification
cell_ops.add_content(a, 5);
cell_ops.dispose(a);

// Cell update (reactive)
cell_ops.update(a, 10);
```

### Propagator Operations

```typescript
import { prop_ops } from './index';

// Primitive propagators
prop_ops.add(a, b, result);
prop_ops.multiply(a, b, result);
prop_ops.map(input, output, (x) => x * 2);

// Constraint propagators
prop_ops.constraint_add(a, b, c);
prop_ops.constraint_multiply(a, b, c);
prop_ops.constraint_range(a, min, max);

// Cell expression propagators
const sum = prop_ops.expr_add(a, b);
const product = prop_ops.expr_multiply(a, b);
const is_equal = prop_ops.expr_equal(a, b);

// Compound propagators
prop_ops.compound_if(condition, then_value, else_value, output);
prop_ops.compound_celsius_to_fahrenheit(celsius, fahrenheit);

// Management
const prop_id = prop_ops.id(propagator);
const prop_name = prop_ops.name(propagator);
prop_ops.dispose(propagator);
prop_ops.activate(propagator);
```

### System Operations

```typescript
import { sys_ops } from './index';

// Mode configuration
sys_ops.reactive_mode();
sys_ops.constraint_mode();
sys_ops.run_immediate();
sys_ops.run_deferred();

// Execution
await sys_ops.execute();
await sys_ops.execute_steppable();
sys_ops.clear_tasks();

// Cleanup
sys_ops.cleanup();
const queue_size = sys_ops.get_disposal_queue_size();

// State observation
const cells = sys_ops.cell_snapshot();
const propagators = sys_ops.propagator_snapshot();
sys_ops.observe_cells((cell) => console.log('Cell updated:', cell));
sys_ops.observe_propagators((propagator) => console.log('Propagator updated:', propagator));

// Global disposal
sys_ops.dispose(a);
```

## Value Management

### Cell Values

```typescript
import { values, predicates } from './index';

// Special values
const nothing = values.nothing; // "&&the_nothing&&"
const contradiction = values.contradiction; // "&&the_contradiction&&"
const disposed = values.disposed; // "&&the_disposed&&"

// Predicates
const is_nothing = predicates.nothing(value);
const is_contradiction = predicates.contradiction(value);
const is_disposed = predicates.disposed(value);
const is_layered_contradiction = predicates.layered_contradiction(value);
const base_value = predicates.base_value(value);
```

## System Management

### Task Management

```typescript
import { system } from './index';

// Clear all pending tasks
system.clear_tasks();

// Get disposal queue size
const queue_size = system.get_disposal_queue_size();

// Clean up disposed items
system.cleanup();
```

### State Observation

```typescript
import { system } from './index';

// Get snapshots
const cells = system.cell_snapshot();
const propagators = system.propagator_snapshot();

// Observe changes
system.observe_cells((cell) => {
  console.log('Cell updated:', cell);
});

system.observe_propagators((propagator) => {
  console.log('Propagator updated:', propagator);
});
```

### Global Disposal

```typescript
import { system } from './index';

const a = cell("a");
const b = cell("b");
const result = cell("result");

// Dispose entire subtree
system.dispose(a); // Will dispose a, b, and result
```

## Advanced Usage

### Reactive Programming

```typescript
import { reactive_mode, run_immediate, update, reactive_constant } from './index';

reactive_mode();
run_immediate();

const a = cell("a");
const b = cell("b");
const result = propagator.expr.add(a, b);

// Use reactive update
update(a, 5);
update(b, 3);
// result automatically becomes 8

// Use reactive constants
const constant1 = reactive_constant(10);
const constant2 = reactive_constant(20);
const sum = propagator.expr.add(constant1, constant2);
```

### Constraint Solving

```typescript
import { constraint_mode, run_immediate } from './index';

constraint_mode();
run_immediate();

const x = cell("x");
const y = cell("y");
const z = cell("z");

// Set up constraints
propagator.constraint.add(x, y, z); // z = x + y
propagator.constraint.multiply(x, 2, y); // y = 2x

// Solve for x when z = 10
z.addContent(10);
// x will automatically become 5, y will become 10
```

### Complex Networks

```typescript
import { cell, propagator, reactive_mode, run_immediate, debug } from './index';

reactive_mode();
run_immediate();

// Create a complex network
const input = cell("input");
const doubled = propagator.expr.multiply(input, 2);
const filtered = propagator.expr.filter(doubled, (x) => x > 10);
const result = propagator.expr.add(filtered, 5);

// Add debugging
debug.inspect_strongest(input, doubled, filtered, result);

// Test the network
input.addContent(8); // doubled = 16, filtered = 16, result = 21
input.addContent(3); // doubled = 6, filtered = nothing, result = 5
```

## API Reference

### Shorthand Functions

- `cell(name: string)`: Create a new cell
- `constant(value: any, name: string)`: Create a cell with initial value
- `reactive_constant(value: any, name?: string)`: Create a reactive constant cell
- `dispose_cell(cell: Cell)`: Dispose a cell
- `dispose_propagator(propagator: Propagator)`: Dispose a propagator
- `add_content(cell: Cell, value: any)`: Add content to a cell
- `strongest(cell: Cell)`: Get strongest value
- `strongest_base_value(cell: Cell)`: Get strongest base value
- `content(cell: Cell)`: Get cell content
- `id(cell: Cell)`: Get cell ID
- `name(cell: Cell)`: Get cell name

### Mode Functions

- `reactive_mode()`: Enable reactive mode
- `constraint_mode()`: Enable constraint mode
- `run_immediate()`: Enable immediate execution
- `run_deferred()`: Disable immediate execution
- `record_propagators()`: Enable propagator recording
- `stop_recording_propagators()`: Disable propagator recording

### Execution Functions

- `execute()`: Execute all pending tasks sequentially
- `execute_steppable()`: Execute using steppable run
- `clear_tasks()`: Clear all pending tasks
- `get_disposal_queue_size()`: Get disposal queue size
- `cleanup()`: Clean up disposed items

### Convenience Objects

- `propagator`: All propagator operations
- `cells`: All cell operations
- `predicates`: All predicate functions
- `values`: All special values
- `debug`: All debugging functions
- `compose`: All composition functions
- `search`: All search and AMB functions
- `system`: All system management functions

### Functional Interfaces

- `cell_ops`: Functional cell operations
- `prop_ops`: Functional propagator operations
- `sys_ops`: Functional system operations

## Examples

### Temperature Converter

```typescript
import { cell, propagator, reactive_mode, run_immediate } from './index';

reactive_mode();
run_immediate();

const celsius = cell("celsius");
const fahrenheit = cell("fahrenheit");

// C to F: F = C * 9/5 + 32
const c_to_f = propagator.expr.add(
  propagator.expr.multiply(celsius, 9/5),
  32
);
propagator.sync(c_to_f, fahrenheit);

// F to C: C = (F - 32) * 5/9
const f_to_c = propagator.expr.multiply(
  propagator.expr.subtract(fahrenheit, 32),
  5/9
);
propagator.sync(f_to_c, celsius);

// Test
celsius.addContent(25); // fahrenheit becomes 77
fahrenheit.addContent(68); // celsius becomes 20
```

### Calculator

```typescript
import { cell, propagator, constraint_mode, run_immediate } from './index';

constraint_mode();
run_immediate();

const a = cell("a");
const b = cell("b");
const sum = cell("sum");
const product = cell("product");
const average = cell("average");

// Set up constraints
propagator.constraint.add(a, b, sum);
propagator.constraint.multiply(a, b, product);
propagator.constraint.divide(sum, 2, average);

// Solve for different scenarios
a.addContent(10);
b.addContent(5);
// sum = 15, product = 50, average = 7.5

// Now solve for a when sum = 20
sum.addContent(20);
// a = 15, b = 5, product = 75, average = 10
```

### Debugging Example

```typescript
import { cell, propagator, reactive_mode, run_immediate, debug } from './index';

reactive_mode();
run_immediate();

const a = cell("a");
const b = cell("b");
const result = propagator.expr.add(a, b);

// Add debugging
debug.inspect_strongest(a, b, result);

// Test with updates
a.addContent(5);
b.addContent(3);
// Will log updates to console
```

This comprehensive API provides easy access to all Propogator functionality with intuitive shorthand functions, organized convenience objects, and functional interfaces for both reactive and constraint programming modes. 