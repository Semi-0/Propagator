import { describe, it, expect, beforeEach } from "bun:test";
import {
    create_patched_cell,
    ce_write,
    ce_strategy_extend_memory,
    ce_strategy_extend_intake,
    ce_strategy_extend_selection,
    ce_strategy_extend_emit,
    ce_effective,
    ce_buffer,
    ce_strategy,
    ce_lineage,
    set_cell_caps,
    get_buffer_value,
    get_strategy_value,
    get_effective_value
} from "../PatchSystem/adapter/simpleAdapter";
import { cell_strongest } from "../Cell/Cell";
import { r_constant } from "../AdvanceReactivity/interface";

describe("Patch System with AdvanceReactivity", () => {
    let patchedCell: any;

    beforeEach(() => {
        patchedCell = create_patched_cell("test_cell");
    });

    describe("Basic functionality", () => {
        it("should create a patched cell with empty initial state", () => {
            const strategy = ce_strategy(patchedCell);
            const buffer = ce_buffer(patchedCell);
            const lineage = ce_lineage(patchedCell);

            expect(strategy).toBeDefined();
            expect(buffer).toBeDefined();
            expect(lineage).toBeDefined();
        });

        it("should write values to the cell buffer", () => {
            ce_write(patchedCell, 42, { sourceCellId: "source1", strength: 1.0 });
            ce_write(patchedCell, 100, { sourceCellId: "source2", strength: 0.5 });

            const bufferValue = get_buffer_value(patchedCell);
            
            expect(bufferValue).toHaveLength(2);
            expect(bufferValue[0].value).toBe(42);
            expect(bufferValue[1].value).toBe(100);
        });
    });

    describe("Memory strategies", () => {
        it("should limit buffer by count", () => {
            // Set memory strategy to keep only last 2 items
            ce_strategy_extend_memory(patchedCell, { kind: 'count', n: 2 });

            // Write 3 values
            ce_write(patchedCell, 1, { sourceCellId: "source1" });
            ce_write(patchedCell, 2, { sourceCellId: "source2" });
            ce_write(patchedCell, 3, { sourceCellId: "source3" });

            const buffer = ce_buffer(patchedCell);
            const bufferValue = cell_strongest(buffer);
            
            expect(bufferValue).toHaveLength(2);
            expect(bufferValue[0].value).toBe(2);
            expect(bufferValue[1].value).toBe(3);
        });

        it("should limit buffer by time window", () => {
            // Set memory strategy to keep only last 100ms
            ce_strategy_extend_memory(patchedCell, { kind: 'time', ms: 100 });

            // Write values with delays
            ce_write(patchedCell, 1, { sourceCellId: "source1" });
            
            // Wait a bit
            const start = Date.now();
            while (Date.now() - start < 50) {
                // Busy wait
            }
            
            ce_write(patchedCell, 2, { sourceCellId: "source2" });
            
            // Wait longer than the time window
            while (Date.now() - start < 150) {
                // Busy wait
            }
            
            ce_write(patchedCell, 3, { sourceCellId: "source3" });

            const buffer = ce_buffer(patchedCell);
            const bufferValue = cell_strongest(buffer);
            
            // Should only have the last value due to time window
            expect(bufferValue.length).toBeLessThanOrEqual(2);
        });
    });

    describe("Intake strategies", () => {
        it("should limit intake by source quota", () => {
            // Set intake strategy to limit each source to 2 items
            ce_strategy_extend_intake(patchedCell, {
                key: 'source',
                quota: { 'source1': 2, 'source2': 1 }
            });

            // Write more than quota from source1
            ce_write(patchedCell, 1, { sourceCellId: "source1" });
            ce_write(patchedCell, 2, { sourceCellId: "source1" });
            ce_write(patchedCell, 3, { sourceCellId: "source1" }); // Should replace oldest

            // Write from source2
            ce_write(patchedCell, 4, { sourceCellId: "source2" });

            const buffer = ce_buffer(patchedCell);
            const bufferValue = cell_strongest(buffer);
            
            // Should have 3 items total (2 from source1, 1 from source2)
            expect(bufferValue).toHaveLength(3);
            
            const source1Items = bufferValue.filter(item => item.sourceCellId === "source1");
            const source2Items = bufferValue.filter(item => item.sourceCellId === "source2");
            
            expect(source1Items).toHaveLength(2);
            expect(source2Items).toHaveLength(1);
        });

        it("should order by strength when specified", () => {
            ce_strategy_extend_intake(patchedCell, {
                key: 'source',
                quota: { 'source1': 3 },
                order: 'strength'
            });

            ce_write(patchedCell, 1, { sourceCellId: "source1", strength: 0.3 });
            ce_write(patchedCell, 2, { sourceCellId: "source1", strength: 0.8 });
            ce_write(patchedCell, 3, { sourceCellId: "source1", strength: 0.1 });

            const buffer = ce_buffer(patchedCell);
            const bufferValue = cell_strongest(buffer);
            
            // Should be ordered by strength (highest first)
            expect(bufferValue[0].strength).toBe(0.8);
            expect(bufferValue[1].strength).toBe(0.3);
            expect(bufferValue[2].strength).toBe(0.1);
        });
    });

    describe("Selection strategies", () => {
        it("should select first value by default", () => {
            ce_write(patchedCell, 1, { sourceCellId: "source1" });
            ce_write(patchedCell, 2, { sourceCellId: "source2" });
            ce_write(patchedCell, 3, { sourceCellId: "source3" });

            const effective = ce_effective(patchedCell);
            const effectiveValue = cell_strongest(effective);
            
            expect(effectiveValue).toBe(1); // First value
        });

        it("should select last value when configured", () => {
            ce_strategy_extend_selection(patchedCell, {
                ranks: new Set(['last']),
                reducers: new Set()
            });

            ce_write(patchedCell, 1, { sourceCellId: "source1" });
            ce_write(patchedCell, 2, { sourceCellId: "source2" });
            ce_write(patchedCell, 3, { sourceCellId: "source3" });

            const effective = ce_effective(patchedCell);
            const effectiveValue = cell_strongest(effective);
            
            expect(effectiveValue).toBe(3); // Last value
        });

        it("should select strongest value when configured", () => {
            ce_strategy_extend_selection(patchedCell, {
                ranks: new Set(['strongest']),
                reducers: new Set()
            });

            ce_write(patchedCell, 1, { sourceCellId: "source1", strength: 0.3 });
            ce_write(patchedCell, 2, { sourceCellId: "source2", strength: 0.8 });
            ce_write(patchedCell, 3, { sourceCellId: "source3", strength: 0.1 });

            const effective = ce_effective(patchedCell);
            const effectiveValue = cell_strongest(effective);
            
            expect(effectiveValue).toBe(2); // Strongest value
        });

        it("should use sum reducer when configured", () => {
            ce_strategy_extend_selection(patchedCell, {
                ranks: new Set(['reduce']),
                reducers: new Set(['sum'])
            });

            ce_write(patchedCell, 1, { sourceCellId: "source1" });
            ce_write(patchedCell, 2, { sourceCellId: "source2" });
            ce_write(patchedCell, 3, { sourceCellId: "source3" });

            const effective = ce_effective(patchedCell);
            const effectiveValue = cell_strongest(effective);
            
            expect(effectiveValue).toBe(6); // Sum of 1 + 2 + 3
        });

        it("should use average reducer when configured", () => {
            ce_strategy_extend_selection(patchedCell, {
                ranks: new Set(['reduce']),
                reducers: new Set(['avg'])
            });

            ce_write(patchedCell, 1, { sourceCellId: "source1" });
            ce_write(patchedCell, 2, { sourceCellId: "source2" });
            ce_write(patchedCell, 3, { sourceCellId: "source3" });

            const effective = ce_effective(patchedCell);
            const effectiveValue = cell_strongest(effective);
            
            expect(effectiveValue).toBe(2); // Average of 1, 2, 3
        });

        it("should use max reducer when configured", () => {
            ce_strategy_extend_selection(patchedCell, {
                ranks: new Set(['reduce']),
                reducers: new Set(['max'])
            });

            ce_write(patchedCell, 1, { sourceCellId: "source1" });
            ce_write(patchedCell, 5, { sourceCellId: "source2" });
            ce_write(patchedCell, 3, { sourceCellId: "source3" });

            const effective = ce_effective(patchedCell);
            const effectiveValue = cell_strongest(effective);
            
            expect(effectiveValue).toBe(5); // Max of 1, 5, 3
        });
    });

    describe("Emit strategies", () => {
        it("should emit immediately by default", () => {
            ce_write(patchedCell, 42, { sourceCellId: "source1" });

            const effective = ce_effective(patchedCell);
            const effectiveValue = cell_strongest(effective);
            
            expect(effectiveValue).toBe(42);
        });

        it("should support spread mode", () => {
            ce_strategy_extend_emit(patchedCell, { mode: 'spread', maxPerTick: 1 });

            ce_write(patchedCell, 1, { sourceCellId: "source1" });
            ce_write(patchedCell, 2, { sourceCellId: "source2" });
            ce_write(patchedCell, 3, { sourceCellId: "source3" });

            // In spread mode, should still emit the effective value
            const effective = ce_effective(patchedCell);
            const effectiveValue = cell_strongest(effective);
            
            expect(effectiveValue).toBe(1); // First value
        });
    });

    describe("Governance and caps", () => {
        it("should respect memory caps", () => {
            // Set caps to limit memory to max 3 items
            set_cell_caps(patchedCell, { memoryMaxN: 3 });

            // Try to set memory to 5 items - should be clamped to 3
            ce_strategy_extend_memory(patchedCell, { kind: 'count', n: 5 });

            const strategy = ce_strategy(patchedCell);
            const strategyValue = cell_strongest(strategy);
            
            expect(strategyValue.memory?.kind).toBe('count');
            expect(strategyValue.memory?.n).toBe(3); // Clamped to cap
        });

        it("should reject shrinking memory", () => {
            // First set memory to 5
            ce_strategy_extend_memory(patchedCell, { kind: 'count', n: 5 });

            // Try to shrink to 3 - should be rejected
            expect(() => {
                ce_strategy_extend_memory(patchedCell, { kind: 'count', n: 3 });
            }).toThrow("Patch rejected: memory - shrink");
        });

        it("should respect reducer allowlist", () => {
            // Set caps to only allow 'sum' reducer
            set_cell_caps(patchedCell, { allowReducers: new Set(['sum']) });

            // Try to add 'avg' reducer - should be filtered out
            ce_strategy_extend_selection(patchedCell, {
                ranks: new Set(['reduce']),
                reducers: new Set(['avg', 'sum'])
            });

            const strategy = ce_strategy(patchedCell);
            const strategyValue = cell_strongest(strategy);
            
            expect(strategyValue.selection?.reducers).toEqual(new Set(['sum']));
        });
    });

    describe("Lineage tracking", () => {
        it("should track applied patches", () => {
            ce_strategy_extend_memory(patchedCell, { kind: 'count', n: 5 });
            ce_strategy_extend_selection(patchedCell, {
                ranks: new Set(['last']),
                reducers: new Set()
            });

            const lineage = ce_lineage(patchedCell);
            const lineageValue = cell_strongest(lineage);
            
            expect(lineageValue.entries).toHaveLength(2);
            expect(lineageValue.entries[0].patch.memory?.kind).toBe('count');
            expect(lineageValue.entries[1].patch.selection?.ranks).toContain('last');
        });
    });

    describe("Complex scenarios", () => {
        it("should handle multiple strategies together", () => {
            // Set memory to keep last 3 items
            ce_strategy_extend_memory(patchedCell, { kind: 'count', n: 3 });
            
            // Set intake to limit each source to 2 items
            ce_strategy_extend_intake(patchedCell, {
                key: 'source',
                quota: { 'source1': 2, 'source2': 1 },
                order: 'strength'
            });
            
            // Set selection to use strongest
            ce_strategy_extend_selection(patchedCell, {
                ranks: new Set(['strongest']),
                reducers: new Set()
            });

            // Write values
            ce_write(patchedCell, 1, { sourceCellId: "source1", strength: 0.3 });
            ce_write(patchedCell, 2, { sourceCellId: "source1", strength: 0.8 });
            ce_write(patchedCell, 3, { sourceCellId: "source1", strength: 0.1 }); // Should replace oldest
            ce_write(patchedCell, 4, { sourceCellId: "source2", strength: 0.5 });

            const buffer = ce_buffer(patchedCell);
            const bufferValue = cell_strongest(buffer);
            
            // Should have 3 items total (2 from source1, 1 from source2)
            expect(bufferValue).toHaveLength(3);
            
            const effective = ce_effective(patchedCell);
            const effectiveValue = cell_strongest(effective);
            
            // Should select strongest value
            expect(effectiveValue).toBe(2); // strength 0.8
        });

        it("should handle reducer with multiple values", () => {
            ce_strategy_extend_selection(patchedCell, {
                ranks: new Set(['reduce']),
                reducers: new Set(['sum'])
            });

            // Write multiple values
            for (let i = 1; i <= 10; i++) {
                ce_write(patchedCell, i, { sourceCellId: `source${i}` });
            }

            const effective = ce_effective(patchedCell);
            const effectiveValue = cell_strongest(effective);
            
            // Should sum all values: 1+2+...+10 = 55
            expect(effectiveValue).toBe(55);
        });
    });
}); 