// ---- join infrastructure ----
export interface Join<A> { 
    join(a: A, b: A): A 
}

export const maxNum: Join<number> = { 
    join: (a,b) => a > b ? a : b 
};

export const setUnion = <T>(): Join<Set<T>> => ({ 
    join: (a,b) => new Set([...a, ...b]) 
});

export const recordPointwise = <V>(V: Join<V>): Join<Record<string,V>> => ({
    join: (a,b) => { 
        const out = { ...a };
        for (const k of Object.keys(b)) {
            out[k] = k in out ? V.join(out[k], b[k]) : b[k];
        }
        return out;
    }
});

export const opt = <A>(J: Join<A>): Join<A|undefined> => ({
    join: (a,b) => a === undefined ? b : (b === undefined ? a : J.join(a,b))
});

// ---- domain: strategy fields ----
export type Memory =
    | { kind: 'count', n: number }    // keep last n items
    | { kind: 'time',  ms: number };  // keep last ms window

export type Intake = {
    key: 'source' | 'tag';
    quota: Record<string, number>;    // per source/tag limits (point-wise max)
    order?: 'time' | 'strength';      // merge ordering hint
};

export type Emit =
    | { mode: 'immediate' }           // emit as soon as effective changes
    | { mode: 'spread', maxPerTick: number }; // serialize bursts (widen by max)

export type Rank = 'first' | 'last' | 'strongest' | 'reduce';
export type SelectionCaps = {
    ranks: Set<Rank>;                 // capability set (union)
    reducers: Set<string>;            // allowed reducers if 'reduce' (union)
};

export type Channels = 'global' | 'per-tag';

// ---- full cell strategy ----
export type Strategy = {
    memory?:    Memory;
    intake?:    Intake;
    emit?:      Emit;
    selection?: SelectionCaps;
    channels?:  Channels;
};

// A patch is just a partial Strategy
export type Patch = Partial<Strategy>;

// ---- lineage types ----
export type PatchId = string;
export type Origin = { layerId?: string; tag?: string };

export type LineageEntry = {
    id: PatchId;
    origin?: Origin;
    appliedAt: number;         // logical time
    patch: Patch;
    expiresAt?: number;        // optional lease/TTL
};

export type PatchFrontier = {
    entries: LineageEntry[];   // can be compacted by dominance (e.g., max windows)
};

// ---- governance types ----
export type Caps = {
    memoryMaxN?: number;             // clamp count windows
    allowReducers?: Set<string>;     // whitelist of reducers
};

export type Rejected = { field: string; reason: string };

// ---- value item types for cell content ----
export type ValueItem<T=any> = { 
    value: T, 
    ts: number, 
    sourceCellId?: string, 
    strength?: number, 
    tag?: string 
};

export type CellContent = {
    buffer: ValueItem[];      // bounded by strategy.memory
    strategy: Strategy;       // joined state (the "policy" inside cell)
    lineage: PatchFrontier;   // applied patches
    caps?: Caps;              // governance caps (projector uses this)
}; 