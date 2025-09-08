import { 
    create_reactive_patched_cell_with_timestamp,
    rps_write, 
    rps_strategy_extend_memory, 
    rps_strategy_extend_selection,
    rps_strategy_extend_intake,
    rps_strategy_extend_emit,
    rps_strategy_extend_channels,
    rps_buffer,
    rps_strategy,
    rps_effective,
    rps_strongest,
    rps_timestamp,
    rps_is_fresh,
    rps_lineage,
    has_patch_layer,
    has_timestamp_layer
} from "./core/reactivePatch";
import { get_base_value } from "sando-layer/Basic/Layer";

export function reactive_patch_demo() {
    console.log("=== Reactive Patch System Demo ===\n");

    // Create a reactive patched cell with both layers
    const reactivePatchedCell = create_reactive_patched_cell_with_timestamp(
        0, 
        "demo_reactive_cell"
    );

    console.log("1. Initial state:");
    console.log("   Has patch layer:", has_patch_layer(reactivePatchedCell));
    console.log("   Has timestamp layer:", has_timestamp_layer(get_base_value(reactivePatchedCell)));
    console.log("   Buffer:", rps_buffer(reactivePatchedCell));
    console.log("   Strategy:", rps_strategy(reactivePatchedCell));
    console.log("   Effective value:", rps_effective(reactivePatchedCell));
    console.log("   Timestamp:", rps_timestamp(reactivePatchedCell));
    console.log("   Is fresh:", rps_is_fresh(reactivePatchedCell));
    console.log();

    // Extend memory strategy
    rps_strategy_extend_memory(reactivePatchedCell, { kind: 'count', n: 3 });
    console.log("2. After extending memory strategy (keep last 3):");
    console.log("   Strategy:", rps_strategy(reactivePatchedCell));
    console.log();

    // Write some values with reactive timestamping
    rps_write(reactivePatchedCell, 1, { sourceCellId: "sensor1", strength: 0.3, tag: "temp" });
    rps_write(reactivePatchedCell, 2, { sourceCellId: "sensor2", strength: 0.8, tag: "temp" });
    rps_write(reactivePatchedCell, 3, { sourceCellId: "sensor3", strength: 0.5, tag: "humidity" });
    rps_write(reactivePatchedCell, 4, { sourceCellId: "sensor4", strength: 0.9, tag: "temp" });
    rps_write(reactivePatchedCell, 5, { sourceCellId: "sensor5", strength: 0.2, tag: "pressure" });

    console.log("3. After writing 5 values:");
    console.log("   Buffer:", rps_buffer(reactivePatchedCell).map(item => ({
        value: item.value,
        strength: item.strength,
        tag: item.tag
    })));
    console.log("   Effective value (default first):", rps_effective(reactivePatchedCell));
    console.log("   Timestamp:", rps_timestamp(reactivePatchedCell));
    console.log("   Is fresh:", rps_is_fresh(reactivePatchedCell));
    console.log();

    // Extend selection strategy to strongest
    rps_strategy_extend_selection(reactivePatchedCell, { 
        ranks: new Set(['strongest']), 
        reducers: new Set() 
    });

    console.log("4. After extending selection strategy (strongest):");
    console.log("   Strategy:", rps_strategy(reactivePatchedCell));
    console.log("   Effective value (strongest):", rps_effective(reactivePatchedCell));
    console.log("   Using layered strongest procedure:", rps_strongest(reactivePatchedCell));
    console.log();

    // Extend intake strategy
    rps_strategy_extend_intake(reactivePatchedCell, {
        key: 'tag',
        quota: { 'temp': 2, 'humidity': 1, 'pressure': 1 },
        order: 'strength'
    });

    console.log("5. After extending intake strategy (tag quotas):");
    console.log("   Strategy:", rps_strategy(reactivePatchedCell));
    console.log();

    // Extend emit strategy
    rps_strategy_extend_emit(reactivePatchedCell, { mode: 'spread', maxPerTick: 2 });

    console.log("6. After extending emit strategy (spread mode):");
    console.log("   Strategy:", rps_strategy(reactivePatchedCell));
    console.log();

    // Extend channels strategy
    rps_strategy_extend_channels(reactivePatchedCell, 'per-tag');

    console.log("7. After extending channels strategy (per-tag):");
    console.log("   Strategy:", rps_strategy(reactivePatchedCell));
    console.log();

    // Show lineage
    console.log("8. Lineage tracking:");
    const lineage = rps_lineage(reactivePatchedCell);
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
    console.log("9. Hot-swapping selection strategy:");
    rps_strategy_extend_selection(reactivePatchedCell, { 
        ranks: new Set(['last']), 
        reducers: new Set() 
    });
    console.log("   New effective value (last):", rps_effective(reactivePatchedCell));
    console.log();

    // Show final state
    console.log("10. Final state:");
    console.log("   Complete strategy:", JSON.stringify(rps_strategy(reactivePatchedCell), null, 2));
    console.log("   Buffer length:", rps_buffer(reactivePatchedCell).length);
    console.log("   Lineage entries:", rps_lineage(reactivePatchedCell).entries.length);
    console.log("   Timestamp:", rps_timestamp(reactivePatchedCell));
    console.log("   Is fresh:", rps_is_fresh(reactivePatchedCell));
    console.log();

    // Demonstrate reactive layer integration
    console.log("11. Reactive Layer Integration:");
    console.log("   Both layers present:", has_patch_layer(reactivePatchedCell) && has_timestamp_layer(get_base_value(reactivePatchedCell)));
    console.log("   Patch layer provides:", "Dynamic behavior, memory management, selection strategies");
    console.log("   Reactive layer provides:", "Timestamping, freshness tracking, reactive updates");
    console.log("   Combined benefits:", "Reactive cells with dynamic, hot-swappable behavior");
    console.log();

    console.log("=== Demo Complete ===");
}

// Run the demo if this file is executed directly
if (require.main === module) {
    reactive_patch_demo();
} 