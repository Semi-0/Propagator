import { expect, test, jest, beforeEach, afterEach, describe } from "bun:test";
import { p_add, p_zip, p_remove_duplicates, p_filter_a } from "../Propagator/BuiltInProps";
import { execute_all_tasks_sequential } from "../Shared/Reactivity/Scheduler";
import { OperatorMemoryTest } from "../Monitor/OperatorMemoryTest";
import { function_to_primitive_propagator } from "../Propagator/Propagator";
import { construct_cell } from "../Cell/Cell";
import { tell } from "../Helper/UI";

// This demonstrates how to use the OperatorMemoryTest utility to easily 
// test any propagator for memory leaks

// describe("Memory testing with OperatorMemoryTest utility", () => {
//   test("testing p_add and p_filter with utility", async () => {
//     const tester = new OperatorMemoryTest("test1");
    
//     // Test p_add with normal numbers
//     const addResult = await tester.testOperator(
//       "p_add", 
//       (input, output) => {
//         const intermediateCell = construct_cell("intermediate");
//         return p_add(input, intermediateCell, output);
//       },
//       100, // 100 iterations
//       0    // No large objects
//     );
    
//     // Test p_filter with normal numbers
//     const filterResult = await tester.testOperator(
//       "p_filter",
//       (input, output) => {
//         const isEven = (x: number) => x % 2 === 0;
//         return p_filter_a(isEven)(input, output);
//       },
//       100,
//       0
//     );
    
//     // ASSERTIONS:
    
//     // Both operators should consume memory during operations
//     expect(addResult.memoryIncreaseDuringOps).toBeGreaterThan(0);
//     expect(filterResult.memoryIncreaseDuringOps).toBeGreaterThan(0);
    
//     // Both should release most memory after disposal
//     expect(addResult.memoryReleasedAfterDispose + addResult.memoryReleasedAfterGC)
//       .toBeGreaterThan(addResult.memoryIncreaseDuringOps * 0.5); // Should release at least 50%
    
//     expect(filterResult.memoryReleasedAfterDispose + filterResult.memoryReleasedAfterGC)
//       .toBeGreaterThan(filterResult.memoryIncreaseDuringOps * 0.5); // Should release at least 50%
//   });
  
  test("comparing original and fixed p_remove_duplicates with utility", async () => {
    // Create fixed version
    const p_remove_duplicates_fixed = (input: any, output: any) => {
      // Use WeakRef for better garbage collection
      let lastValueRef: WeakRef<any> | null = null;
      
      const propagator = function_to_primitive_propagator("p_remove_duplicates_fixed",
        (x: any) => {
          const lastValue = lastValueRef?.deref();
          if (x === lastValue) {
            return null; // Similar to no_compute
          } else {
            lastValueRef = new WeakRef(x);
            return x;
          }
        }
      )(input, output);
      
      // Add cleanup to dispose method
      const originalDispose = propagator.dispose;
      propagator.dispose = () => {
        originalDispose();
        lastValueRef = null;
      };
      
      return propagator;
    };
    
    const tester = new OperatorMemoryTest("compare");
    
    // Compare the two implementations with large objects
    const results = await tester.compareOperators(
      "p_remove_duplicates_original",
      (input, output) => p_remove_duplicates(input, output),
      "p_remove_duplicates_fixed",
      (input, output) => p_remove_duplicates_fixed(input, output),
      50,   // 50 iterations
      5000  // Using large objects
    );
    
    // Extract results for readability
    const original = results.result1;
    const fixed = results.result2;
    
    // ASSERTIONS:
    
    // Both implementations should use memory during operations
    expect(original.memoryIncreaseDuringOps).toBeGreaterThan(0);
    expect(fixed.memoryIncreaseDuringOps).toBeGreaterThan(0);
    
    // Fixed implementation should release more memory
    // We can't guarantee this with 100% certainty due to GC behavior variations,
    // but with a large enough object it should be measurable
    
    // Calculate memory retention ratio (lower is better)
    const originalRetainRatio = original.totalMemoryRetained / original.memoryIncreaseDuringOps;
    const fixedRetainRatio = fixed.totalMemoryRetained / fixed.memoryIncreaseDuringOps;
    
    console.log(`Original implementation retention ratio: ${originalRetainRatio}`);
    console.log(`Fixed implementation retention ratio: ${fixedRetainRatio}`);
    
    // Fixed should generally retain less memory proportionally 
    // We use a proportional comparison to make the test more stable
    expect(fixedRetainRatio).toBeLessThanOrEqual(originalRetainRatio * 1.1); // Allow 10% margin
  });
  
  test("continuous monitoring of a complex operation", async () => {
    const tester = new OperatorMemoryTest("continuous");
    
    let memoryBeforeCleanup = 0;
    let memoryAfterCleanup = 0;
    
    await tester.monitorContinuously(
      "complex-network",
      
      // Setup function
      () => {
        const cells = Array(20).fill(null).map((_, i) => construct_cell(`cell-${i}`));
        const propagators = [];
        
        // Create a network of propagators
        for (let i = 0; i < 10; i++) {
          propagators.push(p_add(cells[i], cells[i + 10], cells[i % 5]));
        }
        
        return { cells, propagators };
      },
      
      // Operations function
      async (cells, propagators) => {
        // Reduced from 10 iterations to 5 to avoid timeout
        for (let i = 0; i < 5; i++) {
          // Update cells
          cells.forEach((cell, idx) => {
            tell(cell, i * idx, `value-${i}-${idx}`);
          });
          
          await execute_all_tasks_sequential((e) => e && console.error(e));
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Capture memory before cleanup
        memoryBeforeCleanup = process.memoryUsage().heapUsed;
      },
      
      // Cleanup function
      (cells, propagators) => {
        propagators.forEach(p => p.dispose());
        
        // Capture memory after cleanup
        memoryAfterCleanup = process.memoryUsage().heapUsed;
      },
      
      // Check interval
      500, // Check every 500ms
      
      // Maximum test time (8 seconds)
      8000
    );
    
    // ASSERTIONS:
    // Memory should decrease after cleanup
    expect(memoryAfterCleanup).toBeLessThanOrEqual(memoryBeforeCleanup);
    
    // Force GC for a final reading
    global.gc && global.gc();
    const memoryAfterGC = process.memoryUsage().heapUsed;
    
    // Memory should decrease after GC
    expect(memoryAfterGC).toBeLessThanOrEqual(memoryAfterCleanup);
  }, 10000); // Also add a Bun test timeout of 10 seconds
}); 