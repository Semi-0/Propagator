import {
    create_patched_cell,
    ce_write,
    ce_strategy_extend_memory,
    ce_strategy_extend_selection,
    get_buffer_value,
    get_strategy_value,
    get_effective_value
} from "./adapter/simpleAdapter";

// Simple working demo
export function working_demo() {
    console.log("=== Patch System Working Demo ===\n");

    // Create a patched cell
    const cell = create_patched_cell("demo_cell");

    console.log("1. Initial state:");
    console.log("Strategy:", get_strategy_value(cell));
    console.log("Buffer:", get_buffer_value(cell));
    console.log();

    // Set memory strategy to keep last 3 items
    ce_strategy_extend_memory(cell, { kind: 'count', n: 3 });
    console.log("2. After setting memory strategy (keep last 3):");
    console.log("Strategy:", get_strategy_value(cell));
    console.log();

    // Set selection strategy to use strongest
    ce_strategy_extend_selection(cell, {
        ranks: new Set(['strongest']),
        reducers: new Set()
    });
    console.log("3. After setting selection strategy (strongest):");
    console.log("Strategy:", get_strategy_value(cell));
    console.log();

    // Write values with different strengths
    console.log("4. Writing values with different strengths:");
    ce_write(cell, 1, { sourceCellId: "source1", strength: 0.3 });
    ce_write(cell, 2, { sourceCellId: "source2", strength: 0.8 });
    ce_write(cell, 3, { sourceCellId: "source3", strength: 0.1 });
    ce_write(cell, 4, { sourceCellId: "source4", strength: 0.5 });

    console.log("Buffer after writing:", get_buffer_value(cell));
    console.log("Effective value:", get_effective_value(cell));
    console.log();

    // Change to sum reducer
    console.log("5. Changing to sum reducer:");
    ce_strategy_extend_selection(cell, {
        ranks: new Set(['reduce']),
        reducers: new Set(['sum'])
    });

    console.log("Strategy after change:", get_strategy_value(cell));
    console.log("Effective value (sum):", get_effective_value(cell));
    console.log();

    // Change to average reducer
    console.log("6. Changing to average reducer:");
    ce_strategy_extend_selection(cell, {
        ranks: new Set(['reduce']),
        reducers: new Set(['avg'])
    });

    console.log("Effective value (average):", get_effective_value(cell));
    console.log();

    // Change to max reducer
    console.log("7. Changing to max reducer:");
    ce_strategy_extend_selection(cell, {
        ranks: new Set(['reduce']),
        reducers: new Set(['max'])
    });

    console.log("Effective value (max):", get_effective_value(cell));
    console.log();

    // Show final state
    console.log("8. Final state:");
    console.log("Buffer:", get_buffer_value(cell));
    console.log("Strategy:", get_strategy_value(cell));
    console.log("Effective value:", get_effective_value(cell));
}

// Run the demo
if (require.main === module) {
    working_demo();
} 