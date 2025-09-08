import type { Lattice } from './csi.js';

// Interval lattice: order by reverse inclusion, join = intersection
export interface Interval {
  min: number;
  max: number;
}

export const intervalLattice: Lattice<Interval> = {
  bottom: { min: -Infinity, max: Infinity },
  leq: (a: Interval, b: Interval) => b.min <= a.min && a.max <= b.max,
  join: (a: Interval, b: Interval) => ({
    min: Math.max(a.min, b.min),
    max: Math.min(a.max, b.max)
  }),
  pretty: (i: Interval) => `[${i.min}, ${i.max}]`
};

// Set lattice: order by ⊆, join = ∪
export const setUnionLattice = <T>(): Lattice<Set<T>> => ({
  bottom: new Set(),
  leq: (a: Set<T>, b: Set<T>) => {
    for (const x of a) {
      if (!b.has(x)) return false;
    }
    return true;
  },
  join: (a: Set<T>, b: Set<T>) => new Set([...a, ...b]),
  pretty: (s: Set<T>) => `{${Array.from(s).join(', ')}}`
});

// Set lattice: order by ⊆, join = ∩ (for shrinking sets)
export const setIntersectionLattice = <T>(): Lattice<Set<T>> => ({
  bottom: new Set(), // This is actually top in intersection lattice
  leq: (a: Set<T>, b: Set<T>) => {
    for (const x of a) {
      if (!b.has(x)) return false;
    }
    return true;
  },
  join: (a: Set<T>, b: Set<T>) => {
    const result = new Set<T>();
    for (const x of a) {
      if (b.has(x)) result.add(x);
    }
    return result;
  },
  pretty: (s: Set<T>) => `{${Array.from(s).join(', ')}}`
});

// Bool3 lattice: ⊥ < T,F (no T⊔F collapse)
export type Bool3 = 'bottom' | 'true' | 'false';

export const bool3Lattice: Lattice<Bool3> = {
  bottom: 'bottom',
  leq: (a: Bool3, b: Bool3) => {
    if (a === 'bottom') return true;
    if (b === 'bottom') return false;
    return a === b;
  },
  join: (a: Bool3, b: Bool3) => {
    if (a === 'bottom') return b;
    if (b === 'bottom') return a;
    if (a === b) return a;
    return 'bottom'; // T ⊔ F = ⊥ (conflict)
  },
  pretty: (b: Bool3) => b
};

// Product lattice: pointwise order/join
export const productLattice = <T extends Record<string, unknown>>(
  lattices: { [K in keyof T]: Lattice<T[K]> }
): Lattice<T> => ({
  bottom: Object.fromEntries(
    Object.entries(lattices).map(([k, lat]) => [k, lat.bottom])
  ) as T,
  leq: (a: T, b: T) => {
    for (const [k, lat] of Object.entries(lattices)) {
      if (!lat.leq(a[k as keyof T], b[k as keyof T])) return false;
    }
    return true;
  },
  join: (a: T, b: T) => {
    const result = {} as T;
    for (const [k, lat] of Object.entries(lattices)) {
      result[k as keyof T] = lat.join(a[k as keyof T], b[k as keyof T]);
    }
    return result;
  },
  pretty: (t: T) => {
    const parts = Object.entries(lattices).map(([k, lat]) => 
      `${k}: ${lat.pretty ? lat.pretty(t[k as keyof T]) : String(t[k as keyof T])}`
    );
    return `{${parts.join(', ')}}`;
  }
});

// EventLog lattice: append-only array with prefix order
export interface EventLog<T> {
  events: T[];
  timestamp: number;
}

export const eventLogLattice = <T>(): Lattice<EventLog<T>> => ({
  bottom: { events: [], timestamp: 0 },
  leq: (a: EventLog<T>, b: EventLog<T>) => {
    if (a.events.length > b.events.length) return false;
    for (let i = 0; i < a.events.length; i++) {
      if (a.events[i] !== b.events[i]) return false;
    }
    return true;
  },
  join: (a: EventLog<T>, b: EventLog<T>) => {
    const minLength = Math.min(a.events.length, b.events.length);
    const commonEvents = a.events.slice(0, minLength);
    
    // Check if common prefix matches
    for (let i = 0; i < minLength; i++) {
      if (a.events[i] !== b.events[i]) {
        // Return common prefix
        return { events: commonEvents.slice(0, i), timestamp: Math.max(a.timestamp, b.timestamp) };
      }
    }
    
    // Return the shorter log (which is the common prefix)
    return a.events.length <= b.events.length ? a : b;
  },
  pretty: (log: EventLog<T>) => `[${log.events.length} events, t=${log.timestamp}]`
});

// Helper functions
export function isChange<T>(a: T, b: T, lattice: Lattice<T>): boolean {
  return !lattice.leq(a, b) || !lattice.leq(b, a);
}

export function width(interval: Interval): number {
  if (interval.min === -Infinity || interval.max === Infinity) return Infinity;
  return interval.max - interval.min;
}

// Informativeness functions for scheduling policies
export function informativeness<T>(value: T, lattice: Lattice<T>): number {
  if (lattice === intervalLattice) {
    const interval = value as Interval;
    return -width(interval); // Smaller width = more informative
  }
  
  if (lattice === bool3Lattice) {
    const bool3 = value as Bool3;
    if (bool3 === 'bottom') return 0;
    return 1; // T or F are equally informative
  }
  
  // For sets, we assume we're shrinking them (intersection lattice)
  if (value instanceof Set) {
    return -(value as Set<unknown>).size; // Smaller set = more informative
  }
  
  // For event logs
  if (typeof value === 'object' && value !== null && 'events' in value) {
    const log = value as EventLog<unknown>;
    return log.events.length; // More events = more informative
  }
  
  return 0; // Default
}
