import { type Cell, construct_cell } from "../Cell/Cell";
import { type Propagator } from "../Propagator/Propagator";
import { execute_all_tasks_sequential } from "../Shared/Reactivity/Scheduler";
import { tell } from "../Helper/UI";
import { MemoryMonitor } from "./MemoryMonior";

/**
 * Represents memory usage at different stages
 */
export interface MemoryTestResult {
  baseline: number;
  afterCells: number;
  afterCreate: number;
  afterOps: number;
  afterDispose: number;
  afterGC: number;
  
  // Helper methods for assertions
  memoryIncreaseDuringOps: number;  // afterOps - afterCreate
  memoryReleasedAfterDispose: number; // afterOps - afterDispose
  memoryReleasedAfterGC: number; // afterDispose - afterGC
  totalMemoryRetained: number; // afterGC - baseline
}

/**
 * Utility class for testing memory usage of propagator operators
 */
export class OperatorMemoryTest {
  private monitor: MemoryMonitor;
  private prefix: string;
  
  /**
   * Create a new operator memory test
   * @param namePrefix Prefix for all memory snapshots to avoid conflicts
   */
  constructor(namePrefix: string = "") {
    this.monitor = new MemoryMonitor();
    this.prefix = namePrefix ? `${namePrefix}-` : "";
  }
  
  /**
   * Test memory usage of a propagator function
   * @param name Name for the test
   * @param createPropagator Function that creates the propagator to test
   * @param iterations Number of operations to perform
   * @param largeObjectSize Size of large objects to use (0 to disable)
   * @returns Memory usage data for assertions
   */
  async testOperator(
    name: string,
    createPropagator: (input: Cell<any>, output: Cell<any>) => Propagator,
    iterations: number = 100,
    largeObjectSize: number = 0
  ): Promise<MemoryTestResult> {
    const testPrefix = `${this.prefix}${name}`;
    const memoryUsage: Record<string, number> = {};
    
    // Take baseline
    this.monitor.snapshot(`${testPrefix}-baseline`);
    memoryUsage.baseline = process.memoryUsage().heapUsed;
    
    // Create cells
    const input = construct_cell(`${name}-input`);
    const output = construct_cell(`${name}-output`);
    
    this.monitor.snapshot(`${testPrefix}-after-cells`);
    memoryUsage.afterCells = process.memoryUsage().heapUsed;
    
    // Create propagator
    const prop = createPropagator(input, output);
    
    this.monitor.snapshot(`${testPrefix}-after-create`);
    memoryUsage.afterCreate = process.memoryUsage().heapUsed;
    
    // Run operations
    if (largeObjectSize > 0) {
      // Test with large objects
      for (let i = 0; i < iterations; i++) {
        const largeObject = {
          id: i,
          data: Array(largeObjectSize).fill(`data-${i}`).join(' ')
        };
        tell(input, largeObject, `${name}-value-${i}`);
        await execute_all_tasks_sequential((e) => e && console.error(e));
      }
    } else {
      // Test with simple values
      for (let i = 0; i < iterations; i++) {
        tell(input, i, `${name}-value-${i}`);
        await execute_all_tasks_sequential((e) => e && console.error(e));
      }
    }
    
    this.monitor.snapshot(`${testPrefix}-after-ops`);
    memoryUsage.afterOps = process.memoryUsage().heapUsed;
    
    // Dispose
    prop.dispose();
    
    this.monitor.snapshot(`${testPrefix}-after-dispose`);
    memoryUsage.afterDispose = process.memoryUsage().heapUsed;
    
    // GC
    global.gc && global.gc();
    
    this.monitor.snapshot(`${testPrefix}-after-gc`);
    memoryUsage.afterGC = process.memoryUsage().heapUsed;
    
    // Compare snapshots
    this.monitor.compareSnapshots(`${testPrefix}-baseline`, `${testPrefix}-after-ops`);
    this.monitor.compareSnapshots(`${testPrefix}-after-ops`, `${testPrefix}-after-dispose`);
    this.monitor.compareSnapshots(`${testPrefix}-after-dispose`, `${testPrefix}-after-gc`);
    
    // Return memory test result for assertions
    return {
      baseline: memoryUsage.baseline,
      afterCells: memoryUsage.afterCells,
      afterCreate: memoryUsage.afterCreate,
      afterOps: memoryUsage.afterOps,
      afterDispose: memoryUsage.afterDispose,
      afterGC: memoryUsage.afterGC,
      
      // Computed values for easy assertions
      memoryIncreaseDuringOps: memoryUsage.afterOps - memoryUsage.afterCreate,
      memoryReleasedAfterDispose: memoryUsage.afterOps - memoryUsage.afterDispose,
      memoryReleasedAfterGC: memoryUsage.afterDispose - memoryUsage.afterGC,
      totalMemoryRetained: memoryUsage.afterGC - memoryUsage.baseline
    };
  }
  
  /**
   * Compare memory usage between two implementations of a similar operator
   * @param name1 Name of the first implementation
   * @param createPropagator1 Function that creates the first propagator
   * @param name2 Name of the second implementation
   * @param createPropagator2 Function that creates the second propagator
   * @param iterations Number of operations to perform
   * @param largeObjectSize Size of large objects to use (0 to disable)
   * @returns Results for both operators for assertions
   */
  async compareOperators(
    name1: string,
    createPropagator1: (input: Cell<any>, output: Cell<any>) => Propagator,
    name2: string,
    createPropagator2: (input: Cell<any>, output: Cell<any>) => Propagator,
    iterations: number = 100,
    largeObjectSize: number = 0
  ): Promise<{result1: MemoryTestResult, result2: MemoryTestResult}> {
    // Test first operator
    const result1 = await this.testOperator(name1, createPropagator1, iterations, largeObjectSize);
    
    // Test second operator
    const result2 = await this.testOperator(name2, createPropagator2, iterations, largeObjectSize);
    
    // Force final GC
    global.gc && global.gc();
    
    // Final comparison
    console.log(`\n=== Comparison between ${name1} and ${name2} ===`);
    console.log(`Each operator processed ${iterations} ${largeObjectSize > 0 ? 'large' : 'simple'} values`);
    console.log(`${name1} retained: ${result1.totalMemoryRetained} bytes`);
    console.log(`${name2} retained: ${result2.totalMemoryRetained} bytes`);
    console.log(`Memory difference: ${result1.totalMemoryRetained - result2.totalMemoryRetained} bytes`);
    
    return { result1, result2 };
  }
  
  /**
   * Run a continuous memory monitoring test
   * @param name Name for the test
   * @param setupFn Function that sets up cells and propagators
   * @param operationsFn Function that performs operations on the setup
   * @param cleanupFn Function that cleans up resources
   * @param intervalMs How often to check memory (ms)
   * @param maxTotalTimeMs Maximum total test time (defaults to 10000ms)
   */
  async monitorContinuously(
    name: string,
    setupFn: () => { cells: Cell<any>[], propagators: Propagator[] },
    operationsFn: (cells: Cell<any>[], propagators: Propagator[]) => Promise<void>,
    cleanupFn: (cells: Cell<any>[], propagators: Propagator[]) => void,
    intervalMs: number = 1000,
    maxTotalTimeMs: number = 10000
  ): Promise<void> {
    console.log(`\n=== Starting continuous monitoring for ${name} ===`);
    
    // Start monitoring
    this.monitor.startMonitoring(intervalMs);
    
    // Add timeout safety
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        this.monitor.stopMonitoring();
        reject(new Error(`Continuous monitoring for ${name} exceeded ${maxTotalTimeMs}ms timeout`));
      }, maxTotalTimeMs);
    });
    
    try {
      // Setup
      const { cells, propagators } = setupFn();
      
      // Run operations with timeout protection
      await Promise.race([
        operationsFn(cells, propagators),
        timeoutPromise
      ]);
      
      // Cleanup
      cleanupFn(cells, propagators);
      
      // Wait for final readings
      await new Promise(resolve => setTimeout(resolve, intervalMs * 2));
      
      // Stop monitoring
      this.monitor.stopMonitoring();
      
      console.log(`=== Completed continuous monitoring for ${name} ===\n`);
    } catch (error) {
      // Make sure monitoring is stopped even if error occurs
      this.monitor.stopMonitoring();
      if ((error as Error).message.includes('exceeded')) {
        console.log(`=== Monitoring for ${name} stopped due to timeout ===\n`);
      } else {
        throw error;
      }
    }
  }
} 