import { readFileSync, writeFileSync } from 'fs';

interface TraceEvent {
    t: number;
    kind: string;
    [key: string]: any;
}

interface LegibilityMetrics {
    task: string;
    runner: string;
    total_events: number;
    joins_with_change: number;
    join_redundancy_ratio: number;
    avg_causal_slice_length: number;
    legibility_score: number;
}

function parseTraceFile(filename: string): TraceEvent[] {
    const content = readFileSync(filename, 'utf-8');
    return content.trim().split('\n').map(line => JSON.parse(line));
}

function computeCausalSlice(events: TraceEvent[], targetCell: string): TraceEvent[] {
    const slice: TraceEvent[] = [];
    const visited = new Set<string>();
    
    // Start from the end and work backwards
    for (let i = events.length - 1; i >= 0; i--) {
        const event = events[i];
        
        if (event.kind === 'JOIN' && event.cell === targetCell) {
            // Found a JOIN for our target cell
            if (!visited.has(`${event.kind}_${event.cell}_${event.t}`)) {
                slice.unshift(event);
                visited.add(`${event.kind}_${event.cell}_${event.t}`);
            }
            
            // Look for the FIRE that produced this JOIN
            for (let j = i - 1; j >= 0; j--) {
                const fireEvent = events[j];
                if (fireEvent.kind === 'FIRE' && fireEvent.delta && fireEvent.delta[targetCell]) {
                    if (!visited.has(`${fireEvent.kind}_${fireEvent.prop}_${fireEvent.t}`)) {
                        slice.unshift(fireEvent);
                        visited.add(`${fireEvent.kind}_${fireEvent.prop}_${fireEvent.t}`);
                    }
                    break;
                }
            }
        }
    }
    
    return slice;
}

function computeLegibilityMetrics(traceFile: string): LegibilityMetrics {
    const events = parseTraceFile(traceFile);
    const runner = traceFile.split('/').pop()?.split('_')[0] || 'unknown';
    
    // Count total events
    const totalEvents = events.length;
    
    // Count JOINs that actually changed values
    const joins = events.filter(e => e.kind === 'JOIN');
    const joinsWithChange = joins.filter(join => {
        // A JOIN changes value if before !== after
        return join.before !== join.after;
    }).length;
    
    const joinRedundancyRatio = joins.length > 0 ? (joins.length - joinsWithChange) / joins.length : 0;
    
    // Compute average causal slice length for sink cells
    const sinkCells = ['D']; // For micro_diamond
    const causalSlices = sinkCells.map(cell => computeCausalSlice(events, cell));
    const avgCausalSliceLength = causalSlices.reduce((sum, slice) => sum + slice.length, 0) / causalSlices.length;
    
    // Legibility score: lower is better (fewer events, less redundancy, shorter causal slices)
    const legibilityScore = totalEvents * (1 + joinRedundancyRatio) * avgCausalSliceLength;
    
    return {
        task: 'micro_diamond',
        runner,
        total_events: totalEvents,
        joins_with_change: joinsWithChange,
        join_redundancy_ratio: joinRedundancyRatio,
        avg_causal_slice_length: avgCausalSliceLength,
        legibility_score: legibilityScore
    };
}

async function main() {
    const traceFiles = [
        's5/traces/contextual_fifo_diamond.jsonl',
        's5/traces/hybrid_pq_diamond.jsonl',
        's5/traces/yampa_tick_diamond.jsonl'
    ];
    
    const metrics: LegibilityMetrics[] = [];
    
    for (const traceFile of traceFiles) {
        try {
            const metric = computeLegibilityMetrics(traceFile);
            metrics.push(metric);
            console.log(`Processed ${traceFile}`);
        } catch (error) {
            console.error(`Error processing ${traceFile}:`, error);
        }
    }
    
    // Generate CSV
    let csv = 'task,runner,total_events,joins_with_change,join_redundancy_ratio,avg_causal_slice_length,legibility_score\n';
    metrics.forEach(m => {
        csv += `${m.task},${m.runner},${m.total_events},${m.joins_with_change},${m.join_redundancy_ratio.toFixed(3)},${m.avg_causal_slice_length.toFixed(2)},${m.legibility_score.toFixed(2)}\n`;
    });
    
    writeFileSync('s5/legibility.csv', csv);
    
    console.log('\nLegibility Metrics:');
    console.log('==================');
    metrics.forEach(m => {
        console.log(`${m.runner}:`);
        console.log(`  Total events: ${m.total_events}`);
        console.log(`  JOINs with change: ${m.joins_with_change}`);
        console.log(`  Redundancy ratio: ${(m.join_redundancy_ratio * 100).toFixed(1)}%`);
        console.log(`  Avg causal slice: ${m.avg_causal_slice_length.toFixed(2)}`);
        console.log(`  Legibility score: ${m.legibility_score.toFixed(2)}`);
        console.log('');
    });
    
    console.log('Results written to s5/legibility.csv');
}

main().catch(console.error);
