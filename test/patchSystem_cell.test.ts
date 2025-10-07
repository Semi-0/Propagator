// import { describe, it, expect } from "bun:test";
// import { 
//     create_patched_cell,
//     cps_write, 
//     cps_strategy_extend_memory, 
//     cps_strategy_extend_selection,
//     cps_buffer,
//     cps_strategy,
//     cps_effective,
//     cps_strongest,
//     cps_lineage,
//     get_buffer_value,
//     get_strategy_value,
//     get_effective_value
// } from "../PatchSystem/core/cellPatch";
// import { r_constant } from "../AdvanceReactivity/interface";
// import { p_add, p_multiply, ce_add, ce_multiply } from "../Propagator/BuiltInProps";
// import { cell_strongest, cell_content } from "../Cell/Cell";
// import { get_base_value } from "sando-layer/Basic/Layer";

// describe("Patch System - Cell-based Implementation", () => {
//     it("should create a patched cell that works with existing propagators", () => {
//         const patchedCell = create_patched_cell("test_cell", 0);
        
//         // Should work with existing cell operations
//         expect(cell_strongest(patchedCell)).toBeDefined();
//         expect(cell_content(patchedCell)).toBeDefined();
        
//         // Should have empty patch content initially
//         expect(cps_buffer(patchedCell)).toHaveLength(0);
//         expect(cps_strategy(patchedCell)).toEqual({});
//     });

//     it("should write values and work with reactive layer", () => {
//         const patchedCell = create_patched_cell("write_test_cell");
        
//         cps_write(patchedCell, 1, { sourceCellId: "source1", strength: 0.5 });
//         cps_write(patchedCell, 2, { sourceCellId: "source2", strength: 0.8 });
        
//         const buffer = cps_buffer(patchedCell);
//         expect(buffer).toHaveLength(2);
//         expect(buffer[0].value).toBe(1);
//         expect(buffer[1].value).toBe(2);
//         expect(buffer[1].strength).toBe(0.8);
        
//         // Should work with existing cell operations
//         const strongestValue = cell_strongest(patchedCell);
//         expect(strongestValue).toBeDefined();
        
//         // Cell content should contain reactive layer data
//         const cellContent = cell_content(patchedCell);
//         expect(cellContent).toBeDefined();
//     });

//     it("should apply memory constraints", () => {
//         const patchedCell = create_patched_cell("memory_test_cell");
        
//         cps_strategy_extend_memory(patchedCell, { kind: 'count', n: 2 });
        
//         cps_write(patchedCell, 1, { sourceCellId: "source1" });
//         cps_write(patchedCell, 2, { sourceCellId: "source2" });
//         cps_write(patchedCell, 3, { sourceCellId: "source3" });
//         cps_write(patchedCell, 4, { sourceCellId: "source4" });
        
//         const buffer = cps_buffer(patchedCell);
//         expect(buffer).toHaveLength(2);
//         expect(buffer[0].value).toBe(3);
//         expect(buffer[1].value).toBe(4);
//     });

//     it("should compute effective value with strongest selection", () => {
//         const patchedCell = create_patched_cell("strongest_test_cell");
        
//         cps_strategy_extend_selection(patchedCell, { 
//             ranks: new Set(['strongest']), 
//             reducers: new Set() 
//         });
        
//         cps_write(patchedCell, 1, { sourceCellId: "source1", strength: 0.3 });
//         cps_write(patchedCell, 2, { sourceCellId: "source2", strength: 0.8 });
//         cps_write(patchedCell, 3, { sourceCellId: "source3", strength: 0.5 });
        
//         const effectiveValue = cps_effective(patchedCell);
//         expect(effectiveValue).toBe(2); // Should be the strongest (strength 0.8)
//     });

//     it("should work with existing propagators", () => {
//         const patchedCell1 = create_patched_cell("propagator_test_1", 5);
//         const patchedCell2 = create_patched_cell("propagator_test_2", 3);
//         const resultCell = create_patched_cell("propagator_result");
        
//         // Use existing primitive propagator
//         p_add(patchedCell1, patchedCell2, resultCell);
        
//         // Should work normally
//         const result = cell_strongest(resultCell);
//         // Handle layered object result
//         const resultValue = typeof result === 'object' && result.identifier === 'layered_object' ? 
//             get_base_value(result) : result;
//         expect(resultValue).toBe(8); // 5 + 3
        
//         // Can still use patch system on the result cell
//         cps_strategy_extend_memory(resultCell, { kind: 'count', n: 1 });
//         cps_write(resultCell, 10, { sourceCellId: "override", strength: 0.9 });
        
//         const newResult = cps_effective(resultCell);
//         expect(newResult).toBe(10);
//     });

//     it("should work with compound propagators", () => {
//         const patchedCell1 = create_patched_cell("compound_test_1", 4);
//         const patchedCell2 = create_patched_cell("compound_test_2", 2);
//         const resultCell = create_patched_cell("compound_result");
        
//         // Use existing compound propagator
//         ce_multiply(patchedCell1, patchedCell2);
        
//         // Should work normally
//         const result = cell_strongest(resultCell);
//         // Handle layered object result
//         const resultValue = typeof result === 'object' && result.identifier === 'layered_object' ? 
//             get_base_value(result) : result;
//         expect(resultValue).toBe(8); // 4 * 2
        
//         // Can still use patch system
//         cps_strategy_extend_selection(resultCell, { 
//             ranks: new Set(['last']), 
//             reducers: new Set() 
//         });
//         cps_write(resultCell, 15, { sourceCellId: "override", strength: 0.7 });
        
//         const newResult = cps_effective(resultCell);
//         expect(newResult).toBe(15);
//     });

//     it("should track lineage", () => {
//         const patchedCell = create_patched_cell("lineage_test_cell");
        
//         cps_strategy_extend_memory(patchedCell, { kind: 'count', n: 3 });
//         cps_strategy_extend_selection(patchedCell, { 
//             ranks: new Set(['first']), 
//             reducers: new Set() 
//         });
        
//         const lineage = cps_lineage(patchedCell);
//         expect(lineage.entries).toHaveLength(2);
//         expect(lineage.entries[0].patch).toHaveProperty('memory');
//         expect(lineage.entries[1].patch).toHaveProperty('selection');
//     });

//     it("should work with reactive layer integration", () => {
//         const patchedCell = create_patched_cell("reactive_test_cell");
        
//         // Write some values
//         cps_write(patchedCell, 100, { sourceCellId: "sensor1", strength: 0.7 });
//         cps_write(patchedCell, 200, { sourceCellId: "sensor2", strength: 0.9 });
        
//         // Check patch layer functionality
//         const buffer = cps_buffer(patchedCell);
//         expect(buffer).toHaveLength(2);
        
//         // Check reactive layer functionality
//         const cellContent = cell_content(patchedCell);
//         expect(cellContent).toBeDefined();
        
//         // Check combined functionality
//         const effectiveValue = cps_effective(patchedCell);
//         expect(effectiveValue).toBe(200); // Should be the strongest (strength 0.9)
        
//         // Should work with existing cell operations
//         const strongestValue = cell_strongest(patchedCell);
//         expect(strongestValue).toBeDefined();
//     });

//     it("should demonstrate hot-swapping behavior", () => {
//         const patchedCell = create_patched_cell("hotswap_test_cell");
        
//         // Write initial values
//         cps_write(patchedCell, 1, { sourceCellId: "source1", strength: 0.3 });
//         cps_write(patchedCell, 2, { sourceCellId: "source2", strength: 0.8 });
//         cps_write(patchedCell, 3, { sourceCellId: "source3", strength: 0.5 });
        
//         // Start with strongest selection
//         cps_strategy_extend_selection(patchedCell, { 
//             ranks: new Set(['strongest']), 
//             reducers: new Set() 
//         });
//         expect(cps_effective(patchedCell)).toBe(2); // strongest
        
//         // Hot-swap to last selection
//         cps_strategy_extend_selection(patchedCell, { 
//             ranks: new Set(['last']), 
//             reducers: new Set() 
//         });
//         expect(cps_effective(patchedCell)).toBe(3); // last
        
//         // Hot-swap to first selection
//         cps_strategy_extend_selection(patchedCell, { 
//             ranks: new Set(['first']), 
//             reducers: new Set() 
//         });
//         expect(cps_effective(patchedCell)).toBe(1); // first
        
//         // Still works with existing cell operations
//         const strongestValue = cell_strongest(patchedCell);
//         expect(strongestValue).toBeDefined();
//     });

//     it("should work with helper functions", () => {
//         const patchedCell = create_patched_cell("helper_test_cell");
        
//         cps_write(patchedCell, 42, { sourceCellId: "test", strength: 0.8 });
        
//         // Test helper functions
//         expect(get_buffer_value(patchedCell)).toHaveLength(1);
//         expect(get_strategy_value(patchedCell)).toEqual({});
//         expect(get_effective_value(patchedCell)).toBe(42);
//     });
// }); 