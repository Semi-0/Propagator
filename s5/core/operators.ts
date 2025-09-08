import type { Id, DeltaMap, Lattice } from './csi.js';
import type { Interval } from './lattices.js';
import { intervalLattice, setUnionLattice, setIntersectionLattice, bool3Lattice } from './lattices.js';

// Route/Reconcile operator for set or interval narrowing
export function createRouteOperator(
  id: Id,
  inputId: Id,
  outputId: Id,
  lattice: Lattice<unknown>
): (read: (id: Id) => unknown) => DeltaMap {
  return (read: (id: Id) => unknown) => {
    const input = read(inputId);
    const delta = new Map<Id, unknown>();
    delta.set(outputId, input);
    return delta;
  };
}

// Sum projection operator: a + b = c
export function createSumProjectionOperator(
  id: Id,
  aId: Id,
  bId: Id,
  cId: Id
): (read: (id: Id) => unknown) => DeltaMap {
  return (read: (id: Id) => unknown) => {
    const a = read(aId) as Interval;
    const b = read(bId) as Interval;
    const c = read(cId) as Interval;
    
    const delta = new Map<Id, unknown>();
    
    // If we have a and b, compute c
    if (a && b && a.min !== -Infinity && a.max !== Infinity && 
        b.min !== -Infinity && b.max !== Infinity) {
      const newC: Interval = {
        min: a.min + b.min,
        max: a.max + b.max
      };
      delta.set(cId, newC);
    }
    
    // If we have a and c, compute b
    if (a && c && a.min !== -Infinity && a.max !== Infinity &&
        c.min !== -Infinity && c.max !== Infinity) {
      const newB: Interval = {
        min: c.min - a.max,
        max: c.max - a.min
      };
      delta.set(bId, newB);
    }
    
    // If we have b and c, compute a
    if (b && c && b.min !== -Infinity && b.max !== Infinity &&
        c.min !== -Infinity && c.max !== Infinity) {
      const newA: Interval = {
        min: c.min - b.max,
        max: c.max - b.min
      };
      delta.set(aId, newA);
    }
    
    return delta;
  };
}

// Set intersection operator
export function createSetIntersectionOperator(
  id: Id,
  inputIds: Id[],
  outputId: Id
): (read: (id: Id) => unknown) => DeltaMap {
  return (read: (id: Id) => unknown) => {
    const inputs = inputIds.map(id => read(id) as Set<unknown>);
    
    // Find the first non-empty set
    let result = new Set<unknown>();
    let hasValidInput = false;
    
    for (const input of inputs) {
      if (input && input.size > 0) {
        if (!hasValidInput) {
          result = new Set(input);
          hasValidInput = true;
        } else {
          // Intersect with current result
          const intersection = new Set<unknown>();
          for (const item of result) {
            if (input.has(item)) {
              intersection.add(item);
            }
          }
          result = intersection;
        }
      }
    }
    
    const delta = new Map<Id, unknown>();
    delta.set(outputId, result);
    return delta;
  };
}

// Boolean AND operator
export function createBoolAndOperator(
  id: Id,
  inputIds: Id[],
  outputId: Id
): (read: (id: Id) => unknown) => DeltaMap {
  return (read: (id: Id) => unknown) => {
    const inputs = inputIds.map(id => read(id) as 'bottom' | 'true' | 'false');
    
    // If any input is false, output is false
    if (inputs.some(input => input === 'false')) {
      const delta = new Map<Id, unknown>();
      delta.set(outputId, 'false');
      return delta;
    }
    
    // If all inputs are true, output is true
    if (inputs.every(input => input === 'true')) {
      const delta = new Map<Id, unknown>();
      delta.set(outputId, 'true');
      return delta;
    }
    
    // Otherwise, output is bottom (unknown)
    const delta = new Map<Id, unknown>();
    delta.set(outputId, 'bottom');
    return delta;
  };
}

// Boolean OR operator
export function createBoolOrOperator(
  id: Id,
  inputIds: Id[],
  outputId: Id
): (read: (id: Id) => unknown) => DeltaMap {
  return (read: (id: Id) => unknown) => {
    const inputs = inputIds.map(id => read(id) as 'bottom' | 'true' | 'false');
    
    // If any input is true, output is true
    if (inputs.some(input => input === 'true')) {
      const delta = new Map<Id, unknown>();
      delta.set(outputId, 'true');
      return delta;
    }
    
    // If all inputs are false, output is false
    if (inputs.every(input => input === 'false')) {
      const delta = new Map<Id, unknown>();
      delta.set(outputId, 'false');
      return delta;
    }
    
    // Otherwise, output is bottom (unknown)
    const delta = new Map<Id, unknown>();
    delta.set(outputId, 'bottom');
    return delta;
  };
}

// Temporal window aggregation from EventLog
export function createTemporalWindowOperator<T>(
  id: Id,
  inputId: Id,
  outputId: Id,
  windowSize: number
): (read: (id: Id) => unknown) => DeltaMap {
  return (read: (id: Id) => unknown) => {
    const input = read(inputId) as { events: T[]; timestamp: number };
    
    if (!input || !input.events) {
      return new Map<Id, unknown>();
    }
    
    // Get events within the window
    const cutoffTime = input.timestamp - windowSize;
    const windowEvents = input.events.filter((_, index) => {
      // For simplicity, assume events are ordered by timestamp
      // In a real implementation, you'd have timestamps per event
      return index >= Math.max(0, input.events.length - windowSize);
    });
    
    const delta = new Map<Id, unknown>();
    delta.set(outputId, { events: windowEvents, timestamp: input.timestamp });
    return delta;
  };
}

// Identity operator (for testing)
export function createIdentityOperator(
  id: Id,
  inputId: Id,
  outputId: Id
): (read: (id: Id) => unknown) => DeltaMap {
  return (read: (id: Id) => unknown) => {
    const input = read(inputId);
    const delta = new Map<Id, unknown>();
    delta.set(outputId, input);
    return delta;
  };
}

// Constant operator
export function createConstantOperator<T>(
  id: Id,
  outputId: Id,
  value: T
): (read: (id: Id) => unknown) => DeltaMap {
  return () => {
    const delta = new Map<Id, unknown>();
    delta.set(outputId, value);
    return delta;
  };
}
