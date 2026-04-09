# TODO: Index support-layer premises for targeted wake

**Status:** Deferred (not part of CELL-VALUE-STORE Stage 3.)

## Current behavior (Stage 3)

[`CellValueStore.ts`](../Shared/CellValueStore.ts) builds `premise_index` only from **vector-clock channels** that pass `is_premises` (registered premise names on the clock map). `PremiseMetaData.wake_up_roots` dispatches `WAKE_CELLS_FOR_PREMISE`, which runs `testContent()` only on cells returned by `cells_for_premise(premiseId)`.

## Gap

Legacy **ValueSet** [`strongest_consequence`](../DataTypes/ValueSet.ts) filters contributions using the **support layer** and `is_premises_in` on that support set. Values can therefore depend on a premise **without** that premise id appearing as a vector-clock channel.

Those cells are **not** entered into `premise_index`. When `mark_premise_out` / `mark_premise_in` runs, **targeted wake will not** refresh their `strongest` until something else merges or `FORCE_UPDATE_ALL_CELLS` is used manually.

## Follow-up options

1. Extend `extract_premise_channels` (or a parallel pass) to union premise ids found in the **support layer** of each element in merged content (TVS / layered values), still gated by `is_premises(name)` for registered names.
2. Migrate call sites so all premise-carrying values use **clock channels** (aligned with `PremisesSource` / `source_constant_cell`).

See also: [CELL-VALUE-STORE.md](./CELL-VALUE-STORE.md) Stage 3–4, `lain-lang/docs/research/PREMISES-RETRACTION.md`.
