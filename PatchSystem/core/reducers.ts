import type { ValueItem, Strategy } from './types';

export type Reducer<T = any> = (items: ValueItem<T>[]) => T;

export const sumReducer: Reducer<number> = (items) => {
    return items.reduce((acc, item) => acc + (item.value as number), 0);
};

export const avgReducer: Reducer<number> = (items) => {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + (item.value as number), 0);
    return sum / items.length;
};

export const medianReducer: Reducer<number> = (items) => {
    if (items.length === 0) return 0;
    const values = items.map(item => item.value as number).sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0 
        ? (values[mid - 1] + values[mid]) / 2 
        : values[mid];
};

export const maxReducer: Reducer<number> = (items) => {
    if (items.length === 0) return -Infinity;
    return Math.max(...items.map(item => item.value as number));
};

export const minReducer: Reducer<number> = (items) => {
    if (items.length === 0) return Infinity;
    return Math.min(...items.map(item => item.value as number));
};

export const firstReducer: Reducer<any> = (items) => {
    if (items.length === 0) return undefined;
    return items[0].value;
};

export const lastReducer: Reducer<any> = (items) => {
    if (items.length === 0) return undefined;
    return items[items.length - 1].value;
};

export const strongestReducer: Reducer<any> = (items) => {
    if (items.length === 0) return undefined;
    return items.reduce((strongest, item) => 
        (item.strength || 0) > (strongest.strength || 0) ? item : strongest
    ).value;
};

export const mapMergeReducer = <T>(keyFn: (item: T) => string, mergeFn: (a: T, b: T) => T): Reducer<T[]> => {
    return (items) => {
        const map = new Map<string, T>();
        for (const item of items) {
            const key = keyFn(item.value as T);
            const existing = map.get(key);
            map.set(key, existing ? mergeFn(existing, item.value as T) : item.value as T);
        }
        return Array.from(map.values());
    };
};

// Registry of available reducers
export const reducerRegistry = new Map<string, Reducer>([
    ['sum', sumReducer],
    ['avg', avgReducer],
    ['median', medianReducer],
    ['max', maxReducer],
    ['min', minReducer],
    ['first', firstReducer],
    ['last', lastReducer],
    ['strongest', strongestReducer],
]);

export const getReducer = (name: string): Reducer | undefined => {
    return reducerRegistry.get(name);
};

export const registerReducer = (name: string, reducer: Reducer): void => {
    reducerRegistry.set(name, reducer);
};

// Compute the effective value based on strategy and buffer
export const computeEffectiveValue = (buffer: ValueItem[], strategy: Strategy): any => {
    if (buffer.length === 0) return undefined;
    
    const selection = strategy.selection;
    if (!selection) {
        // Default to first if no selection strategy
        return buffer[0].value;
    }
    
    // Apply memory constraints to buffer for effective value computation
    let effectiveBuffer = buffer;
    if (strategy.memory?.kind === 'count') {
        effectiveBuffer = buffer.slice(-strategy.memory.n);
    } else if (strategy.memory?.kind === 'time') {
        const cutoff = Date.now() - strategy.memory.ms;
        effectiveBuffer = buffer.filter(item => item.ts >= cutoff);
    }
    
    if (effectiveBuffer.length === 0) return undefined;
    
    // Determine which rank to use
    const ranks = selection.ranks;
    if (ranks.has('first')) {
        return effectiveBuffer[0].value;
    } else if (ranks.has('last')) {
        return effectiveBuffer[effectiveBuffer.length - 1].value;
    } else if (ranks.has('strongest')) {
        return effectiveBuffer.reduce((strongest, item) => 
            (item.strength || 0) > (strongest.strength || 0) ? item : strongest
        ).value;
    } else if (ranks.has('reduce')) {
        // Use the first available reducer
        const reducers = selection.reducers;
        for (const reducerName of reducers) {
            const reducer = getReducer(reducerName);
            if (reducer) {
                return reducer(effectiveBuffer);
            }
        }
        // Fallback to first if no valid reducer
        return effectiveBuffer[0].value;
    }
    
    // Default fallback
    return effectiveBuffer[0].value;
}; 