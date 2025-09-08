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

// Create the patch layer
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
        // Define how patch layer handles different procedures
        switch (name) {
            case "merge":
                return (base: any, increment: any) => {
                    const patchContent = get_value(base);
                    // Apply patch logic here
                    return base;
                };
            case "strongest":
                return (base: any) => {
                    const patchContent = get_value(base);
                    return computeEffectiveValue(patchContent.buffer, patchContent.strategy);
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

// Helper function to create a patched value
export const patched = (
    v: any, 
    content: CellContent
): LayeredObject<any> => construct_layered_datum(v, patch_layer, content);

// Define handlers for layered procedures
define_layered_procedure_handler(patch_merge, patch_layer, 
    (base: any, patchContent: CellContent) => {
        // Handle merge with patch layer
        return base;
    }
);

define_layered_procedure_handler(patch_strongest, patch_layer,
    (base: any, patchContent: CellContent) => {
        // Return the effective value computed from patch content
        const effectiveValue = computeEffectiveValue(patchContent.buffer, patchContent.strategy);
        return effectiveValue !== undefined ? effectiveValue : get_base_value(base);
    }
);

// Define generic procedure handlers for patch layer
define_generic_procedure_handler(to_string, match_args(has_patch_layer), 
    (a: LayeredObject<any>) => {
        const patchContent = get_patch_layer(a);
        return `patched(${to_string(get_base_value(a))}, strategy: ${JSON.stringify(patchContent.strategy)})`;
    }
);

// Patch System API using layered procedures
export const ps_write = (
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
    
    // Update the base value
    update(get_base_value(dst), value);
};

export const ps_strategy_extend_memory = (
    cell: LayeredObject<any>,
    memory: Strategy['memory']
): void => {
    const patchContent = get_patch_layer(cell);
    const newStrategy = JStrategy.join(patchContent.strategy, { memory });
    patchContent.strategy = newStrategy;
    
    // Add to lineage
    const lineageEntry: LineageEntry = {
        id: `memory_${Date.now()}` as PatchId,
        origin: 'user' as Origin,
        appliedAt: Date.now(),
        patch: { memory },
        expiresAt: undefined
    };
    patchContent.lineage = addToFrontier(patchContent.lineage, lineageEntry);
};

export const ps_strategy_extend_selection = (
    cell: LayeredObject<any>,
    selection: Strategy['selection']
): void => {
    const patchContent = get_patch_layer(cell);
    const newStrategy = { ...patchContent.strategy, selection };
    patchContent.strategy = newStrategy;
    
    // Add to lineage
    const lineageEntry: LineageEntry = {
        id: `selection_${Date.now()}` as PatchId,
        origin: 'user' as Origin,
        appliedAt: Date.now(),
        patch: { selection },
        expiresAt: undefined
    };
    patchContent.lineage = addToFrontier(patchContent.lineage, lineageEntry);
};

export const ps_strategy_extend_intake = (
    cell: LayeredObject<any>,
    intake: Strategy['intake']
): void => {
    const patchContent = get_patch_layer(cell);
    const newStrategy = JStrategy.join(patchContent.strategy, { intake });
    patchContent.strategy = newStrategy;
    
    // Add to lineage
    const lineageEntry: LineageEntry = {
        id: `intake_${Date.now()}` as PatchId,
        origin: 'user' as Origin,
        appliedAt: Date.now(),
        patch: { intake },
        expiresAt: undefined
    };
    patchContent.lineage = addToFrontier(patchContent.lineage, lineageEntry);
};

export const ps_strategy_extend_emit = (
    cell: LayeredObject<any>,
    emit: Strategy['emit']
): void => {
    const patchContent = get_patch_layer(cell);
    const newStrategy = JStrategy.join(patchContent.strategy, { emit });
    patchContent.strategy = newStrategy;
    
    // Add to lineage
    const lineageEntry: LineageEntry = {
        id: `emit_${Date.now()}` as PatchId,
        origin: 'user' as Origin,
        appliedAt: Date.now(),
        patch: { emit },
        expiresAt: undefined
    };
    patchContent.lineage = addToFrontier(patchContent.lineage, lineageEntry);
};

export const ps_strategy_extend_channels = (
    cell: LayeredObject<any>,
    channels: Strategy['channels']
): void => {
    const patchContent = get_patch_layer(cell);
    const newStrategy = JStrategy.join(patchContent.strategy, { channels });
    patchContent.strategy = newStrategy;
    
    // Add to lineage
    const lineageEntry: LineageEntry = {
        id: `channels_${Date.now()}` as PatchId,
        origin: 'user' as Origin,
        appliedAt: Date.now(),
        patch: { channels },
        expiresAt: undefined
    };
    patchContent.lineage = addToFrontier(patchContent.lineage, lineageEntry);
};

// Helper functions for accessing patch content
export const ps_buffer = (cell: LayeredObject<any>): ValueItem[] => {
    const patchContent = get_patch_layer(cell);
    return patchContent.buffer;
};

export const ps_strategy = (cell: LayeredObject<any>): Strategy => {
    const patchContent = get_patch_layer(cell);
    return patchContent.strategy;
};

export const ps_lineage = (cell: LayeredObject<any>): PatchFrontier => {
    const patchContent = get_patch_layer(cell);
    return patchContent.lineage;
};

export const ps_strongest = (cell: LayeredObject<any>): any => {
    const patchContent = get_patch_layer(cell);
    return computeEffectiveValue(patchContent.buffer, patchContent.strategy);
};

export const ps_effective = (cell: LayeredObject<any>): any => {
    const patchContent = get_patch_layer(cell);
    return computeEffectiveValue(patchContent.buffer, patchContent.strategy);
};

// Create a patched cell from a regular cell
export const create_patched_cell = (baseCell: any, initialContent?: Partial<CellContent>): LayeredObject<any> => {
    const defaultContent: CellContent = {
        buffer: [],
        strategy: {},
        lineage: createEmptyFrontier(),
        caps: undefined
    };
    
    const content = { ...defaultContent, ...initialContent };
    return patched(baseCell, content);
}; 