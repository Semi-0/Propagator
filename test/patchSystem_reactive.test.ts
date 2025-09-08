import { 
    create_reactive_patched_cell,
    create_reactive_patched_cell_with_timestamp,
    rps_write, 
    rps_strategy_extend_memory, 
    rps_strategy_extend_selection,
    rps_buffer,
    rps_strategy,
    rps_effective,
    rps_strongest,
    rps_timestamp,
    rps_is_fresh,
    has_patch_layer,
    has_timestamp_layer
} from "../PatchSystem/core/reactivePatch";
import { r_constant } from "../AdvanceReactivity/interface";
import { get_base_value } from "sando-layer/Basic/Layer";

describe("Patch System - Reactive Implementation", () => {
    it("should create a reactive patched cell with both layers", () => {
        const baseCell = r_constant(0, "test_cell");
        const reactivePatchedCell = create_reactive_patched_cell(baseCell);
        
        // Should have both patch layer and timestamp layer
        expect(has_patch_layer(reactivePatchedCell)).toBe(true);
        expect(has_timestamp_layer(get_base_value(reactivePatchedCell))).toBe(true);
        
        expect(rps_buffer(reactivePatchedCell)).toHaveLength(0);
        expect(rps_strategy(reactivePatchedCell)).toEqual({});
    });

    it("should create a reactive patched cell with custom timestamp", () => {
        const reactivePatchedCell = create_reactive_patched_cell_with_timestamp(
            42, 
            "custom_cell_id"
        );
        
        // Should have both layers
        expect(has_patch_layer(reactivePatchedCell)).toBe(true);
        expect(has_timestamp_layer(get_base_value(reactivePatchedCell))).toBe(true);
        
        // Should have timestamp information
        const timestamp = rps_timestamp(reactivePatchedCell);
        expect(timestamp).toBeDefined();
        expect(rps_is_fresh(reactivePatchedCell)).toBe(true);
    });

    it("should write values with reactive timestamping", () => {
        const reactivePatchedCell = create_reactive_patched_cell_with_timestamp(
            0, 
            "write_test_cell"
        );
        
        rps_write(reactivePatchedCell, 1, { sourceCellId: "source1", strength: 0.5 });
        rps_write(reactivePatchedCell, 2, { sourceCellId: "source2", strength: 0.8 });
        
        const buffer = rps_buffer(reactivePatchedCell);
        expect(buffer).toHaveLength(2);
        expect(buffer[0].value).toBe(1);
        expect(buffer[1].value).toBe(2);
        expect(buffer[1].strength).toBe(0.8);
        
        // Should have timestamp information
        const timestamp = rps_timestamp(reactivePatchedCell);
        expect(timestamp).toBeDefined();
    });

    it("should apply memory constraints with reactive layer", () => {
        const reactivePatchedCell = create_reactive_patched_cell_with_timestamp(
            0, 
            "memory_test_cell"
        );
        
        rps_strategy_extend_memory(reactivePatchedCell, { kind: 'count', n: 2 });
        
        rps_write(reactivePatchedCell, 1, { sourceCellId: "source1" });
        rps_write(reactivePatchedCell, 2, { sourceCellId: "source2" });
        rps_write(reactivePatchedCell, 3, { sourceCellId: "source3" });
        rps_write(reactivePatchedCell, 4, { sourceCellId: "source4" });
        
        const buffer = rps_buffer(reactivePatchedCell);
        expect(buffer).toHaveLength(2);
        expect(buffer[0].value).toBe(3);
        expect(buffer[1].value).toBe(4);
    });

    it("should compute effective value with strongest selection and reactive layer", () => {
        const reactivePatchedCell = create_reactive_patched_cell_with_timestamp(
            0, 
            "strongest_test_cell"
        );
        
        rps_strategy_extend_selection(reactivePatchedCell, { 
            ranks: new Set(['strongest']), 
            reducers: new Set() 
        });
        
        rps_write(reactivePatchedCell, 1, { sourceCellId: "source1", strength: 0.3 });
        rps_write(reactivePatchedCell, 2, { sourceCellId: "source2", strength: 0.8 });
        rps_write(reactivePatchedCell, 3, { sourceCellId: "source3", strength: 0.5 });
        
        const effectiveValue = rps_effective(reactivePatchedCell);
        expect(effectiveValue).toBe(2); // Should be the strongest (strength 0.8)
        
        // Should still have reactive properties
        expect(rps_is_fresh(reactivePatchedCell)).toBe(true);
    });

    it("should work with layered strongest procedure and reactive layer", () => {
        const reactivePatchedCell = create_reactive_patched_cell_with_timestamp(
            0, 
            "layered_strongest_test_cell"
        );
        
        rps_strategy_extend_selection(reactivePatchedCell, { 
            ranks: new Set(['strongest']), 
            reducers: new Set() 
        });
        
        rps_write(reactivePatchedCell, 1, { sourceCellId: "source1", strength: 0.3 });
        rps_write(reactivePatchedCell, 2, { sourceCellId: "source2", strength: 0.8 });
        
        // Use the layered strongest procedure
        const strongestValue = rps_strongest(reactivePatchedCell);
        expect(strongestValue).toBe(2); // Should be the strongest (strength 0.8)
    });

    it("should track lineage with reactive layer", () => {
        const reactivePatchedCell = create_reactive_patched_cell_with_timestamp(
            0, 
            "lineage_test_cell"
        );
        
        rps_strategy_extend_memory(reactivePatchedCell, { kind: 'count', n: 3 });
        rps_strategy_extend_selection(reactivePatchedCell, { 
            ranks: new Set(['first']), 
            reducers: new Set() 
        });
        
        const lineage = rps_lineage(reactivePatchedCell);
        expect(lineage.entries).toHaveLength(2);
        expect(lineage.entries[0].patch).toHaveProperty('memory');
        expect(lineage.entries[1].patch).toHaveProperty('selection');
    });

    it("should handle time-based memory constraints with reactive layer", () => {
        const reactivePatchedCell = create_reactive_patched_cell_with_timestamp(
            0, 
            "time_memory_test_cell"
        );
        
        rps_strategy_extend_memory(reactivePatchedCell, { kind: 'time', ms: 100 });
        
        rps_write(reactivePatchedCell, 1, { sourceCellId: "source1" });
        
        // Wait a bit and write another value
        setTimeout(() => {
            rps_write(reactivePatchedCell, 2, { sourceCellId: "source2" });
        }, 50);
        
        // Wait longer than the time window
        setTimeout(() => {
            rps_write(reactivePatchedCell, 3, { sourceCellId: "source3" });
            
            const buffer = rps_buffer(reactivePatchedCell);
            // Should only have the most recent value due to time constraint
            expect(buffer).toHaveLength(1);
            expect(buffer[0].value).toBe(3);
        }, 150);
    });

    it("should demonstrate reactive layer integration", () => {
        const reactivePatchedCell = create_reactive_patched_cell_with_timestamp(
            42, 
            "integration_test_cell"
        );
        
        // Write some values
        rps_write(reactivePatchedCell, 100, { sourceCellId: "sensor1", strength: 0.7 });
        rps_write(reactivePatchedCell, 200, { sourceCellId: "sensor2", strength: 0.9 });
        
        // Check patch layer functionality
        const buffer = rps_buffer(reactivePatchedCell);
        expect(buffer).toHaveLength(2);
        
        // Check reactive layer functionality
        const timestamp = rps_timestamp(reactivePatchedCell);
        expect(timestamp).toBeDefined();
        expect(rps_is_fresh(reactivePatchedCell)).toBe(true);
        
        // Check combined functionality
        const effectiveValue = rps_effective(reactivePatchedCell);
        expect(effectiveValue).toBe(200); // Should be the strongest (strength 0.9)
        
        // Verify both layers are present
        expect(has_patch_layer(reactivePatchedCell)).toBe(true);
        expect(has_timestamp_layer(get_base_value(reactivePatchedCell))).toBe(true);
    });
}); 