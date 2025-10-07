// import { describe, it, expect } from "bun:test";
// import {
//     create_patched_cell,
//     ce_write,
//     ce_strategy_extend_selection,
//     get_buffer_value,
//     get_strategy_value,
//     get_effective_value
// } from "../PatchSystem/adapter/simpleAdapter";

// describe("Patch System Verification", () => {
//     it("should work correctly with strongest selection", () => {
//         const cell = create_patched_cell("verification_cell");
        
//         // Set selection strategy to strongest
//         ce_strategy_extend_selection(cell, {
//             ranks: new Set(['strongest']),
//             reducers: new Set()
//         });
        
//         // Write values with different strengths
//         ce_write(cell, 1, { sourceCellId: "source1", strength: 0.3 });
//         ce_write(cell, 2, { sourceCellId: "source2", strength: 0.8 });
//         ce_write(cell, 3, { sourceCellId: "source3", strength: 0.1 });
        
//         const buffer = get_buffer_value(cell);
//         const strategy = get_strategy_value(cell);
//         const effective = get_effective_value(cell);
        
//         console.log("Buffer:", buffer);
//         console.log("Strategy:", strategy);
//         console.log("Effective:", effective);
        
//         expect(buffer).toHaveLength(3);
//         expect(strategy.selection?.ranks).toContain('strongest');
//         expect(effective).toBe(2); // Should be the strongest value
//     });
    
//     it("should work correctly with sum reducer", () => {
//         const cell = create_patched_cell(`sum_cell_${Date.now()}`);
//         console.log("Cell ID:", cell.toString());
        
//         // Set selection strategy to sum
//         ce_strategy_extend_selection(cell, {
//             ranks: new Set(['reduce']),
//             reducers: new Set(['sum'])
//         });
        
//         // Write values
//         ce_write(cell, 1, { sourceCellId: "source1" });
//         ce_write(cell, 2, { sourceCellId: "source2" });
//         ce_write(cell, 3, { sourceCellId: "source3" });
        
//         const buffer = get_buffer_value(cell);
//         const strategy = get_strategy_value(cell);
//         const effective = get_effective_value(cell);
        
//         console.log("Buffer:", buffer);
//         console.log("Strategy:", strategy);
//         console.log("Effective:", effective);
        
//         expect(buffer).toHaveLength(3);
//         expect(strategy.selection?.ranks).toContain('reduce');
//         expect(strategy.selection?.reducers).toContain('sum');
//         expect(effective).toBe(6); // Should be the sum
//     });
// }); 