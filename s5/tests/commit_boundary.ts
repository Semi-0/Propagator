import { runContextual } from '../runners/contextual.js';
import { runHybrid } from '../runners/hybrid.js';
import { runYampa } from '../runners/yampa.js';
import { writeFileSync } from 'fs';

// Effect cell that produces observable side-effects
class EffectCell {
    private value: any = null;
    private effects: string[] = [];
    
    setValue(newValue: any) {
        this.value = newValue;
        this.effects.push(`EFFECT(${newValue})`);
    }
    
    getEffects(): string[] {
        return [...this.effects];
    }
    
    clearEffects() {
        this.effects = [];
    }
}

// Global effect cell for testing
const effectCell = new EffectCell();

// Mock task that changes the effect cell
function createEffectTask() {
    return {
        execute: async () => {
            // This should NOT trigger an effect until COMMIT
            effectCell.setValue(42);
        }
    };
}

async function testCommitBoundary(runner: (seed: number, execute: () => void) => Promise<void>, runnerName: string): Promise<string[]> {
    console.log(`Testing commit boundary for ${runnerName}...`);
    
    // Clear previous effects
    effectCell.clearEffects();
    
    // Run the task
    await runner(0, () => {
        const task = createEffectTask();
        return task.execute();
    });
    
    // Return the effects that were recorded
    return effectCell.getEffects();
}

async function main() {
    const results: Record<string, string[]> = {};
    
    // Test each runner
    results.contextual_fifo = await testCommitBoundary(runContextual, 'contextual_fifo');
    results.hybrid_pq = await testCommitBoundary(runHybrid, 'hybrid_pq');
    results.yampa_tick = await testCommitBoundary(runYampa, 'yampa_tick');
    
    // Generate report
    let report = 'Commit Boundary Test Results\n';
    report += '=============================\n\n';
    
    Object.entries(results).forEach(([runner, effects]) => {
        report += `${runner}:\n`;
        report += `  Effects recorded: ${effects.length}\n`;
        if (effects.length > 0) {
            report += `  Effect values: ${effects.join(', ')}\n`;
        }
        report += `  Status: ${effects.length === 0 ? 'PASS' : 'FAIL'} (should be 0 effects before COMMIT)\n\n`;
    });
    
    // Write report
    writeFileSync('s5/tests/commit_boundary.txt', report);
    console.log('Commit boundary test completed. See s5/tests/commit_boundary.txt');
    
    // Also log to console
    console.log(report);
}

main().catch(console.error);
