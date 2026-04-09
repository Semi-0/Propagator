// CellValueStore — external storage for cell content and strongest,
// with a premise → cell inverse index maintained automatically on every write.
//
// Design rationale: see Propogator/docs/CELL-VALUE-STORE.md
//
// No imports from Cell.ts — this module is a pure data layer.
// Cell.ts imports from here; not the other way around.

import { cell_merge } from "../Cell/Merge";
import { the_nothing, is_contradiction, the_disposed } from "../Cell/CellValue";
import { strongest_value } from "../Cell/StrongestValue";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import {
    get_clock_channels,
    get_vector_clock_layer,
    has_vector_clock_layer,
} from "../AdvanceReactivity/vector_clock";
import { is_premises } from "../DataTypes/Premises";
import { is_better_set } from "generic-handler/built_in_generics/generic_better_set";
import { for_each } from "generic-handler/built_in_generics/generic_collection";

// ---------------------------------------------------------------------------
// Data layout
// ---------------------------------------------------------------------------

type CellValueMetaData = {
    content:          any;          // full TVS (or any CellValue)
    strongest:        any;          // cached result of strongest_value(content)
    premise_channels: Set<string>;  // which premise IDs this cell's content depends on
                                    // (forward index — cached for fast premise_index updates)
}

const empty_metadata = (): CellValueMetaData => ({
    content:          the_nothing,
    strongest:        the_nothing,
    premise_channels: new Set(),
})

// Primary store: one CellValueMetaData per cell, keyed by cell ID
const cell_store: Map<string, CellValueMetaData> = new Map();

// Inverse index: premiseId → Set<cellId> whose content depends on that premise.
// Maintained at module level because it spans all cells.
const premise_index: Map<string, Set<string>> = new Map();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Walk a value (or BetterSet of values) and collect all clock channels
// that are registered premises.
const extract_premise_channels = (value: any): Set<string> => {
    const channels = new Set<string>();

    const collect_from = (element: any) => {
        if (has_vector_clock_layer(element)) {
            const clock = get_vector_clock_layer(element);
            const chs = get_clock_channels(clock);
            for (const ch of chs) {
                if (is_premises(ch)) channels.add(ch);
            }
        }
    };

    if (is_better_set(value)) {
        for_each(value, collect_from);
    } else {
        collect_from(value);
    }

    return channels;
};

// Diff old_channels vs new_channels and patch premise_index accordingly.
const update_premise_index = (
    cellId:       string,
    old_channels: Set<string>,
    new_channels: Set<string>,
): void => {
    // remove cellId from premises that are no longer in content
    for (const ch of old_channels) {
        if (!new_channels.has(ch)) {
            const set = premise_index.get(ch);
            if (set) {
                set.delete(cellId);
                if (set.size === 0) premise_index.delete(ch);
            }
        }
    }
    // add cellId to newly observed premises
    for (const ch of new_channels) {
        if (!old_channels.has(ch)) {
            if (!premise_index.has(ch)) premise_index.set(ch, new Set());
            premise_index.get(ch)!.add(cellId);
        }
    }
};

// ---------------------------------------------------------------------------
// Public combinators
// ---------------------------------------------------------------------------

/** Register a cell in the store on construction. Safe to call multiple times. */
export const init_cell = (cellId: string): void => {
    if (!cell_store.has(cellId)) {
        cell_store.set(cellId, empty_metadata());
    }
};

/** Read raw content (the full TVS or CellValue). */
export const read_content = (cellId: string): any =>
    cell_store.get(cellId)?.content ?? the_nothing;

/** Read the cached strongest value. */
export const read_strongest = (cellId: string): any =>
    cell_store.get(cellId)?.strongest ?? the_nothing;

/**
 * Merge `increment` into the cell's content, then update the premise index.
 * Does NOT recompute strongest — call recompute_strongest separately.
 */
export const write_content = (cellId: string, increment: any): void => {
    const meta     = cell_store.get(cellId) ?? empty_metadata();
    const merged   = cell_merge(meta.content, increment);
    const new_chs  = extract_premise_channels(merged);
    update_premise_index(cellId, meta.premise_channels, new_chs);
    cell_store.set(cellId, {
        content:          merged,
        strongest:        meta.strongest,
        premise_channels: new_chs,
    });
};

/**
 * Recompute strongest_value from current content.
 * If it changed, update the stored strongest and return { changed: true }.
 * The caller (Cell) is responsible for alerting neighbors and handling contradictions.
 */
export const recompute_strongest = (
    cellId: string,
): { new_strongest: any; changed: boolean } => {
    const meta = cell_store.get(cellId);
    if (!meta) return { new_strongest: the_nothing, changed: false };

    const new_strongest = strongest_value(meta.content);
    const changed       = !is_equal(new_strongest, meta.strongest);

    if (changed) {
        cell_store.set(cellId, { ...meta, strongest: new_strongest });
    }

    return { new_strongest, changed };
};

/** Return the set of cellIds whose content currently depends on premiseId. */
export const cells_for_premise = (premiseId: string): Set<string> =>
    new Set(premise_index.get(premiseId) ?? []);

/**
 * Mark a cell as disposed: write the_disposed sentinel to both content and
 * strongest, and clean up premise_index entries. The store entry is kept so
 * that getContent() / getStrongest() correctly return the_disposed.
 */
export const write_disposed = (cellId: string): void => {
    const meta = cell_store.get(cellId) ?? empty_metadata();
    update_premise_index(cellId, meta.premise_channels, new Set());
    cell_store.set(cellId, {
        content:          the_disposed,
        strongest:        the_disposed,
        premise_channels: new Set(),
    });
};

/** Remove a cell from the store entirely (used only by clear_cell_store). */
const remove_cell_from_store = (cellId: string): void => {
    const meta = cell_store.get(cellId);
    if (!meta) return;
    update_premise_index(cellId, meta.premise_channels, new Set());
    cell_store.delete(cellId);
};

/** Reset both maps — used by test suite teardown and CLEAN_UP. */
export const clear_cell_store = (): void => {
    cell_store.clear();
    premise_index.clear();
};
