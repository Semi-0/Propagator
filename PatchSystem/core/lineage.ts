import { PatchFrontier, LineageEntry, PatchId } from './types';

export const addToFrontier = (F: PatchFrontier, e: LineageEntry): PatchFrontier => { 
    F.entries.push(e); 
    return F; 
};

export const revokeFromFrontier = (F: PatchFrontier, id: PatchId): PatchFrontier => ({
    entries: F.entries.filter(x => x.id !== id)
});

export const createEmptyFrontier = (): PatchFrontier => ({
    entries: []
});

export const getActivePatches = (F: PatchFrontier): LineageEntry[] => {
    const now = Date.now();
    return F.entries.filter(entry => 
        !entry.expiresAt || entry.expiresAt > now
    );
};

export const compactFrontier = (F: PatchFrontier): PatchFrontier => {
    // Simple compaction: remove expired entries
    const now = Date.now();
    return {
        entries: F.entries.filter(entry => 
            !entry.expiresAt || entry.expiresAt > now
        )
    };
}; 