import type { Cell } from "../../Cell/Cell";
import { construct_cell, cell_id } from "../../Cell/Cell";
import { update, r_constant } from "../../AdvanceReactivity/interface";
import type { 
    Strategy, 
    CellContent, 
    ValueItem, 
    LineageEntry, 
    Caps,
    Memory,
    Intake,
    Emit,
    SelectionCaps
} from "../core/types";
import { 
    applyPatch, 
    projectMonotone, 
    addToFrontier, 
    createEmptyFrontier 
} from "../core";
import { getReducer } from "../core/reducers";
import { v4 as uuidv4 } from 'uuid';

// Internal storage for patched cells
const patchedCells = new Map<string, CellContent>();

// Helper to get or create cell content
const getCellContent = (cell: Cell<any>): CellContent => {
    // Use the cell's unique ID
    const id = cell_id(cell);
    if (!patchedCells.has(id)) {
        patchedCells.set(id, {
            buffer: [],
            strategy: {},
            lineage: createEmptyFrontier(),
            caps: undefined
        });
    }
    return patchedCells.get(id)!;
};

// Helper to update cell content
const updateCellContent = (cell: Cell<any>, content: CellContent): void => {
    patchedCells.set(cell_id(cell), content);
};

// Helper to apply strategy and compute effective value
const computeEffectiveValue = (content: CellContent): any => {
    const { buffer, strategy } = content;
    
    if (buffer.length === 0) return undefined;
    
    // Apply memory constraints
    let filteredBuffer = buffer;
    if (strategy.memory?.kind === 'count') {
        filteredBuffer = buffer.slice(-strategy.memory.n);
    } else if (strategy.memory?.kind === 'time') {
        const cutoff = Date.now() - strategy.memory.ms;
        filteredBuffer = buffer.filter(item => item.ts >= cutoff);
    }
    
    if (filteredBuffer.length === 0) return undefined;
    
    // Apply selection strategy
    if (!strategy.selection || strategy.selection.ranks.size === 0) {
        // Default to first
        return filteredBuffer[0].value;
    }
    
    const ranks = Array.from(strategy.selection.ranks);
    
    // Handle different ranks
    if (ranks.includes('first')) {
        return filteredBuffer[0].value;
    }
    
    if (ranks.includes('last')) {
        return filteredBuffer[filteredBuffer.length - 1].value;
    }
    
    if (ranks.includes('strongest')) {
        const strongest = filteredBuffer.reduce((max, item) => 
            (item.strength || 0) > (max.strength || 0) ? item : max
        );
        return strongest.value;
    }
    
    if (ranks.includes('reduce') && strategy.selection.reducers.size > 0) {
        // Use the first available reducer
        const reducerName = Array.from(strategy.selection.reducers)[0];
        const reducer = getReducer(reducerName);
        if (reducer) {
            return reducer(filteredBuffer);
        }
    }
    
    // Fallback to first
    return filteredBuffer[0].value;
};

// Simplified CE-style APIs
export const ce_write = (
    dst: Cell<any>, 
    value: any,
    meta: { sourceCellId: string, strength?: number, tag?: string }
): void => {
    const content = getCellContent(dst);
    const valueItem: ValueItem = {
        value: value,
        ts: Date.now(),
        sourceCellId: meta.sourceCellId,
        strength: meta.strength,
        tag: meta.tag
    };
    
    // Add to buffer
    content.buffer.push(valueItem);
    
    // Apply memory constraints immediately
    if (content.strategy.memory?.kind === 'count') {
        content.buffer = content.buffer.slice(-content.strategy.memory.n);
    } else if (content.strategy.memory?.kind === 'time') {
        const cutoff = Date.now() - content.strategy.memory.ms;
        content.buffer = content.buffer.filter(item => item.ts >= cutoff);
    }
    
    // Apply intake constraints if any
    if (content.strategy.intake) {
        const { key, quota } = content.strategy.intake;
        const keyValue = key === 'source' ? valueItem.sourceCellId : valueItem.tag;
        if (keyValue && quota[keyValue]) {
            // Keep only the last N items from this source/tag
            const maxItems = quota[keyValue];
            const itemsFromSource = content.buffer.filter(item => 
                (key === 'source' ? item.sourceCellId : item.tag) === keyValue
            );
            if (itemsFromSource.length > maxItems) {
                // Remove oldest items from this source
                const toRemove = itemsFromSource.slice(0, itemsFromSource.length - maxItems);
                content.buffer = content.buffer.filter(item => !toRemove.includes(item));
            }
        }
    }
    
    // Sort by order if specified
    if (content.strategy.intake?.order === 'strength') {
        content.buffer.sort((a, b) => (b.strength || 0) - (a.strength || 0));
    }
    
    updateCellContent(dst, content);
    
    // Compute and emit effective value
    const effectiveValue = computeEffectiveValue(content);
    if (effectiveValue !== undefined) {
        update(dst, effectiveValue);
    }
};

export const ce_strategy_extend_memory = (cell: Cell<any>, patch: Memory): void => {
    const content = getCellContent(cell);
    const projected = projectMonotone(content.strategy, content.caps, { memory: patch });
    
    if ('field' in projected) {
        throw new Error(`Patch rejected: ${projected.field} - ${projected.reason}`);
    }
    
    const newStrategy = applyPatch(content.strategy, projected);
    content.strategy = newStrategy;
    
    const lineageEntry: LineageEntry = {
        id: uuidv4(),
        appliedAt: Date.now(),
        patch: projected
    };
    
    content.lineage = addToFrontier(content.lineage, lineageEntry);
    updateCellContent(cell, content);
};

export const ce_strategy_extend_intake = (cell: Cell<any>, patch: Intake): void => {
    const content = getCellContent(cell);
    const projected = projectMonotone(content.strategy, content.caps, { intake: patch });
    
    if ('field' in projected) {
        throw new Error(`Patch rejected: ${projected.field} - ${projected.reason}`);
    }
    
    const newStrategy = applyPatch(content.strategy, projected);
    content.strategy = newStrategy;
    
    const lineageEntry: LineageEntry = {
        id: uuidv4(),
        appliedAt: Date.now(),
        patch: projected
    };
    
    content.lineage = addToFrontier(content.lineage, lineageEntry);
    updateCellContent(cell, content);
};

export const ce_strategy_extend_selection = (cell: Cell<any>, patch: SelectionCaps): void => {
    const content = getCellContent(cell);
    
    // For selection, we want to replace rather than join to avoid conflicts
    const newStrategy = {
        ...content.strategy,
        selection: patch
    };
    
    content.strategy = newStrategy;
    
    const lineageEntry: LineageEntry = {
        id: uuidv4(),
        appliedAt: Date.now(),
        patch: { selection: patch }
    };
    
    content.lineage = addToFrontier(content.lineage, lineageEntry);
    updateCellContent(cell, content);
};

export const ce_strategy_extend_emit = (cell: Cell<any>, patch: Emit): void => {
    const content = getCellContent(cell);
    const projected = projectMonotone(content.strategy, content.caps, { emit: patch });
    
    if ('field' in projected) {
        throw new Error(`Patch rejected: ${projected.field} - ${projected.reason}`);
    }
    
    const newStrategy = applyPatch(content.strategy, projected);
    content.strategy = newStrategy;
    
    const lineageEntry: LineageEntry = {
        id: uuidv4(),
        appliedAt: Date.now(),
        patch: projected
    };
    
    content.lineage = addToFrontier(content.lineage, lineageEntry);
    updateCellContent(cell, content);
};

// Read views
export const ce_effective = (cell: Cell<any>): Cell<any> => {
    const content = getCellContent(cell);
    const effectiveValue = computeEffectiveValue(content);
    return r_constant(effectiveValue);
};

export const ce_buffer = (cell: Cell<any>): Cell<ValueItem[]> => {
    const content = getCellContent(cell);
    return r_constant(content.buffer);
};

export const ce_strategy = (cell: Cell<any>): Cell<Strategy> => {
    const content = getCellContent(cell);
    return r_constant(content.strategy);
};

export const ce_lineage = (cell: Cell<any>): Cell<any> => {
    const content = getCellContent(cell);
    return r_constant(content.lineage);
};

// Helper to get actual values from cells (for testing)
export const get_buffer_value = (cell: Cell<any>): ValueItem[] => {
    const content = getCellContent(cell);
    return content.buffer;
};

export const get_strategy_value = (cell: Cell<any>): Strategy => {
    const content = getCellContent(cell);
    return content.strategy;
};

export const get_effective_value = (cell: Cell<any>): any => {
    const content = getCellContent(cell);
    return computeEffectiveValue(content);
};

// Utility functions
export const create_patched_cell = <T>(name?: string): Cell<T> => {
    const cell = construct_cell<T>(name || `patched_cell_${uuidv4()}`);
    // Initialize with empty content
    getCellContent(cell);
    return cell;
};

export const set_cell_caps = (cell: Cell<any>, caps: Caps): void => {
    const content = getCellContent(cell);
    content.caps = caps;
    updateCellContent(cell, content);
}; 