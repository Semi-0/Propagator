import { construct_cell, cell_strongest_base_value } from '../../Cell/Cell.js';
import { c_add } from '../../Propagator/BuiltInProps.js';
import { update } from '../../AdvanceReactivity/interface.js';

// Interval lattice for sqrt approximation
interface Interval {
    min: number;
    max: number;
}

function intervalLattice() {
    return {
        bottom: { min: -Infinity, max: Infinity },
        leq: (a: Interval, b: Interval) => {
            // a ⊑ b if b is contained in a (reverse inclusion)
            return b.min >= a.min && b.max <= a.max;
        },
        join: (a: Interval, b: Interval) => {
            // Join = intersection
            return {
                min: Math.max(a.min, b.min),
                max: Math.min(a.max, b.max)
            };
        }
    };
}

// Heron's method for sqrt approximation
function heronStep(x: number, guess: number): number {
    return (guess + x / guess) / 2;
}

export function buildSqrtFeedbackTask() {
    const xCell = construct_cell<Interval>('x');
    const guessCell = construct_cell<Interval>('guess');
    const sqrtCell = construct_cell<Interval>('sqrt');
    const refinedCell = construct_cell<Interval>('refined');
    
    // Set lattices
    xCell.lattice = intervalLattice();
    guessCell.lattice = intervalLattice();
    sqrtCell.lattice = intervalLattice();
    refinedCell.lattice = intervalLattice();
    
    // Feedback loop: refined → guess → sqrt → refined
    const feedbackOp = () => {
        const x = cell_strongest_base_value(xCell);
        const guess = cell_strongest_base_value(guessCell);
        
        if (x && guess) {
            // Apply Heron's method
            const newGuess = heronStep(x.min, guess.min);
            const newInterval = { min: newGuess, max: newGuess };
            
            // Update sqrt approximation
            sqrtCell.addContent(newInterval);
            
            // Feedback: use sqrt as new guess
            refinedCell.addContent(newInterval);
        }
    };
    
    // Connect feedback loop
    p_sync(refinedCell, guessCell);
    p_sync(guessCell, sqrtCell);
    p_sync(sqrtCell, refinedCell);
    
    const execute = (seed: number) => {
        // Set target value (e.g., sqrt(16) = 4)
        update(xCell, { min: 16, max: 16 });
        
        // Set initial guess
        update(guessCell, { min: 1, max: 1 });
    };
    
    const read = () => ({
        x: cell_strongest_base_value(xCell),
        guess: cell_strongest_base_value(guessCell),
        sqrt: cell_strongest_base_value(sqrtCell),
        refined: cell_strongest_base_value(refinedCell)
    });
    
    return { execute, read, observedCells: ['x', 'guess', 'sqrt', 'refined'] };
}
