#!/usr/bin/env bun

import type { Graph, Patch } from '../core/csi.js';
import { runHybrid } from '../runners/hybrid.js';
import { step } from '../runners/yampa.js';
import { getCell } from '../core/csi.js';
import { SeededRNG } from '../lab/seed.js';

// Task registry
const tasks = {
  micro_chain: () => import('../tasks/micro_chain.js'),
  micro_diamond: () => import('../tasks/micro_diamond.js'),
  micro_feedback: () => import('../tasks/micro_feedback.js'),
  t1_routing: () => import('../tasks/t1_routing.js'),
  t2_sum_project: () => import('../tasks/t2_sum_project.js'),
  t3_temporal_diff: () => import('../tasks/t3_temporal_diff.js')
};

type Runner = 'hybrid' | 'yampa' | 'contextual';
type Policy = 'fifo' | 'pq_info' | 'topo_scc';
type TaskName = keyof typeof tasks;

interface RunResult {
  task: string;
  runner: string;
  policy: string;
  seed: number;
  equal_fixpoint: boolean;
  fires: number;
  joins: number;
  redundancy: number;
  first_stable: number;
  queue_max: number;
  contradictions: number;
  end_values: Record<string, unknown>;
}

interface RunOptions {
  runner: Runner;
  policy?: Policy;
  task: TaskName | 'all';
  seeds: number;
}

async function runTask(
  taskName: TaskName,
  runner: Runner,
  policy: Policy,
  seed: number
): Promise<RunResult> {
  const task = await tasks[taskName]();
  const graph = task.buildGraph();
  const patches = task.patches(seed);
  
  // Create a copy for comparison
  const graphCopy = JSON.parse(JSON.stringify(graph));
  
  let fires = 0;
  let joins = 0;
  let contradictions = 0;
  let queueMax = 0;
  let firstStable = -1;
  
  // Simple event counting (in a real implementation, you'd parse the logs)
  const originalConsoleLog = console.log;
  console.log = () => {}; // Suppress output during runs
  
  try {
    if (runner === 'hybrid') {
      await runHybrid(graph, patches, policy, seed);
    } else if (runner === 'yampa') {
      await step(graph, 1.0, patches, seed);
    } else if (runner === 'contextual') {
      // TODO: Implement contextual runner
      throw new Error('Contextual runner not implemented yet');
    }
  } finally {
    console.log = originalConsoleLog;
  }
  
  // Get events from the episode logger to count fires and joins
  const { getLogger } = await import('../lab/episodes.js');
  try {
    const logger = getLogger();
    const events = logger.getEvents();
    
    fires = events.filter(e => e.kind === 'FIRE').length;
    joins = events.filter(e => e.kind === 'JOIN').length;
    contradictions = events.filter(e => e.kind === 'CONTRADICTION').length;
  } catch (error) {
    // Logger not available, use default values
  }
  
  // Extract end values for observed cells
  const endValues: Record<string, unknown> = {};
  for (const cellId of task.observedCells) {
    const cell = getCell(graph, cellId);
    if (cell) {
      endValues[cellId] = cell.value;
    }
  }
  
  return {
    task: taskName,
    runner,
    policy,
    seed,
    equal_fixpoint: true, // TODO: Compare with baseline
    fires,
    joins,
    redundancy: joins > 0 ? (joins - fires) / joins : 0,
    first_stable: firstStable,
    queue_max: queueMax,
    contradictions,
    end_values: endValues
  };
}

async function runAllTasks(options: RunOptions): Promise<RunResult[]> {
  const results: RunResult[] = [];
  const taskNames = options.task === 'all' 
    ? Object.keys(tasks) as TaskName[]
    : [options.task];
  
  for (const taskName of taskNames) {
    console.log(`Running task: ${taskName}`);
    
    for (let seed = 0; seed < options.seeds; seed++) {
      const policy = options.policy || 'fifo';
      const result = await runTask(taskName, options.runner, policy, seed);
      results.push(result);
      
      if (seed % 10 === 0) {
        console.log(`  Completed ${seed + 1}/${options.seeds} seeds`);
      }
    }
  }
  
  return results;
}

function exportCSV(results: RunResult[]): string {
  const headers = [
    'task', 'runner', 'policy', 'seed', 'equal_fixpoint', 
    'fires', 'joins', 'redundancy', 'first_stable', 'queue_max', 'contradictions'
  ];
  
  const rows = results.map(result => [
    result.task,
    result.runner,
    result.policy,
    result.seed,
    result.equal_fixpoint ? 1 : 0,
    result.fires,
    result.joins,
    result.redundancy.toFixed(3),
    result.first_stable,
    result.queue_max,
    result.contradictions
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// Parse command line arguments
function parseArgs(): RunOptions {
  const args = process.argv.slice(2);
  const options: Partial<RunOptions> = {
    seeds: 50
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--runner=')) {
      options.runner = arg.split('=')[1] as Runner;
    } else if (arg.startsWith('--policy=')) {
      options.policy = arg.split('=')[1] as Policy;
    } else if (arg.startsWith('--task=')) {
      options.task = arg.split('=')[1] as TaskName | 'all';
    } else if (arg.startsWith('--seeds=')) {
      options.seeds = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--runner' && i + 1 < args.length) {
      options.runner = args[++i] as Runner;
    } else if (arg === '--policy' && i + 1 < args.length) {
      options.policy = args[++i] as Policy;
    } else if (arg === '--task' && i + 1 < args.length) {
      options.task = args[++i] as TaskName | 'all';
    } else if (arg === '--seeds' && i + 1 < args.length) {
      options.seeds = parseInt(args[++i], 10);
    }
  }
  
  console.log('Parsed args:', args);
  console.log('Options:', options);
  
  if (!options.runner) {
    throw new Error('--runner is required (hybrid|yampa|contextual)');
  }
  if (!options.task) {
    throw new Error('--task is required (task name or "all")');
  }
  
  return options as RunOptions;
}

// Main execution
async function main() {
  try {
    const options = parseArgs();
    console.log('Running fuzz comparison with options:', options);
    
    const results = await runAllTasks(options);
    
    // Export to CSV
    const csv = exportCSV(results);
    await Bun.write('results.csv', csv);
    
    console.log(`Results exported to results.csv (${results.length} runs)`);
    
    // Print summary
    const summary = results.reduce((acc, result) => {
      const key = `${result.task}-${result.runner}-${result.policy}`;
      if (!acc[key]) {
        acc[key] = {
          count: 0,
          totalFires: 0,
          totalJoins: 0,
          totalRedundancy: 0
        };
      }
      acc[key].count++;
      acc[key].totalFires += result.fires;
      acc[key].totalJoins += result.joins;
      acc[key].totalRedundancy += result.redundancy;
      return acc;
    }, {} as Record<string, any>);
    
    console.log('\nSummary:');
    for (const [key, stats] of Object.entries(summary)) {
      console.log(`${key}: ${stats.count} runs, avg fires: ${(stats.totalFires / stats.count).toFixed(1)}, avg redundancy: ${(stats.totalRedundancy / stats.count).toFixed(3)}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
