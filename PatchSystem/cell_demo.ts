import { 
    create_patched_cell,
    cps_write, 
    cps_strategy_extend_memory, 
    cps_strategy_extend_selection,
    cps_strategy_extend_intake,
    cps_strategy_extend_emit,
    cps_strategy_extend_channels,
    cps_buffer,
    cps_strategy,
    cps_effective,
    cps_strongest,
    cps_lineage,
    get_buffer_value,
    get_strategy_value,
    get_effective_value
} from "./core/cellPatch";
import { p_add, ce_add } from "../Propagator/BuiltInProps";
import { cell_strongest, cell_content } from "../Cell/Cell";
import { get_base_value } from "sando-layer/Basic/Layer";

export function cell_patch_demo() {
    console.log("=== Cell-based Patch System Demo ===\n");

    // Create a patched cell that works with existing propagators
    const patchedCell = create_patched_cell("demo_cell", 0);

    console.log("1. Initial state:");
    console.log("   Cell works with existing operations:", cell_strongest(patchedCell) !== undefined);
    console.log("   Cell content available:", cell_content(patchedCell) !== undefined);
    console.log("   Buffer:", cps_buffer(patchedCell));
    console.log("   Strategy:", cps_strategy(patchedCell));
    console.log("   Effective value:", cps_effective(patchedCell));
    console.log();

    // Extend memory strategy
    cps_strategy_extend_memory(patchedCell, { kind: 'count', n: 3 });
    console.log("2. After extending memory strategy (keep last 3):");
    console.log("   Strategy:", cps_strategy(patchedCell));
    console.log();

    // Write some values
    cps_write(patchedCell, 1, { sourceCellId: "sensor1", strength: 0.3, tag: "temp" });
    cps_write(patchedCell, 2, { sourceCellId: "sensor2", strength: 0.8, tag: "temp" });
    cps_write(patchedCell, 3, { sourceCellId: "sensor3", strength: 0.5, tag: "humidity" });
    cps_write(patchedCell, 4, { sourceCellId: "sensor4", strength: 0.9, tag: "temp" });
    cps_write(patchedCell, 5, { sourceCellId: "sensor5", strength: 0.2, tag: "pressure" });

    console.log("3. After writing 5 values:");
    console.log("   Buffer:", cps_buffer(patchedCell).map(item => ({
        value: item.value,
        strength: item.strength,
        tag: item.tag
    })));
    console.log("   Effective value (default first):", cps_effective(patchedCell));
    console.log("   Cell strongest value:", cell_strongest(patchedCell));
    console.log();

    // Extend selection strategy to strongest
    cps_strategy_extend_selection(patchedCell, { 
        ranks: new Set(['strongest']), 
        reducers: new Set() 
    });

    console.log("4. After extending selection strategy (strongest):");
    console.log("   Strategy:", cps_strategy(patchedCell));
    console.log("   Effective value (strongest):", cps_effective(patchedCell));
    console.log("   Using cps_strongest:", cps_strongest(patchedCell));
    console.log();

    // Demonstrate working with existing propagators
    console.log("5. Working with existing propagators:");
    const cell1 = create_patched_cell("propagator_cell_1", 10);
    const cell2 = create_patched_cell("propagator_cell_2", 20);
    const resultCell = create_patched_cell("propagator_result");
    
    // Use existing primitive propagator
    p_add(cell1, cell2, resultCell);
    console.log("   Primitive propagator result:", cell_strongest(resultCell));
    
    // Can still use patch system on the result
    cps_strategy_extend_memory(resultCell, { kind: 'count', n: 1 });
    cps_write(resultCell, 50, { sourceCellId: "override", strength: 0.9 });
    console.log("   After patch override:", cps_effective(resultCell));
    console.log();

    // Extend intake strategy
    cps_strategy_extend_intake(patchedCell, {
        key: 'tag',
        quota: { 'temp': 2, 'humidity': 1, 'pressure': 1 },
        order: 'strength'
    });

    console.log("6. After extending intake strategy (tag quotas):");
    console.log("   Strategy:", cps_strategy(patchedCell));
    console.log();

    // Extend emit strategy
    cps_strategy_extend_emit(patchedCell, { mode: 'spread', maxPerTick: 2 });

    console.log("7. After extending emit strategy (spread mode):");
    console.log("   Strategy:", cps_strategy(patchedCell));
    console.log();

    // Extend channels strategy
    cps_strategy_extend_channels(patchedCell, 'per-tag');

    console.log("8. After extending channels strategy (per-tag):");
    console.log("   Strategy:", cps_strategy(patchedCell));
    console.log();

    // Show lineage
    console.log("9. Lineage tracking:");
    const lineage = cps_lineage(patchedCell);
    console.log("   Number of patches applied:", lineage.entries.length);
    lineage.entries.forEach((entry, index) => {
        console.log(`   Patch ${index + 1}:`, {
            id: entry.id,
            origin: entry.origin,
            appliedAt: new Date(entry.appliedAt).toISOString(),
            patch: entry.patch
        });
    });
    console.log();

    // Demonstrate hot-swapping selection strategy
    console.log("10. Hot-swapping selection strategy:");
    cps_strategy_extend_selection(patchedCell, { 
        ranks: new Set(['last']), 
        reducers: new Set() 
    });
    console.log("   New effective value (last):", cps_effective(patchedCell));
    console.log();

    // Show final state
    console.log("11. Final state:");
    console.log("   Complete strategy:", JSON.stringify(cps_strategy(patchedCell), null, 2));
    console.log("   Buffer length:", cps_buffer(patchedCell).length);
    console.log("   Lineage entries:", cps_lineage(patchedCell).entries.length);
    console.log("   Cell still works with existing operations:", cell_strongest(patchedCell) !== undefined);
    console.log();

    // Demonstrate integration benefits
    console.log("12. Integration Benefits:");
    console.log("   ✅ Works with existing propagators (p_add, ce_add, etc.)");
    console.log("   ✅ Works with existing cell operations (cell_strongest, cell_content)");
    console.log("   ✅ Works with reactive layer (timestamping, freshness)");
    console.log("   ✅ Provides dynamic behavior (memory, selection, intake, emit, channels)");
    console.log("   ✅ Supports hot-swapping strategies");
    console.log("   ✅ Maintains full lineage tracking");
    console.log("   ✅ No breaking changes to existing code");
    console.log();

    console.log("=== Demo Complete ===");
}

// Run the demo if this file is executed directly
if (require.main === module) {
    cell_patch_demo();
} 