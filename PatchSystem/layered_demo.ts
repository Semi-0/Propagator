import { 
    create_patched_cell, 
    ps_write, 
    ps_strategy_extend_memory, 
    ps_strategy_extend_selection,
    ps_strategy_extend_intake,
    ps_strategy_extend_emit,
    ps_strategy_extend_channels,
    ps_buffer,
    ps_strategy,
    ps_effective,
    ps_strongest,
    ps_lineage
} from "./core/layeredPatch";
import { r_constant } from "../AdvanceReactivity/interface";

export function layered_patch_demo() {
    console.log("=== Layered Patch System Demo ===\n");

    // Create a base cell and wrap it with patch layer
    const baseCell = r_constant(0, "demo_base_cell");
    const patchedCell = create_patched_cell(baseCell);

    console.log("1. Initial state:");
    console.log("   Buffer:", ps_buffer(patchedCell));
    console.log("   Strategy:", ps_strategy(patchedCell));
    console.log("   Effective value:", ps_effective(patchedCell));
    console.log();

    // Extend memory strategy
    ps_strategy_extend_memory(patchedCell, { kind: 'count', n: 3 });
    console.log("2. After extending memory strategy (keep last 3):");
    console.log("   Strategy:", ps_strategy(patchedCell));
    console.log();

    // Write some values
    ps_write(patchedCell, 1, { sourceCellId: "sensor1", strength: 0.3, tag: "temp" });
    ps_write(patchedCell, 2, { sourceCellId: "sensor2", strength: 0.8, tag: "temp" });
    ps_write(patchedCell, 3, { sourceCellId: "sensor3", strength: 0.5, tag: "humidity" });
    ps_write(patchedCell, 4, { sourceCellId: "sensor4", strength: 0.9, tag: "temp" });
    ps_write(patchedCell, 5, { sourceCellId: "sensor5", strength: 0.2, tag: "pressure" });

    console.log("3. After writing 5 values:");
    console.log("   Buffer:", ps_buffer(patchedCell).map(item => ({
        value: item.value,
        strength: item.strength,
        tag: item.tag
    })));
    console.log("   Effective value (default first):", ps_effective(patchedCell));
    console.log();

    // Extend selection strategy to strongest
    ps_strategy_extend_selection(patchedCell, { 
        ranks: new Set(['strongest']), 
        reducers: new Set() 
    });

    console.log("4. After extending selection strategy (strongest):");
    console.log("   Strategy:", ps_strategy(patchedCell));
    console.log("   Effective value (strongest):", ps_effective(patchedCell));
    console.log("   Using layered strongest procedure:", ps_strongest(patchedCell));
    console.log();

    // Extend intake strategy
    ps_strategy_extend_intake(patchedCell, {
        key: 'tag',
        quota: { 'temp': 2, 'humidity': 1, 'pressure': 1 },
        order: 'strength'
    });

    console.log("5. After extending intake strategy (tag quotas):");
    console.log("   Strategy:", ps_strategy(patchedCell));
    console.log();

    // Extend emit strategy
    ps_strategy_extend_emit(patchedCell, { mode: 'spread', maxPerTick: 2 });

    console.log("6. After extending emit strategy (spread mode):");
    console.log("   Strategy:", ps_strategy(patchedCell));
    console.log();

    // Extend channels strategy
    ps_strategy_extend_channels(patchedCell, 'per-tag');

    console.log("7. After extending channels strategy (per-tag):");
    console.log("   Strategy:", ps_strategy(patchedCell));
    console.log();

    // Show lineage
    console.log("8. Lineage tracking:");
    const lineage = ps_lineage(patchedCell);
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
    ps_strategy_extend_selection(patchedCell, { 
        ranks: new Set(['last']), 
        reducers: new Set() 
    });
    console.log("   New effective value (last):", ps_effective(patchedCell));
    console.log();

    // Show final state
    console.log("10. Final state:");
    console.log("   Complete strategy:", JSON.stringify(ps_strategy(patchedCell), null, 2));
    console.log("   Buffer length:", ps_buffer(patchedCell).length);
    console.log("   Lineage entries:", ps_lineage(patchedCell).entries.length);
    console.log();

    console.log("=== Demo Complete ===");
}

// Run the demo if this file is executed directly
if (require.main === module) {
    layered_patch_demo();
} 