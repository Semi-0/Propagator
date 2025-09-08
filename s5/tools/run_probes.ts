import { runContextual } from '../runners/contextual.js';
import { runHybrid } from '../runners/hybrid.js';
import { runYampa } from '../runners/yampa.js';
import { buildTemporalTask } from '../tasks/temporal_diff.js';
import { buildSqrtFeedbackTask } from '../tasks/sqrt_feedback.js';
import { writeFileSync } from 'fs';

interface ProbeResult {
    task: string;
    runner: string;
    seed: number;
    steps: number;
    final_value: any;
    converged: boolean;
}

async function runTemporalProbe(runner: (seed: number, execute: () => void) => Promise<void>, runnerName: string, seed: number): Promise<ProbeResult> {
    const task = buildTemporalTask();
    
    // Run the task
    const startTime = Date.now();
    await runner(seed, () => {
        task.execute(seed);
    });
    const endTime = Date.now();
    
    const result = task.read();
    
    return {
        task: 'temporal_diff',
        runner: runnerName,
        seed,
        steps: endTime - startTime,
        final_value: result.diff,
        converged: result.diff !== null && result.diff !== undefined
    };
}

async function runSqrtProbe(runner: (seed: number, execute: () => void) => Promise<void>, runnerName: string, seed: number): Promise<ProbeResult> {
    const task = buildSqrtFeedbackTask();
    
    // Run the task
    const startTime = Date.now();
    await runner(seed, () => {
        task.execute(seed);
    });
    const endTime = Date.now();
    
    const result = task.read();
    
    // Check if sqrt converged to reasonable value (sqrt(16) ≈ 4)
    const sqrtValue = result.sqrt;
    const converged = sqrtValue && Math.abs(sqrtValue.min - 4) < 0.1;
    
    return {
        task: 'sqrt_feedback',
        runner: runnerName,
        seed,
        steps: endTime - startTime,
        final_value: sqrtValue,
        converged
    };
}

async function main() {
    const runners = [
        { name: 'contextual_fifo', fn: runContextual },
        { name: 'hybrid_pq', fn: runHybrid },
        { name: 'yampa_tick', fn: runYampa }
    ];
    
    const seeds = [0, 1, 2, 3, 4];
    const results: ProbeResult[] = [];
    
    console.log('Running temporal diff probes...');
    for (const runner of runners) {
        for (const seed of seeds) {
            const result = await runTemporalProbe(runner.fn, runner.name, seed);
            results.push(result);
        }
    }
    
    console.log('Running sqrt feedback probes...');
    for (const runner of runners) {
        for (const seed of seeds) {
            const result = await runSqrtProbe(runner.fn, runner.name, seed);
            results.push(result);
        }
    }
    
    // Generate CSV files
    const temporalResults = results.filter(r => r.task === 'temporal_diff');
    const sqrtResults = results.filter(r => r.task === 'sqrt_feedback');
    
    // Temporal results CSV
    let temporalCSV = 'task,runner,seed,steps,final_value,converged\n';
    temporalResults.forEach(r => {
        temporalCSV += `${r.task},${r.runner},${r.seed},${r.steps},${r.final_value},${r.converged}\n`;
    });
    writeFileSync('s5/results_temporal.csv', temporalCSV);
    
    // Sqrt results CSV
    let sqrtCSV = 'task,runner,seed,steps,final_value,converged\n';
    sqrtResults.forEach(r => {
        sqrtCSV += `${r.task},${r.runner},${r.seed},${r.steps},"${JSON.stringify(r.final_value)}",${r.converged}\n`;
    });
    writeFileSync('s5/results_feedback.csv', sqrtCSV);
    
    console.log('Probe results written to:');
    console.log('- s5/results_temporal.csv');
    console.log('- s5/results_feedback.csv');
    
    // Print summary
    console.log('\nTemporal Diff Summary:');
    runners.forEach(runner => {
        const runnerResults = temporalResults.filter(r => r.runner === runner.name);
        const avgSteps = runnerResults.reduce((sum, r) => sum + r.steps, 0) / runnerResults.length;
        const convergedCount = runnerResults.filter(r => r.converged).length;
        console.log(`  ${runner.name}: avg ${avgSteps.toFixed(2)}ms, ${convergedCount}/${runnerResults.length} converged`);
    });
    
    console.log('\nSqrt Feedback Summary:');
    runners.forEach(runner => {
        const runnerResults = sqrtResults.filter(r => r.runner === runner.name);
        const avgSteps = runnerResults.reduce((sum, r) => sum + r.steps, 0) / runnerResults.length;
        const convergedCount = runnerResults.filter(r => r.converged).length;
        console.log(`  ${runner.name}: avg ${avgSteps.toFixed(2)}ms, ${convergedCount}/${runnerResults.length} converged`);
    });
}

main().catch(console.error);
