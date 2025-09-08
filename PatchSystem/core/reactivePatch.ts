import { make_layered_procedure, define_layered_procedure_handler } from "sando-layer/Basic/LayeredProcedure";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { get_base_value, layer_accessor, make_annotation_layer } from "sando-layer/Basic/Layer";
import { register_predicate } from "generic-handler/Predicates";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args, all_match } from "generic-handler/Predicates";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { is_layered_object } from "../../Helper/Predicate";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { generic_merge } from "../../Cell/Merge";
import { strongest_value } from "../../Cell/StrongestValue";
import { cell_strongest } from "../../Cell/Cell";
import { update } from "../../AdvanceReactivity/interface";

// Import reactive layer components
import { 
    traced_timestamp_layer, 
    has_timestamp_layer as _has_timestamp_layer, 
    get_traced_timestamp_layer 
} from "../../AdvanceReactivity/traced_timestamp/TracedTimestampLayer";

// Re-export for convenience
export const has_timestamp_layer = _has_timestamp_layer;
import { 
    annotate_now_with_id, 
    annotate_smallest_time_with_id 
} from "../../AdvanceReactivity/traced_timestamp/Annotater";
import { 
    reactive_merge, 
    reactive_fresh_merge 
} from "../../AdvanceReactivity/traced_timestamp/genericPatch";

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

// Create the patch layer (same as before)
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
        switch (name) {
            case "merge":
                return (base: any, patchContent: CellContent) => {
                    // Apply patch logic here
                    return base;
                };
            case "strongest":
                return (base: any, patchContent: CellContent) => {
                    const effectiveValue = computeEffectiveValue(patchContent.buffer, patchContent.strategy);
                    return effectiveValue !== undefined ? effectiveValue : get_base_value(base);
                };
            default:
                return undefined;
        }
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

export const has_patch_layer = register_predicate("has_patch_layer", 
    (a: any) => is_layered_object(a) && _has_patch_layer(a)
);

// Accessor for patch layer content
export const get_patch_layer = layer_accessor(patch_layer);

// Create layered procedures for patch operations
export const patch_merge = make_layered_procedure("patch_merge", 2, generic_merge);
export const patch_strongest = make_layered_procedure("patch_strongest", 1, strongest_value);

// Helper function to create a reactive patched value
export const reactive_patched = (
    v: any, 
    content: CellContent
): LayeredObject<any> => {
    // First, annotate with timestamp (reactive layer)
    const timestamped = annotate_now_with_id("reactive_patch")(v);
    // Then add patch layer
    return construct_layered_datum(timestamped, patch_layer, content);
};

// Define handlers for layered procedures
define_layered_procedure_handler(patch_merge, patch_layer, 
    (base: any, patchContent: CellContent) => {
        // Handle merge with patch layer
        return base;
    }
);

define_layered_procedure_handler(patch_strongest, patch_layer,
    (base: any, patchContent: CellContent) => {
        const effectiveValue = computeEffectiveValue(patchContent.buffer, patchContent.strategy);
        return effectiveValue !== undefined ? effectiveValue : get_base_value(base);
    }
);

// Define generic procedure handlers for patch layer
define_generic_procedure_handler(to_string, match_args(has_patch_layer), 
    (a: LayeredObject<any>) => {
        const patchContent = get_patch_layer(a);
        const baseValue = get_base_value(a);
        const timestampInfo = has_timestamp_layer(a) ? 
            ` [timestamped: ${to_string(get_traced_timestamp_layer(a))}]` : '';
        return `reactive_patched(${to_string(baseValue)}${timestampInfo}, strategy: ${JSON.stringify(patchContent.strategy)})`;
    }
);

// Reactive Patch System API
export const rps_write = (
    dst: LayeredObject<any>,
    value: any,
    meta: { sourceCellId: string, strength?: number, tag?: string }
): void => {
    const patchContent = get_patch_layer(dst);
    const valueItem: ValueItem = {
        value,
        ts: Date.now(),
        sourceCellId: meta.sourceCellId,
        strength: meta.strength || 1.0,
        tag: meta.tag
    };
    
    patchContent.buffer.push(valueItem);
    
    // Apply memory constraints immediately
    if (patchContent.strategy.memory?.kind === 'count') {
        patchContent.buffer = patchContent.buffer.slice(-patchContent.strategy.memory.n);
    } else if (patchContent.strategy.memory?.kind === 'time') {
        const cutoff = Date.now() - patchContent.strategy.memory.ms;
        patchContent.buffer = patchContent.buffer.filter((item: ValueItem) => item.ts >= cutoff);
    }
    
    // Note: In a layered architecture, we don't directly update the base value
    // The patch layer handles the value management, and the reactive layer
    // provides timestamping information for reactivity
};

export const rps_strategy_extend_memory = (
    cell: LayeredObject<any>,
    memory: Strategy['memory']
): void => {
    const patchContent = get_patch_layer(cell);
    const newStrategy = JStrategy.join(patchContent.strategy, { memory });
    patchContent.strategy = newStrategy;
    
    const lineageEntry: LineageEntry = {
        id: `memory_${Date.now()}` as PatchId,
        origin: 'user' as Origin,
        appliedAt: Date.now(),
        patch: { memory },
        expiresAt: undefined
    };
    patchContent.lineage = addToFrontier(patchContent.lineage, lineageEntry);
};

export const rps_strategy_extend_selection = (
    cell: LayeredObject<any>,
    selection: Strategy['selection']
): void => {
    const patchContent = get_patch_layer(cell);
    const newStrategy = { ...patchContent.strategy, selection };
    patchContent.strategy = newStrategy;
    
    const lineageEntry: LineageEntry = {
        id: `selection_${Date.now()}` as PatchId,
        origin: 'user' as Origin,
        appliedAt: Date.now(),
        patch: { selection },
        expiresAt: undefined
    };
    patchContent.lineage = addToFrontier(patchContent.lineage, lineageEntry);
};

export const rps_strategy_extend_intake = (
    cell: LayeredObject<any>,
    intake: Strategy['intake']
): void => {
    const patchContent = get_patch_layer(cell);
    const newStrategy = JStrategy.join(patchContent.strategy, { intake });
    patchContent.strategy = newStrategy;
    
    const lineageEntry: LineageEntry = {
        id: `intake_${Date.now()}` as PatchId,
        origin: 'user' as Origin,
        appliedAt: Date.now(),
        patch: { intake },
        expiresAt: undefined
    };
    patchContent.lineage = addToFrontier(patchContent.lineage, lineageEntry);
};

export const rps_strategy_extend_emit = (
    cell: LayeredObject<any>,
    emit: Strategy['emit']
): void => {
    const patchContent = get_patch_layer(cell);
    const newStrategy = JStrategy.join(patchContent.strategy, { emit });
    patchContent.strategy = newStrategy;
    
    const lineageEntry: LineageEntry = {
        id: `emit_${Date.now()}` as PatchId,
        origin: 'user' as Origin,
        appliedAt: Date.now(),
        patch: { emit },
        expiresAt: undefined
    };
    patchContent.lineage = addToFrontier(patchContent.lineage, lineageEntry);
};

export const rps_strategy_extend_channels = (
    cell: LayeredObject<any>,
    channels: Strategy['channels']
): void => {
    const patchContent = get_patch_layer(cell);
    const newStrategy = JStrategy.join(patchContent.strategy, { channels });
    patchContent.strategy = newStrategy;
    
    const lineageEntry: LineageEntry = {
        id: `channels_${Date.now()}` as PatchId,
        origin: 'user' as Origin,
        appliedAt: Date.now(),
        patch: { channels },
        expiresAt: undefined
    };
    patchContent.lineage = addToFrontier(patchContent.lineage, lineageEntry);
};

// Helper functions for accessing reactive patch content
export const rps_buffer = (cell: LayeredObject<any>): ValueItem[] => {
    const patchContent = get_patch_layer(cell);
    return patchContent.buffer;
};

export const rps_strategy = (cell: LayeredObject<any>): Strategy => {
    const patchContent = get_patch_layer(cell);
    return patchContent.strategy;
};

export const rps_lineage = (cell: LayeredObject<any>): PatchFrontier => {
    const patchContent = get_patch_layer(cell);
    return patchContent.lineage;
};

export const rps_effective = (cell: LayeredObject<any>): any => {
    const patchContent = get_patch_layer(cell);
    return computeEffectiveValue(patchContent.buffer, patchContent.strategy);
};

export const rps_strongest = (cell: LayeredObject<any>): any => {
    const patchContent = get_patch_layer(cell);
    return computeEffectiveValue(patchContent.buffer, patchContent.strategy);
};

// Get reactive timestamp information
export const rps_timestamp = (cell: LayeredObject<any>): any => {
    const baseValue = get_base_value(cell);
    if (has_timestamp_layer(baseValue)) {
        return get_traced_timestamp_layer(baseValue);
    }
    return undefined;
};

// Check if value is fresh (reactive concept)
export const rps_is_fresh = (cell: LayeredObject<any>): boolean => {
    const baseValue = get_base_value(cell);
    if (has_timestamp_layer(baseValue)) {
        // Import the is_fresh function from AdvanceReactivity
        const { _is_fresh } = require("../../AdvanceReactivity/traced_timestamp/Predicates");
        return _is_fresh(get_traced_timestamp_layer(baseValue));
    }
    return false;
};

// Create a reactive patched cell from a regular cell
export const create_reactive_patched_cell = (baseCell: any, initialContent?: Partial<CellContent>): LayeredObject<any> => {
    const defaultContent: CellContent = {
        buffer: [],
        strategy: {},
        lineage: createEmptyFrontier(),
        caps: undefined
    };
    
    const content = { ...defaultContent, ...initialContent };
    
    // Create a timestamped version of the base cell
    const timestampedCell = annotate_now_with_id("reactive_patch_init")(baseCell);
    
    // Wrap with patch layer
    return reactive_patched(timestampedCell, content);
};

// Create a reactive patched cell with initial timestamp
export const create_reactive_patched_cell_with_timestamp = (
    baseValue: any, 
    cellId: string,
    initialContent?: Partial<CellContent>
): LayeredObject<any> => {
    const defaultContent: CellContent = {
        buffer: [],
        strategy: {},
        lineage: createEmptyFrontier(),
        caps: undefined
    };
    
    const content = { ...defaultContent, ...initialContent };
    
    // Create a timestamped version with the cell ID
    const timestampedValue = annotate_now_with_id(cellId)(baseValue);
    
    // Wrap with patch layer
    return reactive_patched(timestampedValue, content);
}; 