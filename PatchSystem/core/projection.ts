import { Strategy, Patch, Caps, Rejected } from './types';

export const projectMonotone = (
    current: Strategy,
    caps: Caps | undefined,
    p: Patch
): Patch | Rejected => {
    // Memory widen only
    if (p.memory?.kind === 'count') {
        const cur = current.memory;
        const n   = caps?.memoryMaxN ? Math.min(p.memory.n, caps.memoryMaxN) : p.memory.n;
        if (!cur || cur.kind !== 'count' || n >= cur.n) return { memory: { kind: 'count', n } };
        return { field: 'memory', reason: 'shrink' };
    }
    if (p.memory?.kind === 'time') {
        const cur = current.memory;
        const ms  = p.memory.ms;
        if (!cur || cur.kind !== 'time' || ms >= (cur as any).ms) return { memory: { kind: 'time', ms } };
        return { field: 'memory', reason: 'shrink' };
    }

    // Emit widen only
    if (p.emit?.mode === 'spread') {
        const cur = current.emit;
        if (!cur || cur.mode === 'immediate' || (cur.mode === 'spread' && p.emit.maxPerTick >= cur.maxPerTick))
            return { emit: p.emit };
        return { field: 'emit', reason: 'tighten' };
    }

    // Selection: capability union; enforce reducer allowlist if present
    if (p.selection) {
        if (caps?.allowReducers) {
            const allowed = new Set([...p.selection.reducers].filter(r => caps.allowReducers!.has(r)));
            return { selection: { ranks: new Set(p.selection.ranks), reducers: allowed } };
        }
        return { selection: p.selection };
    }

    // Intake, Channels default to join (monotone)
    return p;
}; 