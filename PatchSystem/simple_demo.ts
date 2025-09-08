import {
    create_patched_cell,
    ce_write,
    ce_strategy_extend_selection,
    get_buffer_value,
    get_strategy_value,
    get_effective_value
} from "./adapter/simpleAdapter";

// Simple demo to test the patch system
export function simple_demo() {
    console.log("=== Simple Patch System Demo ===\n");

    // Create a fresh cell
    const cell = create_patched_cell("demo_cell");

    console.log("1. Initial state:");
    console.log("Strategy:", get_strategy_value(cell));
    console.log("Buffer:", get_buffer_value(cell));
    console.log();

    // Set selection strategy to use strongest
    console.log("2. Setting selection strategy to strongest:");
    ce_strategy_extend_selection(cell, {
        ranks: new Set(['strongest']),
        reducers: new Set()
    });
    console.log("Strategy after setting selection:", get_strategy_value(cell));
    console.log();

    // Write some values with different strengths
    console.log("3. Writing values with different strengths:");
    ce_write(cell, 1, { sourceCellId: "source1", strength: 0.3 });
    ce_write(cell, 2, { sourceCellId: "source2", strength: 0.8 });
    ce_write(cell, 3, { sourceCellId: "source3", strength: 0.1 });

    console.log("Buffer after writing:", get_buffer_value(cell));
    console.log("Effective value:", get_effective_value(cell));
    console.log();

    // Test sum reducer
    console.log("4. Testing sum reducer:");
    const sumCell = create_patched_cell("sum_cell");
    ce_strategy_extend_selection(sumCell, {
        ranks: new Set(['reduce']),
        reducers: new Set(['sum'])
    });

    ce_write(sumCell, 1, { sourceCellId: "source1" });
    ce_write(sumCell, 2, { sourceCellId: "source2" });
    ce_write(sumCell, 3, { sourceCellId: "source3" });

    console.log("Sum cell buffer:", get_buffer_value(sumCell));
    console.log("Sum cell effective value:", get_effective_value(sumCell));
    console.log();

    // Test memory constraint
    console.log("5. Testing memory constraint:");
    const memoryCell = create_patched_cell("memory_cell");
    ce_strategy_extend_selection(memoryCell, {
        ranks: new Set(['reduce']),
        reducers: new Set(['sum'])
    });

    // Write 5 values but memory should limit to 3
    for (let i = 1; i <= 5; i++) {
        ce_write(memoryCell, i, { sourceCellId: `source${i}` });
    }

    console.log("Memory cell buffer length:", get_buffer_value(memoryCell).length);
    console.log("Memory cell effective value:", get_effective_value(memoryCell));
}

// Run the demo
if (require.main === module) {
    simple_demo();
} 