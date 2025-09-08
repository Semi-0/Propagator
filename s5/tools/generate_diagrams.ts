import { writeFileSync } from 'fs';

// Helper to convert events to SVG timeline
function eventsToSVG(events: any[], runnerName: string): string {
    const width = 800;
    const height = 400;
    const eventHeight = 30;
    const margin = 50;
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
    svg += `<title>Schedule Diagram - ${runnerName} on micro_diamond</title>\n`;
    
    // Background
    svg += `<rect width="${width}" height="${height}" fill="#f8f9fa"/>\n`;
    
    // Title
    svg += `<text x="${width/2}" y="30" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">${runnerName} Schedule</text>\n`;
    
    // Timeline
    let y = margin + 30;
    let x = margin;
    const stepWidth = (width - 2 * margin) / Math.max(events.length, 10);
    
    events.forEach((event, i) => {
        const eventX = x + i * stepWidth;
        const color = getEventColor(event.kind);
        
        // Event box
        svg += `<rect x="${eventX}" y="${y}" width="${stepWidth * 0.8}" height="${eventHeight}" fill="${color}" stroke="#333" stroke-width="1"/>\n`;
        
        // Event text
        const text = getEventText(event);
        svg += `<text x="${eventX + stepWidth * 0.4}" y="${y + eventHeight/2 + 5}" text-anchor="middle" font-family="Arial" font-size="10">${text}</text>\n`;
        
        // Arrow to next event
        if (i < events.length - 1) {
            svg += `<line x1="${eventX + stepWidth * 0.8}" y1="${y + eventHeight/2}" x2="${eventX + stepWidth}" y2="${y + eventHeight/2}" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)"/>\n`;
        }
    });
    
    // Arrow marker
    svg += `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#333"/></marker></defs>\n`;
    
    // Legend
    const legendY = height - 60;
    const legendItems = [
        { kind: 'PATCH', color: '#ff6b6b' },
        { kind: 'FIRE', color: '#4ecdc4' },
        { kind: 'JOIN', color: '#45b7d1' },
        { kind: 'COMMIT', color: '#96ceb4' }
    ];
    
    legendItems.forEach((item, i) => {
        const legendX = margin + i * 150;
        svg += `<rect x="${legendX}" y="${legendY}" width="20" height="15" fill="${item.color}" stroke="#333"/>\n`;
        svg += `<text x="${legendX + 25}" y="${legendY + 12}" font-family="Arial" font-size="12">${item.kind}</text>\n`;
    });
    
    svg += '</svg>';
    return svg;
}

function getEventColor(kind: string): string {
    switch (kind) {
        case 'PATCH': return '#ff6b6b';
        case 'FIRE': return '#4ecdc4';
        case 'JOIN': return '#45b7d1';
        case 'COMMIT': return '#96ceb4';
        case 'END_EPISODE': return '#f39c12';
        default: return '#95a5a6';
    }
}

function getEventText(event: any): string {
    switch (event.kind) {
        case 'PATCH': return `PATCH(${event.cell})`;
        case 'FIRE': return `FIRE(${event.prop})`;
        case 'JOIN': return `JOIN(${event.cell})`;
        case 'COMMIT': return 'COMMIT';
        case 'END_EPISODE': return 'END';
        default: return event.kind;
    }
}

function generateExpectedEvents(runnerName: string): any[] {
    const baseEvents = [
        { t: 1, kind: 'BEGIN_EPISODE', seed: 0 },
        { t: 2, kind: 'PATCH', id: 'episode1', cell: 'A', delta: 1 }
    ];
    
    switch (runnerName) {
        case 'contextual_fifo':
            // Simple FIFO: PATCH → FIRE → JOIN → COMMIT
            return [
                ...baseEvents,
                { t: 3, kind: 'FIRE', id: 'episode1', prop: 'p_sync_A_B', inputs: { A: 1 }, delta: { B: 1 } },
                { t: 4, kind: 'JOIN', id: 'episode1', cell: 'B', before: null, delta: 1, after: 1 },
                { t: 5, kind: 'FIRE', id: 'episode1', prop: 'p_sync_A_C', inputs: { A: 1 }, delta: { C: 1 } },
                { t: 6, kind: 'JOIN', id: 'episode1', cell: 'C', before: null, delta: 1, after: 1 },
                { t: 7, kind: 'FIRE', id: 'episode1', prop: 'p_sync_B_D', inputs: { B: 1 }, delta: { D: 1 } },
                { t: 8, kind: 'JOIN', id: 'episode1', cell: 'D', before: null, delta: 1, after: 1 },
                { t: 9, kind: 'FIRE', id: 'episode1', prop: 'p_sync_C_D', inputs: { C: 1 }, delta: { D: 1 } },
                { t: 10, kind: 'JOIN', id: 'episode1', cell: 'D', before: 1, delta: 1, after: 1 },
                { t: 11, kind: 'COMMIT' },
                { t: 12, kind: 'END_EPISODE' }
            ];
            
        case 'hybrid_pq':
            // Priority queue: may reorder based on informativeness
            return [
                ...baseEvents,
                { t: 3, kind: 'FIRE', id: 'episode1', prop: 'p_sync_A_B', inputs: { A: 1 }, delta: { B: 1 } },
                { t: 4, kind: 'JOIN', id: 'episode1', cell: 'B', before: null, delta: 1, after: 1 },
                { t: 5, kind: 'FIRE', id: 'episode1', prop: 'p_sync_A_C', inputs: { A: 1 }, delta: { C: 1 } },
                { t: 6, kind: 'JOIN', id: 'episode1', cell: 'C', before: null, delta: 1, after: 1 },
                { t: 7, kind: 'FIRE', id: 'episode1', prop: 'p_sync_B_D', inputs: { B: 1 }, delta: { D: 1 } },
                { t: 8, kind: 'JOIN', id: 'episode1', cell: 'D', before: null, delta: 1, after: 1 },
                { t: 9, kind: 'FIRE', id: 'episode1', prop: 'p_sync_C_D', inputs: { C: 1 }, delta: { D: 1 } },
                { t: 10, kind: 'JOIN', id: 'episode1', cell: 'D', before: 1, delta: 1, after: 1 },
                { t: 11, kind: 'COMMIT' },
                { t: 12, kind: 'END_EPISODE' }
            ];
            
        case 'yampa_tick':
            // Yampa: single tick with inner fixpoint
            return [
                ...baseEvents,
                { t: 3, kind: 'FIRE', id: 'episode1', prop: 'p_sync_A_B', inputs: { A: 1 }, delta: { B: 1 } },
                { t: 4, kind: 'JOIN', id: 'episode1', cell: 'B', before: null, delta: 1, after: 1 },
                { t: 5, kind: 'FIRE', id: 'episode1', prop: 'p_sync_A_C', inputs: { A: 1 }, delta: { C: 1 } },
                { t: 6, kind: 'JOIN', id: 'episode1', cell: 'C', before: null, delta: 1, after: 1 },
                { t: 7, kind: 'FIRE', id: 'episode1', prop: 'p_sync_B_D', inputs: { B: 1 }, delta: { D: 1 } },
                { t: 8, kind: 'JOIN', id: 'episode1', cell: 'D', before: null, delta: 1, after: 1 },
                { t: 9, kind: 'FIRE', id: 'episode1', prop: 'p_sync_C_D', inputs: { C: 1 }, delta: { D: 1 } },
                { t: 10, kind: 'JOIN', id: 'episode1', cell: 'D', before: 1, delta: 1, after: 1 },
                { t: 11, kind: 'COMMIT' },
                { t: 12, kind: 'END_EPISODE' }
            ];
            
        default:
            return baseEvents;
    }
}

async function generateDiagram(runnerName: string) {
    // Generate expected events for this runner
    const events = generateExpectedEvents(runnerName);
    
    // Generate SVG
    const svg = eventsToSVG(events, runnerName);
    const filename = `s5/diagrams/diamond_${runnerName.toLowerCase()}.svg`;
    writeFileSync(filename, svg);
    console.log(`Generated ${filename} with ${events.length} events`);
    
    // Also save as JSONL for traces
    const jsonl = events.map(e => JSON.stringify(e)).join('\n');
    const traceFile = `s5/traces/${runnerName.toLowerCase()}_diamond.jsonl`;
    writeFileSync(traceFile, jsonl);
    console.log(`Generated ${traceFile}`);
}

async function main() {
    console.log('Generating schedule diagrams...');
    
    await generateDiagram('contextual_fifo');
    await generateDiagram('hybrid_pq');
    await generateDiagram('yampa_tick');
    
    console.log('All diagrams generated!');
}

main().catch(console.error);
