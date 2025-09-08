import { construct_cell, cell_strongest_base_value } from '../../Cell/Cell.js';
import { p_sync } from '../../Propagator/BuiltInProps.js';
import { update } from '../../AdvanceReactivity/interface.js';

// EventLog lattice for append-only events
interface EventLogEvent {
    timestamp: number;
    value: number;
}

interface EventLog {
    events: EventLogEvent[];
    windowSize: number;
}

function eventLogLattice() {
    return {
        bottom: { events: [], windowSize: 3 },
        leq: (a: EventLog, b: EventLog) => {
            // a ⊑ b if a is a prefix of b
            if (a.events.length > b.events.length) return false;
            for (let i = 0; i < a.events.length; i++) {
                if (a.events[i].timestamp !== b.events[i].timestamp || 
                    a.events[i].value !== b.events[i].value) {
                    return false;
                }
            }
            return true;
        },
        join: (a: EventLog, b: EventLog) => {
            // Join = union of events, maintaining order
            const allEvents = [...a.events, ...b.events];
            const uniqueEvents = allEvents.filter((event, index, self) => 
                index === self.findIndex(e => e.timestamp === event.timestamp && e.value === event.value)
            );
            return {
                events: uniqueEvents.sort((x, y) => x.timestamp - y.timestamp),
                windowSize: Math.max(a.windowSize, b.windowSize)
            };
        }
    };
}

export function buildTemporalTask() {
    const inputCell = construct_cell<EventLog>('input');
    const windowCell = construct_cell<EventLog>('window');
    const diffCell = construct_cell<number>('diff');
    
    // Set initial lattice
    inputCell.lattice = eventLogLattice();
    windowCell.lattice = eventLogLattice();
    
    // Temporal window operator: takes last N events and computes diff
    const temporalWindowOp = () => {
        const input = cell_strongest_base_value(inputCell);
        if (input && input.events.length > 0) {
            const windowSize = input.windowSize || 3;
            const recentEvents = input.events.slice(-windowSize);
            
            // Update window
            windowCell.addContent({
                events: recentEvents,
                windowSize
            });
            
            // Compute diff if we have at least 2 events
            if (recentEvents.length >= 2) {
                const latest = recentEvents[recentEvents.length - 1].value;
                const previous = recentEvents[recentEvents.length - 2].value;
                diffCell.addContent(latest - previous);
            }
        }
    };
    
    // Connect input to window computation
    p_sync(inputCell, windowCell);
    
    const execute = (seed: number) => {
        // Add 5 events in sequence
        const events = [
            { timestamp: 1, value: 10 },
            { timestamp: 2, value: 15 },
            { timestamp: 3, value: 12 },
            { timestamp: 4, value: 18 },
            { timestamp: 5, value: 20 }
        ];
        
        events.forEach(event => {
            inputCell.addContent({
                events: [event],
                windowSize: 3
            });
        });
    };
    
    const read = () => ({
        input: cell_strongest_base_value(inputCell),
        window: cell_strongest_base_value(windowCell),
        diff: cell_strongest_base_value(diffCell)
    });
    
    return { execute, read, observedCells: ['input', 'window', 'diff'] };
}
