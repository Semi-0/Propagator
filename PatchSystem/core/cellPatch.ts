import { add_cell_content, cell_id, construct_cell, cell_strongest, cell_content } from "@/cell/Cell";
import { update } from "../../AdvanceReactivity/interface";
import { annotate_now_with_id } from "../../AdvanceReactivity/traced_timestamp/Annotater";
import { traced_timestamp_layer, has_timestamp_layer, get_traced_timestamp_layer } from "../../AdvanceReactivity/traced_timestamp/TracedTimestampLayer";
import { make_annotation_layer, layer_accessor, get_base_value } from "sando-layer/Basic/Layer";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { register_predicate } from "generic-handler/Predicates";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args } from "generic-handler/Predicates";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { define_handler, generic_merge } from "../../Cell/Merge";
import { strongest_value } from "../../Cell/StrongestValue";
import { reactive_merge } from "../../AdvanceReactivity/traced_timestamp/genericPatch";

import type { 
    Strategy, 
    Patch, 
    PatchId, 
    Origin, 
    LineageEntry, 
    PatchFrontier,
    Caps,
    ValueItem,
    CellContent
} from './types';
import { JStrategy, joinPatch } from './joins';
import { projectMonotone } from './projection';
import { addToFrontier, createEmptyFrontier } from './lineage';
import { computeEffectiveValue } from './reducers';
import type { Cell } from "@/cell/Cell";

// Create the patch layer for cell content (following TracedTimestampLayer pattern)
export const patch_layer = make_annotation_layer<CellContent, any>("patch", (
    get_name: () => string,
    has_value: (object: any) => boolean,
    get_value: (object: any) => any,
    summarize_self: () => string[]
) => {
    function get_default_value(): CellContent {
        return {
            buffer: [],
            strategy: {},
            lineage: createEmptyFrontier(),
            caps: undefined
        };
    }

    function get_procedure(name: string, arity: number): any | undefined {
        // Return a procedure that handles merge operations
        return (base: any, ...values: any[]) => {
            // For now, just return the base value
            // In a full implementation, this would merge patch content
            return base;
        };
    }

    return {
        get_name,
        has_value,
        get_value,
        get_default_value,
        get_procedure,
        summarize_self,
    };
});

// Predicate to check if an object has a patch layer
export function _has_patch_layer(a: any): boolean {
    return a && patch_layer.has_value(a);
}

export const has_patch_layer = register_predicate("has_patch_layer", _has_patch_layer);

// Accessor for patch layer content
export const get_patch_layer = layer_accessor(patch_layer);

// Define generic procedure handlers for patch layer
define_generic_procedure_handler(to_string, match_args(has_patch_layer), 
    (a: any) => {
        const patchContent = get_patch_layer(a);
        return `patched_content(strategy: ${JSON.stringify(patchContent.strategy)})`;
    }
);

// Internal storage for patched cells (following the pattern from AdvanceReactivity)
const patchedCells = new Map<string, CellContent>();

// Helper to get or create cell content
const getCellContent = (cell: Cell<any>): CellContent => {
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

// Cell-based Patch System API
export const cps_write = (
    dst: Cell<any>, 
    value: any,
    meta: { sourceCellId: string, strength?: number, tag?: string }
): void => {
    const content = getCellContent(dst);
    const valueItem: ValueItem = {
        value,
        ts: Date.now(),
        sourceCellId: meta.sourceCellId,
        strength: meta.strength || 1.0,
        tag: meta.tag
    };
    
    content.buffer.push(valueItem);
    
    // Apply memory constraints immediately
    if (content.strategy.memory?.kind === 'count') {
        content.buffer = content.buffer.slice(-content.strategy.memory.n);
    } else if (content.strategy.memory?.kind === 'time') {
        const cutoff = Date.now() - content.strategy.memory.ms;
        content.buffer = content.buffer.filter((item: ValueItem) => item.ts >= cutoff);
    }
    
    updateCellContent(dst, content);
    
    // Compute and emit effective value using reactive update
    const effectiveValue = computeEffectiveValue(content.buffer, content.strategy);
    if (effectiveValue !== undefined) {
        // Use existing update function which handles reactive layer
        update(dst, effectiveValue);
    }
};

export const cps_strategy_extend_memory = (
    cell: Cell<any>,
    memory: Strategy['memory']
): void => {
    const content = getCellContent(cell);
    const newStrategy = JStrategy.join(content.strategy, { memory });
    content.strategy = newStrategy;
    
    const lineageEntry: LineageEntry = {
        id: `memory_${Date.now()}` as PatchId,
        origin: 'user' as Origin,
        appliedAt: Date.now(),
        patch: { memory },
        expiresAt: undefined
    };
    content.lineage = addToFrontier(content.lineage, lineageEntry);
    
    updateCellContent(cell, content);
};

export const cps_strategy_extend_selection = (
    cell: Cell<any>,
    selection: Strategy['selection']
): void => {
    const content = getCellContent(cell);
    const newStrategy = { ...content.strategy, selection };
    content.strategy = newStrategy;
    
    const lineageEntry: LineageEntry = {
        id: `selection_${Date.now()}` as PatchId,
        origin: 'user' as Origin,
        appliedAt: Date.now(),
        patch: { selection },
        expiresAt: undefined
    };
    content.lineage = addToFrontier(content.lineage, lineageEntry);
    
    updateCellContent(cell, content);
};

export const cps_strategy_extend_intake = (
    cell: Cell<any>,
    intake: Strategy['intake']
): void => {
    const content = getCellContent(cell);
    const newStrategy = JStrategy.join(content.strategy, { intake });
    content.strategy = newStrategy;
    
    const lineageEntry: LineageEntry = {
        id: `intake_${Date.now()}` as PatchId,
        origin: 'user' as Origin,
        appliedAt: Date.now(),
        patch: { intake },
        expiresAt: undefined
    };
    content.lineage = addToFrontier(content.lineage, lineageEntry);
    
    updateCellContent(cell, content);
};

export const cps_strategy_extend_emit = (
    cell: Cell<any>,
    emit: Strategy['emit']
): void => {
    const content = getCellContent(cell);
    const newStrategy = JStrategy.join(content.strategy, { emit });
    content.strategy = newStrategy;
    
    const lineageEntry: LineageEntry = {
        id: `emit_${Date.now()}` as PatchId,
        origin: 'user' as Origin,
        appliedAt: Date.now(),
        patch: { emit },
        expiresAt: undefined
    };
    content.lineage = addToFrontier(content.lineage, lineageEntry);
    
    updateCellContent(cell, content);
};

export const cps_strategy_extend_channels = (
    cell: Cell<any>,
    channels: Strategy['channels']
): void => {
    const content = getCellContent(cell);
    const newStrategy = JStrategy.join(content.strategy, { channels });
    content.strategy = newStrategy;
    
    const lineageEntry: LineageEntry = {
        id: `channels_${Date.now()}` as PatchId,
        origin: 'user' as Origin,
        appliedAt: Date.now(),
        patch: { channels },
        expiresAt: undefined
    };
    content.lineage = addToFrontier(content.lineage, lineageEntry);
    
    updateCellContent(cell, content);
};

// Helper functions for accessing cell patch content
export const cps_buffer = (cell: Cell<any>): ValueItem[] => {
    const content = getCellContent(cell);
    return content.buffer;
};

export const cps_strategy = (cell: Cell<any>): Strategy => {
    const content = getCellContent(cell);
    return content.strategy;
};

export const cps_lineage = (cell: Cell<any>): PatchFrontier => {
    const content = getCellContent(cell);
    return content.lineage;
};

export const cps_effective = (cell: Cell<any>): any => {
    const content = getCellContent(cell);
    return computeEffectiveValue(content.buffer, content.strategy);
};

// Create a patched cell that works with existing propagators
export const create_patched_cell = (name: string, initialValue?: any): Cell<any> => {
    const cell = construct_cell(name);
    
    if (initialValue !== undefined) {
        // Use existing update function which handles reactive layer
        update(cell, initialValue);
    }
    
    // Initialize patch content separately
    getCellContent(cell);
    
    return cell;
};

// Helper functions for easier testing and access
export const get_buffer_value = (cell: Cell<any>): ValueItem[] => {
    return cps_buffer(cell);
};

export const get_strategy_value = (cell: Cell<any>): Strategy => {
    return cps_strategy(cell);
};

export const get_effective_value = (cell: Cell<any>): any => {
    return cps_effective(cell);
};

// Integration with existing cell operations
export const cps_strongest = (cell: Cell<any>): any => {
    // Use the existing cell_strongest which works with reactive layer
    const strongestValue = cell_strongest(cell);
    
    // If the cell has patch content, compute effective value
    const content = getCellContent(cell);
    if (content.buffer.length > 0) {
        return computeEffectiveValue(content.buffer, content.strategy);
    }
    
    // Otherwise return the strongest value from the cell
    return strongestValue;
}; 