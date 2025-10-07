// import { 
//     create_patched_cell, 
//     ps_write, 
//     ps_strategy_extend_memory, 
//     ps_strategy_extend_selection,
//     ps_buffer,
//     ps_strategy,
//     ps_effective,
//     ps_strongest,
//     ps_lineage
// } from "../PatchSystem/core/layeredPatch";
// import { construct_cell } from "../Cell/Cell";
// import { r_constant } from "../AdvanceReactivity/interface";

// describe("Patch System - Layered Implementation", () => {
//     it("should create a patched cell with layered procedures", () => {
//         const baseCell = r_constant(0, "test_cell");
//         const patchedCell = create_patched_cell(baseCell);
        
//         expect(ps_buffer(patchedCell)).toHaveLength(0);
//         expect(ps_strategy(patchedCell)).toEqual({});
//     });

//     it("should write values to patched cell", () => {
//         const baseCell = r_constant(0, "test_cell");
//         const patchedCell = create_patched_cell(baseCell);
        
//         ps_write(patchedCell, 1, { sourceCellId: "source1", strength: 0.5 });
//         ps_write(patchedCell, 2, { sourceCellId: "source2", strength: 0.8 });
        
//         const buffer = ps_buffer(patchedCell);
//         expect(buffer).toHaveLength(2);
//         expect(buffer[0].value).toBe(1);
//         expect(buffer[1].value).toBe(2);
//         expect(buffer[1].strength).toBe(0.8);
//     });

//     it("should apply memory constraints", () => {
//         const baseCell = r_constant(0, "test_cell");
//         const patchedCell = create_patched_cell(baseCell);
        
//         ps_strategy_extend_memory(patchedCell, { kind: 'count', n: 2 });
        
//         ps_write(patchedCell, 1, { sourceCellId: "source1" });
//         ps_write(patchedCell, 2, { sourceCellId: "source2" });
//         ps_write(patchedCell, 3, { sourceCellId: "source3" });
//         ps_write(patchedCell, 4, { sourceCellId: "source4" });
        
//         const buffer = ps_buffer(patchedCell);
//         expect(buffer).toHaveLength(2);
//         expect(buffer[0].value).toBe(3);
//         expect(buffer[1].value).toBe(4);
//     });

//     it("should compute effective value with strongest selection", () => {
//         const baseCell = r_constant(0, "test_cell");
//         const patchedCell = create_patched_cell(baseCell);
        
//         ps_strategy_extend_selection(patchedCell, { 
//             ranks: new Set(['strongest']), 
//             reducers: new Set() 
//         });
        
//         ps_write(patchedCell, 1, { sourceCellId: "source1", strength: 0.3 });
//         ps_write(patchedCell, 2, { sourceCellId: "source2", strength: 0.8 });
//         ps_write(patchedCell, 3, { sourceCellId: "source3", strength: 0.5 });
        
//         const effectiveValue = ps_effective(patchedCell);
//         expect(effectiveValue).toBe(2); // Should be the strongest (strength 0.8)
//     });

//     it("should work with layered strongest procedure", () => {
//         const baseCell = r_constant(0, "test_cell");
//         const patchedCell = create_patched_cell(baseCell);
        
//         ps_strategy_extend_selection(patchedCell, { 
//             ranks: new Set(['strongest']), 
//             reducers: new Set() 
//         });
        
//         ps_write(patchedCell, 1, { sourceCellId: "source1", strength: 0.3 });
//         ps_write(patchedCell, 2, { sourceCellId: "source2", strength: 0.8 });
        
//         // Use the layered strongest procedure
//         const strongestValue = ps_strongest(patchedCell);
//         expect(strongestValue).toBe(2); // Should be the strongest (strength 0.8)
//     });

//     it("should track lineage", () => {
//         const baseCell = r_constant(0, "test_cell");
//         const patchedCell = create_patched_cell(baseCell);
        
//         ps_strategy_extend_memory(patchedCell, { kind: 'count', n: 3 });
//         ps_strategy_extend_selection(patchedCell, { 
//             ranks: new Set(['first']), 
//             reducers: new Set() 
//         });
        
//         const lineage = ps_lineage(patchedCell);
//         expect(lineage.entries).toHaveLength(2);
//         expect(lineage.entries[0].patch).toHaveProperty('memory');
//         expect(lineage.entries[1].patch).toHaveProperty('selection');
//     });

//     it("should handle time-based memory constraints", () => {
//         const baseCell = r_constant(0, "test_cell");
//         const patchedCell = create_patched_cell(baseCell);
        
//         ps_strategy_extend_memory(patchedCell, { kind: 'time', ms: 100 });
        
//         ps_write(patchedCell, 1, { sourceCellId: "source1" });
        
//         // Wait a bit and write another value
//         setTimeout(() => {
//             ps_write(patchedCell, 2, { sourceCellId: "source2" });
//         }, 50);
        
//         // Wait longer than the time window
//         setTimeout(() => {
//             ps_write(patchedCell, 3, { sourceCellId: "source3" });
            
//             const buffer = ps_buffer(patchedCell);
//             // Should only have the most recent value due to time constraint
//             expect(buffer).toHaveLength(1);
//             expect(buffer[0].value).toBe(3);
//         }, 150);
//     });
// }); 