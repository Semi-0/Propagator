import { describe, it, expect, beforeEach } from "bun:test";
import {
    create_patched_cell,
    ce_write,
    ce_strategy_extend_memory,
    ce_strategy_extend_selection,
    get_buffer_value,
    get_strategy_value,
    get_effective_value
} from "../PatchSystem/adapter/simpleAdapter";

describe("Patch System - Simple Tests", () => {
    let patchedCell: any;

    beforeEach(() => {
        patchedCell = create_patched_cell(`test_cell_${Date.now()}_${Math.random()}`);
    });

    describe("Basic functionality", () => {
        it("should create a patched cell with empty initial state", () => {
            const strategy = get_strategy_value(patchedCell);
            const buffer = get_buffer_value(patchedCell);

            expect(strategy).toEqual({});
            expect(buffer).toEqual([]);
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

            const bufferValue = get_buffer_value(patchedCell);
            
            expect(bufferValue).toHaveLength(2);
            expect(bufferValue[0].value).toBe(2);
            expect(bufferValue[1].value).toBe(3);
        });
    });

    describe("Selection strategies", () => {
        it("should select first value by default", () => {
            ce_write(patchedCell, 1, { sourceCellId: "source1" });
            ce_write(patchedCell, 2, { sourceCellId: "source2" });
            ce_write(patchedCell, 3, { sourceCellId: "source3" });

            const effectiveValue = get_effective_value(patchedCell);
            
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

            const effectiveValue = get_effective_value(patchedCell);
            
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

            const effectiveValue = get_effective_value(patchedCell);
            
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

            const effectiveValue = get_effective_value(patchedCell);
            
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

            const effectiveValue = get_effective_value(patchedCell);
            
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

            const effectiveValue = get_effective_value(patchedCell);
            
            expect(effectiveValue).toBe(5); // Max of 1, 5, 3
        });
    });

    describe("Strategy tracking", () => {
        it("should track applied strategies", () => {
            ce_strategy_extend_memory(patchedCell, { kind: 'count', n: 5 });
            ce_strategy_extend_selection(patchedCell, {
                ranks: new Set(['last']),
                reducers: new Set()
            });

            const strategy = get_strategy_value(patchedCell);
            
            expect(strategy.memory?.kind).toBe('count');
            expect(strategy.memory?.n).toBe(5);
            expect(strategy.selection?.ranks).toContain('last');
        });
    });

    describe("Complex scenarios", () => {
        it("should handle multiple strategies together", () => {
            // Set memory to keep last 3 items
            ce_strategy_extend_memory(patchedCell, { kind: 'count', n: 3 });
            
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

            const bufferValue = get_buffer_value(patchedCell);
            
            // Should have 3 items total (memory limit)
            expect(bufferValue).toHaveLength(3);
            
            const effectiveValue = get_effective_value(patchedCell);
            
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

            const effectiveValue = get_effective_value(patchedCell);
            
            // Should sum all values: 1+2+...+10 = 55
            expect(effectiveValue).toBe(55);
        });
    });
}); 