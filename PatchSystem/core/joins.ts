import type { 
    Join, 
    Memory, 
    Intake, 
    Emit, 
    SelectionCaps, 
    Channels, 
    Strategy, 
    Patch 
} from './types';
import { 
    maxNum, 
    setUnion, 
    recordPointwise, 
    opt
} from './types';

// ---- joins per field ----
export const JMemory: Join<Memory> = {
    join: (a,b) => {
        // If either is undefined, return the other
        if (!a) return b;
        if (!b) return a;
        
        if (a.kind !== b.kind) throw new Error("memory kind mismatch");
        return a.kind === 'count'
            ? { kind: 'count', n: maxNum.join(a.n, (b as { kind: 'count', n: number }).n) }
            : { kind: 'time',  ms: maxNum.join((a as { kind: 'time', ms: number }).ms, (b as { kind: 'time', ms: number }).ms) };
    }
};

export const JIntake: Join<Intake> = {
    join: (a,b) => {
        if (a.key !== b.key) throw new Error("intake key mismatch");
        const Quota = recordPointwise(maxNum);
        return {
            key: a.key,
            quota: Quota.join(a.quota, b.quota),
            // 'strength' dominates 'time'
            order: (a.order === 'strength' || b.order === 'strength') ? 'strength' : (a.order ?? b.order)
        };
    }
};

export const JEmit: Join<Emit> = {
    join: (a,b) => {
        if (a.mode === 'immediate' && b.mode === 'immediate') return a;
        if (a.mode === 'immediate' && b.mode === 'spread')    return b;
        if (b.mode === 'immediate' && a.mode === 'spread')    return a;
        return { mode: 'spread', maxPerTick: maxNum.join((a as { mode: 'spread', maxPerTick: number }).maxPerTick, (b as { mode: 'spread', maxPerTick: number }).maxPerTick) };
    }
};

export const JSel: Join<SelectionCaps> = {
    join: (a,b) => ({
        ranks:    setUnion<'first' | 'last' | 'strongest' | 'reduce'>().join(a.ranks, b.ranks),
        reducers: setUnion<string>().join(a.reducers, b.reducers),
    })
};

export const JChan: Join<Channels> = { 
    join: (a,b) => (a === 'per-tag' || b === 'per-tag') ? 'per-tag' : 'global' 
};

// ---- product join over full Strategy ----
export const JStrategy: Join<Strategy> = {
    join: (a,b) => ({
        memory:    opt(JMemory).join(a.memory,    b.memory),
        intake:    opt(JIntake).join(a.intake,    b.intake),
        emit:      opt(JEmit).join(a.emit,        b.emit),
        selection: opt(JSel).join(a.selection,    b.selection),
        channels:  opt(JChan).join(a.channels,    b.channels),
    })
};

// ---- pure helpers ----
export const joinPatch   = (p: Patch, q: Patch): Patch     => JStrategy.join(p as Strategy, q as Strategy);
export const applyPatch  = (s: Strategy, p: Patch): Strategy => JStrategy.join(s, p as Strategy); 