/**
 * @fileoverview PatchedValueSet Module
 *
 * A ContentPatch-based value set implementation for managing layered object collections
 * with support for applying transformations (join, remove) from different layers.
 *
 * Key Design Principles:
 * - Uses immutable patches to track changes across layers
 * - Supports composition of patches from multiple layers
 * - Prevents duplicate entries by identifying existing elements
 * - Uses BetterSet for efficient O(1) element operations
 *
 * Architecture:
 * ContentPatch System:
 *   - patch_join: Adds a new element to the set
 *   - patch_remove: Removes an existing element from the set
 *
 * Scanning for Patches:
 *   - scan_for_patches(): Analyzes new element against content
 *   - Determines if element should replace, join, or be rejected
 *   - Uses base_value_implies and support layer strength comparison
 *
 * Applying Patches:
 *   - apply_content_patch(): Executes collected patches sequentially
 *   - Maintains set consistency through order-independent operations
 */

import { is_layered_object, type LayeredObject } from "sando-layer/Basic/LayeredObject";
import { find, reduce, add_item, remove_item, filter, length, to_array } from "generic-handler/built_in_generics/generic_collection";
import { BetterSet, construct_better_set, is_better_set } from "generic-handler/built_in_generics/generic_better_set";
import { layer_pair_value, layer_pair_layer } from "sando-layer/Basic/helper";
import { support_layer } from "sando-layer/Specified/SupportLayer";
import { get_base_value, is_base_layer, type Layer } from "sando-layer/Basic/Layer";
import { construct_layered_consolidator, define_consolidator_per_layer_dispatcher, exclude_base_layer } from "sando-layer/Basic/LayeredCombinators";
import { match_args, register_predicate } from "generic-handler/Predicates";
import { log_tracer } from "generic-handler/built_in_generics/generic_debugger";
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { is_nothing, is_unusable_value } from "@/cell/CellValue";
import { pipe } from "fp-ts/lib/function";
import { base_value_implies, strongest_consequence, supported_value_less_than_or_equal } from "./ValueSet";
import { identify_by } from "generic-handler/built_in_generics/generic_better_set";
import { compose } from "generic-handler/built_in_generics/generic_combinator.ts";
import { define_generic_propagator_handler } from "../GenericPropagator/generic_propagator";
import { strongest_value } from "@/cell/StrongestValue";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { throw_error } from "generic-handler/built_in_generics/other_generic_helper";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { is_map } from "../Helper/Helper";
import { generic_merge } from "ppropogator";
import { is_any } from "generic-handler/built_in_generics/generic_predicates";

/**
 * @type {BetterSet} PatchedSet - Type alias for a set of ContentPatches
 *
 * Represents a collection of patches to be applied to a value set.
 * Uses BetterSet for efficient operations.
 */
export type PatchedSet = BetterSet<LayeredObject<any>>

/**
 * @typedef {Object} ContentPatch
 * @property {"join" | "remove"} type - Type of patch operation
 * @property {LayeredObject<any>} index_elt - The element act as index affected by the patch
 *
 * Represents an atomic operation on a value set.
 * - join: Add element if not already present (or update if more informative)
 * - remove: Remove element from the set
 */
export type ContentPatch = {
    type: "join" | "remove" ;
    index_elt: LayeredObject<any>;
}

/**
 * Extracts the operation type from a ContentPatch
 * @param {ContentPatch} a - The patch to examine
 * @returns {string} The type of operation ("join" or "remove")
 */
export const type_of_content_patch = (a: ContentPatch) => a.type

/**
 * Extracts the element from a ContentPatch
 * @param {ContentPatch} a - The patch to examine
 * @returns {LayeredObject<any>} The element affected by the patch
 */
export const content_patch_elt = (a: ContentPatch) => a.index_elt

/**
 * Predicate to identify valid ContentPatches
 * @param {any} a - Value to test
 * @returns {boolean} True if value is a valid ContentPatch
 */
export const is_content_patch = register_predicate("is_content_patch", (a: any) => 
    a && a.type !== undefined && a.index_elt !== undefined
)

/**
 * Registers identity function for ContentPatches
 * Combines patch type and element identifier for uniqueness
 */
define_generic_procedure_handler(
    identify_by, 
    match_args(is_content_patch), 
    (a: ContentPatch) => type_of_content_patch(a) + identify_by(content_patch_elt(a))
)

/**
 * Creates a "join" patch - adds element to set
 *
 * @param {LayeredObject<any>} new_elt - Element to add
 * @returns {ContentPatch} Join patch
 *
 * @example
 * const patch = patch_join(layeredValue);
 * // Returns { type: "join", elt: layeredValue }
 */
export const patch_join : (new_elt: LayeredObject<any>) => ContentPatch = (new_elt: LayeredObject<any>) => {
    return {
        type: "join",
        index_elt: get_base_value(new_elt)
    }
}

/**
 * Creates a "remove" patch - removes element from set
 *
 * @param {LayeredObject<any>} existed - Element to remove
 * @returns {ContentPatch} Remove patch
 *
 * @example
 * const patch = patch_remove(oldValue);
 * // Returns { type: "remove", elt: oldValue }
 */
export const patch_remove : (existed: LayeredObject<any>) => ContentPatch = (existed: LayeredObject<any>) => {
    return {
        type: "remove",
        index_elt: get_base_value(existed)
    }
}

/**
 * Merges patches from different layers into accumulated result
 *
 * @param {BetterSet<ContentPatch>} a - Accumulated patches
 * @param {[Layer<any>, BetterSet<ContentPatch>]} layer_pair - Layer and its patches
 * @returns {BetterSet<ContentPatch>} Merged patches
 *
 * Filters out:
 * - Empty patch sets from layers
 * - Patches from the base layer
 *
 * This ensures only meaningful layer-specific patches are combined.
 */
export const merge_patch_set = (a: BetterSet<ContentPatch>,  layer_pair: [Layer<any>, BetterSet<ContentPatch>]) => {
    const value = layer_pair_value(layer_pair);
    const layer = layer_pair_layer(layer_pair);

    const patches = is_map(value)
        ? to_array(value)
        : value;

    const isEmpty = Array.isArray(patches)
        ? patches.length === 0
        : is_better_set(patches) && length(patches) === 0;

    if (isEmpty || is_base_layer(layer)) {
        return a;
    }

    return reduce(patches, add_item, a)
}

/**
 * Scans content for necessary patches when adding new element
 *
 * Determines the appropriate patches by:
 * 1. Finding if element with same base value already exists
 * 2. Checking if existing element is subsumed by new element
 * 3. If replacing: generate remove + join patches
 * 4. If adding: generate join patch only
 *
 * Layered behavior:
 * - Support layer: Compares support set strength and base value implication
 * - Base layer: Only generates join patch
 *
 * @type {Function}
 * @returns {PatchedSet} Set of patches to apply
 *
 * @example
 * const patches = scan_for_patches(content, newValue);
 * // If newValue is stronger, patches contain [remove_old, join_new]
 * // If newValue is new, patches contain [join_new]
 */
export const scan_for_patches: (
   ...args: any[]
) => BetterSet<ContentPatch> = construct_layered_consolidator(
    "scan_for_patches",
    2,
    // @ts-ignore
    merge_patch_set,
    construct_better_set([])
);

/**
 * Layer dispatcher for support_layer in scan_for_patches
 *
 * Compares elements using:
 * - base_value_implies: Checks if base values are logically compatible
 * - supported_value_less_than_or_equal: Compares support set strength
 *
 * @param {LayeredObject<any>[]} base_args - [content, elt]
 * @param {BetterSet<any>} set_supports - Support set of content
 * @param {BetterSet<any>} elt_supports - Support set of new element
 * @returns {PatchedSet} Patches for support layer
 */
define_consolidator_per_layer_dispatcher(
    scan_for_patches,
    support_layer,
    (base_args: any[], set_supports: BetterSet<any>, elt_supports: BetterSet<any>) => {
        const [content, elt] = base_args;
        
        // Safety check: if content is not a valid array-like, just return join patch
        if (!Array.isArray(content) && !is_better_set(content)) {
            return construct_better_set([patch_join(elt)])
        }
        
        // Find existing element with matching base value
        const existed: LayeredObject<any> | undefined = find(content, (a: LayeredObject<any>) => {
            return base_value_implies(a, elt)
        })

        // If found and new element is stronger, replace it
        if ((existed))  {
            if (supported_value_less_than_or_equal(existed, elt)) {
                // if support value is subset of the existed one, rejecting the new one
                return construct_better_set([])
            }
            else{
                return construct_better_set([patch_join(elt)])
            }
        }
        // If no matching element, add new one
        else {
            return construct_better_set([patch_join(elt)])
        }
    }
)

/**
 * Applies a set of patches to update a patched set
 *
 * Sequentially applies each patch:
 * - join patches: Add element to set
 * - remove patches: Remove element from set
 *
 * Order of patches is determined by consolidator and should be
 * semantically consistent across layer compositions.
 *
 * @param {PatchedSet} a - Current patched set
 * @param {BetterSet<ContentPatch>} b - Patches to apply
 * @returns {PatchedSet} Updated patched set
 *
 * @example
 * let set = construct_better_set([]);
 * const patches = scan_for_patches(set, newValue);
 * set = apply_content_patch(set, patches);
 */
export const apply_content_patch = (a: PatchedSet, b: BetterSet<ContentPatch>, elt: LayeredObject<any>) => {
    return reduce(b, (acc: PatchedSet, c: ContentPatch) => {
        if (type_of_content_patch(c) === "join") {
            if (is_equal(content_patch_elt(c), get_base_value(elt))) {
                return add_item(acc, elt)
            }
            else{
                throw_error("apply_content_patch", "join patch for different element", to_string(content_patch_elt(c)) + to_string(elt))
            }
        }
        else if (type_of_content_patch(c) === "remove") {
            return filter(acc, (a: LayeredObject<any>) => {
                return !is_equal(get_base_value(a), get_base_value(content_patch_elt(c)))
            })
        }
        else{
            throw_error("apply_content_patch", "invalid content patch", to_string(c))
        }
    }, a)
}

/**
 * Adds a single element to patched set with patch generation and application
 *
 * Workflow:
 * 1. Scan for necessary patches
 * 2. Apply patches to content
 *
 * @param {PatchedSet} content - Current patched set
 * @param {LayeredObject<any>} elt - Element to add
 * @returns {PatchedSet} Updated patched set
 *
 * @example
 * let set = construct_better_set([value1]);
 * set = _patched_set_join(set, value2);
 */
export const _patched_set_join = (content: PatchedSet, elt: LayeredObject<any>) => {
    const patches = scan_for_patches(content, elt)
    return apply_content_patch(content, patches, elt)
}

/**
 * Predicate to check if value is a PatchedSet
 * @param {any} a - Value to test
 * @returns {boolean} True if value is a BetterSet (PatchedSet)
 */
export const is_patched_set = is_better_set

/**
 * Converts value to PatchedSet
 *
 * @param {any} a - Value to convert
 * @returns {PatchedSet} Single-element set or existing PatchedSet
 *
 * @example
 * to_patched_set(42) // Returns better_set([42])
 * to_patched_set(already_patched_set) // Returns same set
 */
export const to_patched_set = (a: any) => {
    if (is_patched_set(a)){
        return a
    }
    else{
        return construct_better_set([a])
    }
}

/**
 * Merges new element into patched set
 *
 * Main entry point for adding elements to a patched set.
 * Handles the_nothing gracefully (no-op merge).
 *
 * @param {PatchedSet} content - Current patched set
 * @param {LayeredObject<any>} increment - Element to merge
 * @returns {PatchedSet} Updated patched set
 *
 * @example
 * let set = construct_better_set([]);
 * set = patched_set_merge(set, value1);
 * set = patched_set_merge(set, value2);
 */
// needs to integrate with generic_merge
// or other cell_merge
// so this can work with primitive datastructure
export const merge_patched_set = (content: PatchedSet, increment: LayeredObject<any>) => {
    // Handle nothing values
    if (is_nothing(increment)) {
        return content;
    }
    
    // Handle initial empty state - content might be the_nothing from cell initialization
    if (is_nothing(content)) {
        return construct_better_set([increment]);
    }
    
    return _patched_set_join(content, increment)
}


// define_generic_procedure_handler(
//     generic_merge,
//     match_args(is_any, is_layered_object),
//     merge_patched_set
// )

define_generic_procedure_handler(
    is_unusable_value,
    match_args(is_patched_set),
    compose(strongest_consequence, is_unusable_value)
)

define_generic_procedure_handler(
    strongest_value,
    match_args(is_patched_set),
    strongest_consequence
)