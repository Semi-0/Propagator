# Cell Value Store: Separating Storage from Cell Identity

This document records the design rationale, core questions, and staged implementation plan for externalizing cell content into a dedicated store — and using that store as the foundation for a correct, targeted premises retraction system.

Related reading: `lain-lang/docs/research/PREMISES-RETRACTION.md`, `lain-lang/docs/research/HIGHER-ORDER-PROPAGATOR.md`.

---

## Core Questions

### Q1. Why does the current system need `FORCE_UPDATE_ALL_CELLS` on premise change?

Cell `content` and `strongest` are private closure variables inside `primitive_construct_cell`. Nothing outside a cell can reach them except by calling `cell.update(increment)` — which requires a new merge increment. When a premise flips, no new value arrives, so `test_content` never runs, `strongest` goes stale, and downstream propagators see nothing. The global `FORCE_UPDATE_ALL_CELLS` is the only available escape hatch.

### Q2. Why can't we fix this by hooking inside `generic_merge` or `cell_merge`?

The hard boundary between value merge and cell merge is intentional. `generic_merge` is pure: it knows nothing about which cell it is running inside, or which premises tag the values it sees. Injecting cell identity into merge would couple two layers that are deliberately kept separate. The fix must happen *above* merge — at the cell's write boundary.

### Q3. Can `TemporaryValueSet` act as a cell-local TMS?

Yes, and it almost does already. TVS preserves all contributed values even when a premise is out (they go "weaker" in `tvs_strongest_consequence`, not deleted). Retraction is semantically correct inside the cell content. The missing piece is purely mechanical: `test_content` is never triggered externally after a premise flip, so `strongest` is never updated.

### Q4. What does externalizing cell storage enable?

If cell content lives in a store (`Map<cellId, TemporaryValueSet>`), the store can maintain a premise → cell inverse index as a natural side-effect of writes. On premise flip, `wake_up_roots` queries the store for affected cells and calls `testContent` on each. Targeted wake falls out from the store's own bookkeeping — no inverse index wiring needed inside cell or merge code.

Additionally:
- GC can be decoupled from merge (no more eviction inside `value_set_adjoin`)
- Storage backend can be swapped (in-memory → DB) without touching cell or merge logic
- The store becomes the single owner of the TMS: content, strongest, and the premise index all live in one place

### Q5. How is the premise-registration ordering guaranteed?

Premises must be registered before values carrying them arrive in the store. This is guaranteed as long as **all premises originate from source cells**: `source_constant_cell` calls `register_source_cell` (which calls `register_premise`) before `update_cell`. As long as premise IDs only enter the system through source cell creation, the ordering invariant holds by construction. Values carrying a premise channel can only be produced downstream of a source cell, which is always created first.

### Q6. What changes and what stays the same?

**Unchanged:**
- `generic_merge`, `merge_layered`, `cell_merge` — pure, untouched
- `TemporaryValueSet` merge and `tvs_strongest_consequence` logic
- `strongest_value`, `cell_equal`
- Propagator wiring, `addNeighbor`, neighbor alerting — still owned by cells
- The `Cell<A>` interface — external callers see no change
- `ALERT_ALL_AMBS` — still needed for search

**Changed:**
- `primitive_construct_cell`: `var content` and `var strongest` closure vars become store reads/writes
- `PremiseMetaData.wake_up_roots`: uses store inverse index instead of global broadcast; `FORCE_UPDATE_ALL_CELLS` is removed
- `value_set_adjoin` in TVS: eviction (`vector_clock_prove_staled_by`) is deferred to an explicit GC pass, not triggered on every merge

---

## Implementation Stages

### Stage 1 — `CellValueStore` module (no cell changes yet) ✅ DONE

**Goal:** create the store and prove the inverse index works in isolation.

Create `Propogator/Shared/CellValueStore.ts`.

#### Data layout

Each cell's data is grouped into a single `CellValueMetaData` record — content, strongest, and premise_channels are always updated together, so they belong together:

```ts
type CellValueMetaData = {
    content:          TemporaryValueSet<any>  // full TVS, including HistoryWant entries
    strongest:        any                     // cached result of tvs_strongest_consequence
    premise_channels: Set<string>             // which premise IDs this cell's content depends on
                                              // (forward index — cached from content for fast update)
}
```

The module holds two singletons:

```ts
// primary store: one record per cell
const cell_store: Map<string, CellValueMetaData> = new Map();

// inverse index: premiseId → set of cellIds whose content depends on that premise
// maintained at module level because it spans all cells — does not belong inside any one CellValueMetaData
const premise_index: Map<string, Set<string>> = new Map();
```

#### Function combinators

All operations are standalone functions over the singletons, consistent with the rest of the codebase style (`cell_strongest`, `cell_name`, `is_premise_in`, etc. are all standalone functions over thin objects):

```ts
// read
const read_content  = (cellId: string): any => cell_store.get(cellId)?.content  ?? the_nothing
const read_strongest = (cellId: string): any => cell_store.get(cellId)?.strongest ?? the_nothing

// write — merges increment into content, updates premise_channels and premise_index atomically
const write_content = (cellId: string, increment: any): void => {
    const meta    = cell_store.get(cellId) ?? empty_metadata()
    const merged  = cell_merge(meta.content, increment)
    const new_channels = all_premise_channels(merged)      // inspect clock channels
    update_premise_index(cellId, meta.premise_channels, new_channels)  // diff and patch inverse index
    cell_store.set(cellId, { content: merged, strongest: meta.strongest, premise_channels: new_channels })
}

// test_content — recomputes strongest, alerts neighbors if changed
const test_content = (cellId: string, cell: Cell<any>): void => {
    const meta = cell_store.get(cellId)
    if (!meta) return
    const new_strongest = tvs_strongest_consequence(meta.content)
    if (!cell_equal(new_strongest, meta.strongest)) {
        cell_store.set(cellId, { ...meta, strongest: new_strongest })
        alert_interested_propagators(cell.getNeighbors(), NeighborType.updated)
    }
}

// premise index query
const cells_for_premise = (premiseId: string): Set<string> =>
    premise_index.get(premiseId) ?? new Set()

// reset — for test suite teardown
const clear_cell_store = (): void => {
    cell_store.clear()
    premise_index.clear()
}
```

`update_premise_index` diffs old and new `premise_channels` to add/remove cellId entries in `premise_index` without a full rebuild.

**Criteria for success:**
- Unit tests: write a value with clock channel `"P"`, call `cells_for_premise("P")`, get back the correct cellId
- Writing a non-premise-tagged value does not add entries to `premise_index`
- `test_content` with unchanged strongest does not alert neighbors (no spurious propagation)
- `clear_cell_store()` resets both maps cleanly (needed for existing test suite reset pattern)

**Implementation notes (actual):**
- Created `Propogator/Shared/CellValueStore.ts` with `CellValueMetaData`, `cell_store`, `premise_index`
- `test_content` lives in `Cell.ts` as a closure (`recompute_strongest` is the store side; alerting neighbors stays in the cell)
- `the_disposed` imported from `../Cell/CellValue` for `write_disposed`
- `clear_cell_store` called from `PublicState.ts` CLEAN_UP handler
- All 144 passing tests from baseline continue to pass

---

### Stage 2 — Wire `primitive_construct_cell` to the store ✅ DONE

**Goal:** cells read/write through the store combinators; `Cell<A>` interface unchanged.

The closure vars `content` and `strongest` in `Cell/Cell.ts` are replaced by store calls. The cell itself becomes a thin object: it owns its `relation` and `neighbors`, nothing else.

```ts
// before — cell owns its data as closure vars
var content:  CellValue<A> = the_nothing;
var strongest: CellValue<A> = the_nothing;

function set_content(v)  { content = v }
function set_strongest(v) { strongest = v; alert_interested_propagators(...) }
function test_content()  { const s = strongest_value(content); ... }

// after — cell delegates to store combinators
// on construction:
write_content(id, the_nothing)

// in update():
write_content(id, increment)   // merges, updates premise_channels, patches premise_index
test_content(id, cell)         // recomputes strongest, alerts if changed

// getContent() → read_content(id)
// getStrongest() → read_strongest(id)

// in dispose():
remove_cell_from_store(id)     // removes CellValueMetaData + cleans premise_index entries
```

The cell object itself carries only `relation` and `neighbors` — purely structural concerns. All value state is in the store.

**Criteria for success:**
- All existing tests in `test/` pass without modification
- `cell_content(cell)` and `cell_strongest(cell)` return identical results to today
- No new global state introduced beyond the singleton store (consistent with `PublicStateCommand.ADD_CELL` pattern)
- Cell disposal removes the `CellValueMetaData` entry and patches `premise_index` to remove the cellId from all premise sets it was registered under

**Implementation notes (actual):**
- `primitive_construct_cell` now calls `init_cell(cid)`, `write_content(cid, increment)`, `read_content(cid)`, `read_strongest(cid)`, `recompute_strongest(cid)`, `write_disposed(cid)` — all from `CellValueStore`
- Closure vars `var content` and `var strongest` removed entirely
- `dispose()` calls `write_disposed(cid)` which writes `the_disposed` sentinel without removing the store entry (required for disposal tests)
- `PublicState.ts` CLEAN_UP handler calls `clear_cell_store()` to reset store between tests
- Test result: 144 pass, 15 fail, 6 errors (identical to pre-implementation baseline)

---

### Stage 3 — Replace `FORCE_UPDATE_ALL_CELLS` with targeted wake ✅ DONE

**Goal:** `PremiseMetaData.wake_up_roots` uses the store's premise index.

**Scope:** **Clock-channel premises only** — see [TODO-PREMISE-INDEX-SUPPORT-LAYER.md](./TODO-PREMISE-INDEX-SUPPORT-LAYER.md) for deferred support-layer indexing.

**Implementation (actual):**

- Added `PublicStateCommand.WAKE_CELLS_FOR_PREMISE` in `Shared/PublicState.ts`. The handler: for each `cellId` in `cells_for_premise(premiseId)`, find the live cell in `all_cells` by `cell_id`, call `testContent()` (no merge), then `ALERT_ALL_AMBS`. This avoids importing `CellValueStore` from `PremiseMetaData` (would cycle with `Premises.ts`).
- `PremiseMetaData.wake_up_roots` dispatches only `WAKE_CELLS_FOR_PREMISE` with `this.name` (no `FORCE_UPDATE_ALL_CELLS` from library code).
- `FORCE_UPDATE_ALL_CELLS` remains in the enum and switch as a manual/debug escape hatch.
- Tests: `Propogator/test/premise_wake.test.ts` (premise index + targeted wake vs unrelated cells).

**Criteria for success:**
- Premise retraction does not wake cells whose content is not indexed for that premise (clock channels only).
- No `FORCE_UPDATE_ALL_CELLS` call remains in **production** library paths (`PremiseMetaData`).
- Named doc tests (`advanceReactive.test.ts`, etc.) — add/port when present in the tree; current coverage is `premise_wake.test.ts`.

---

### Stage 4a — Fix `tvs_strongest_consequence` filter-first

**Goal:** make premise filtering a pre-step before merge, not interleaved inside it.

The current implementation checks premise state pairwise inside the reduce, mixing control logic into merge:

```ts
// current — premise logic interleaved in merge
export const tvs_strongest_consequence = (content) => reduce(
    content,
    (a, b) => {
        if (tvs_is_premises_in(a) && tvs_is_premises_out(b)) return a;
        if (tvs_is_premises_in(b) && tvs_is_premises_out(a)) return b;
        else return partial_merge(a, b);
    },
    the_nothing
)
```

Replace with filter-first, matching the pattern already used in `ValueSet.strongest_consequence`. Also exclude `Situation` entries (they are not data values):

```ts
// proposed — premise filtering is a pre-step; partial_merge is premise-unaware
export const tvs_strongest_consequence = (content: TemporaryValueSet<any>) => pipe(
    content,
    (elements) => filter(elements, (e) => tvs_is_premises_in(e) && !is_situation(get_base_value(e))),
    (filtered) => reduce(filtered, partial_merge, the_nothing)
)
```

`partial_merge` remains completely premise-unaware. All premise logic lives in the filter step.

**Criteria for success:**
- `tvs_strongest_consequence` produces identical results for all existing tests
- `partial_merge` has zero calls to `is_premises_in` / `is_premises_out` — verifiable by grep
- Retracted values survive in the TVS (resurrection without source re-emit works for at least one premise flip cycle)

---

### Stage 4b — Remove eviction from `value_set_adjoin`

**Goal:** stop `value_set_adjoin` from evicting during write so that TVS is append-only at merge time.

Remove the `vector_clock_prove_staled_by` eviction call inside `internal_merge_temporary_value_set`. `value_set_adjoin` only adjoins; it never evicts. Eviction moves entirely to the clock-based GC in Stage 4c, which runs at a designated checkpoint rather than on every write.

**Criteria for success:**
- No call to `vector_clock_prove_staled_by` remains inside `value_set_adjoin` or `internal_merge_temporary_value_set`
- TVS grows monotonically at write time (tested by writing two entries with concurrent clocks and verifying both survive)

---

### Stage 4c — Clock-based TVS GC in `recompute_strongest`

**Goal:** bound TVS memory growth using purely structural (clock-based) eviction — no premise state queried, no special cases for premise-in/out. All history-with-resurrection reasoning goes through Situations (Stage 4d+).

`recompute_strongest` in `CellValueStore.ts` is the natural designated checkpoint — it runs after every propagation step and keeps merge pure (no eviction at write time).

#### Eviction rule

```
evict entry E iff:
  there exists another entry E' in the same TVS
  such that vector_clock_prove_staled_by(E, E')   — E' causally dominates E
  AND E is not a Situation entry

keep otherwise:
  entries whose clock is concurrent with all other entries → keep (distinct causal branches)
  Situation entries → excluded; they self-compact via situation_adjoin
```

Premise state is not consulted. GC is purely about causal order. TMS reasoning (which values participate in `strongest`) remains entirely in `tvs_strongest_consequence`'s filter-first step.

#### Implementation in `CellValueStore.ts`

```ts
const gc_tvs = (content: any): any => {
    if (!is_better_set(content)) return content;
    const entries = to_array(content);

    return filter(content, (e1: any) => {
        if (is_situation(get_base_value(e1))) return true;  // Situation manages itself
        // evict if any other entry causally dominates e1
        return !entries.some((e2: any) =>
            e2 !== e1 && vector_clock_prove_staled_by(e1, e2)
        );
    });
};

export const recompute_strongest = (cellId: string): { new_strongest: any; changed: boolean } => {
    const meta = cell_store.get(cellId);
    if (!meta) return { new_strongest: the_nothing, changed: false };

    const gc_content    = gc_tvs(meta.content);
    const new_strongest = strongest_value(gc_content);
    const new_channels  = extract_premise_channels(gc_content);
    const changed       = !is_equal(new_strongest, meta.strongest);

    cell_store.set(cellId, {
        content:          gc_content,
        strongest:        new_strongest,
        premise_channels: new_channels,
    });
    update_premise_index(cellId, meta.premise_channels, new_channels);

    return { new_strongest, changed };
};
```

#### Separation of concerns

| Concern | Where it lives |
|---------|---------------|
| Which values participate in `strongest` | `tvs_strongest_consequence` (premise filter) |
| Evicting causally dominated values | `gc_tvs` in `recompute_strongest` (clock order) |
| Preserving history across hypothesis branches | `Situation` (self-compacting, opt-in) |

Regular cells give **best-effort resurrection**: if a premise-out value's clock is concurrent with all premise-in values, it survives GC and resurrection works. If a newer value from the same source has arrived (dominating clock), GC evicts the old entry — but the newer premise-in value is already there, so restoration finds it. If guaranteed cross-hypothesis resurrection is needed, use a Situation — its entries have concurrent clocks between worlds and are excluded from TVS GC entirely.

**Criteria for success:**
- After `recompute_strongest`, no entry survives if another entry in the same TVS causally dominates it
- Entries with concurrent clocks both survive
- Situation entries are never evicted by `gc_tvs`
- `premise_index` is updated: cells whose last premise-tagged entry was evicted are removed from the index
- All existing tests pass unchanged

---

### Stage 4d — Implement `Situation<A>` type

**Goal:** define the Situation data structure and its core operations.

Create `Propogator/DataTypes/Situation.ts`.

```ts
type Situation<A> = {
    kind:    "situation";
    entries: A[];          // kept as a sorted array for now; red-black tree later
}

export const is_situation = register_predicate(
    "is_situation",
    (v: any): v is Situation<any> => v?.kind === "situation"
)

export const empty_situation = <A>(): Situation<A> => ({ kind: "situation", entries: [] })



// this is sus, i think we only needs to extends the new value into unknown histories

export const situation_size = <A>(s: Situation<A>): number => s.entries.length
```

`situation_adjoin` applies `cell_merge` pairwise against all existing entries to determine the incoming value's fate:

```ts
export const situation_adjoin = <A>(sit: Situation<A>, value: A): Situation<A> => {
    const surviving: A[] = [];
    let   absorbed = false;

    for (const e of sit.entries) {
        const m = cell_merge(e, value);
        if (is_contradiction(m)) {
            // contradiction — keep both
            surviving.push(e);
        } else if (m === value || (is_equal(m, value) && !is_equal(m, e))) {
            // value subsumes e — drop e, keep scanning
        } else if (m === e || is_equal(m, e)) {
            // e subsumes value — value is redundant, keep e, mark absorbed
            surviving.push(e);
            absorbed = true;
        } else {
            // incomparable — keep both
            surviving.push(e);
        }
    }

    if (!absorbed) surviving.push(value);
    return { kind: "situation", entries: surviving };
}
```

**Criteria for success:**
- `situation_adjoin(s, v)` where `v` is subsumed by an existing entry returns an identical entry list
- `situation_adjoin(s, v)` where `v` subsumes an existing entry evicts that entry
- Contradicting values both survive
- Incomparable values both survive
- Unit tests cover all four cases

---

### Stage 4e — Implement Situation merge handler

**Goal:** register a generic merge handler so two Situation values compose correctly when they arrive in the same TVS.

```ts
// in Situation.ts or a CellGenerics-style registration file
define_generic_procedure_handler(
    generic_merge,
    match_args(is_situation, is_situation),
    <A>(a: Situation<A>, b: Situation<A>): Situation<A> => {
        // fold all entries of b into a via situation_adjoin
        return b.entries.reduce(situation_adjoin, a);
    }
)
```

This means two propagators each writing their own Situation to the same cell produce a single merged Situation where the full `cell_merge` subsumption relation holds across both entry sets.

**Criteria for success:**
- `generic_merge(sit_A, sit_B)` contains all entries from both, with dominated entries removed
- Contradictions from cross-Situation merge survive
- Registering the handler does not break any existing merge tests

---

### Stage 4f — Wire Situation into TVS accessors

**Goal:** add `tvs_situation` so consumers of historical values have a clean accessor, symmetric to `tvs_strongest_consequence`.

```ts
// in TemporaryValueSet.ts
export const tvs_situation = <A>(content: TemporaryValueSet<A>): Situation<A> =>
    pipe(
        content,
        (elements) => filter(elements, (e) => is_situation(get_base_value(e))),
        (sits)     => reduce(
            sits,
            (acc: Situation<A>, e: any) => {
                const m = generic_merge(acc, get_base_value(e));
                return is_situation(m) ? m : acc;
            },
            empty_situation<A>()
        )
    )
```

`tvs_strongest_consequence` (already updated in Stage 4a) excludes Situation entries. `tvs_situation` is the complementary accessor that collects them.

**Criteria for success:**
- `tvs_situation` on a TVS with no Situation entries returns `empty_situation()`
- `tvs_situation` on a TVS with multiple Situation entries returns their merged Situation
- `tvs_strongest_consequence` and `tvs_situation` partition the TVS entries cleanly — no entry appears in both

---

### Stage 4g — Propagator API: `p_situation`

**Goal:** give propagators a first-class way to spawn a Situation accumulator without boilerplate.

`p_situation` creates a propagator that reads from an input cell and accumulates every new value into a Situation written to a dedicated output cell:

```ts
// usage
const history_cell = construct_cell("my_cell_history");
p_situation(source_cell, history_cell);

// implementation sketch
export const p_situation = <A>(input: Cell<A>, output: Cell<Situation<A>>): Propagator => {
    return primitive_propagator([input], [output], () => {
        const new_val = cell_strongest(input);
        if (is_nothing(new_val)) return;

        const current_sit = tvs_situation(cell_content(output));
        const updated_sit = situation_adjoin(current_sit, new_val);
        update_cell(output, updated_sit);
    });
}
```

The output cell's Situation grows monotonically. If the propagator's premise is later retracted, the Situation entry in the output cell weakens out via TVS support layers automatically — no special disposal needed.

**Criteria for success:**
- `p_situation(source, hist)` accumulates successive values of `source` into `hist`'s Situation
- Subsumed values are not duplicated in the history
- Retracting the input's premise weakens the Situation out of `tvs_situation` on the output cell
- `tvs_strongest_consequence` on the output cell returns `the_nothing` (Situation entries are excluded from strongest)

---

### Stage 4h — Antichain invariant + clock merge in `situation_adjoin`

**Goal:** extend `situation_adjoin` to also merge vector clock information, so that the Situation accumulates causal knowledge independently of value-level subsumption.

Stage 4d handles the value dimension (subsume / absorb / contradiction / incomparable). This stage adds the clock dimension: when two entries are compared, their clocks are joined (empty slot filled, existing slot takes max) regardless of the value outcome.

```ts
import { merge_vector_clocks } from "../AdvanceReactivity/vector_clock";

export const situation_adjoin = <A>(sit: Situation<A>, incoming: A): Situation<A> => {
    const surviving: A[] = [];
    let   absorbed = false;

    for (const e of sit.entries) {
        const m = cell_merge(e, incoming);

        if (is_contradiction(m)) {
            surviving.push(e);                         // contradiction — keep both
        } else if (dominates(m, incoming, e)) {        // incoming subsumes e
            // clock evidence from e folds into incoming before e is evicted
            incoming = merge_clock_into(incoming, e);
        } else if (dominates(m, e, incoming)) {        // e subsumes incoming
            surviving.push(e);
            absorbed = true;                           // incoming redundant for value
            // but still fold incoming's clock evidence into e
            surviving[surviving.length - 1] = merge_clock_into(e, incoming);
        } else {
            surviving.push(e);                         // incomparable — keep both
        }
    }

    if (!absorbed) surviving.push(incoming);
    return { kind: "situation", entries: surviving };
}
```

`merge_clock_into(target, source)` reads the vector clock layer of `source` and adjoins any channels not present in `target`'s clock (filling empty slots). A value can be evicted from the Situation while its causal evidence survives folded into the entry that subsumed it.

**Criteria for success:**
- Adjoining an entry whose value is subsumed still transfers its clock channels to the surviving entry
- `situation_adjoin` on entries with disjoint clocks produces an entry whose clock covers both source clocks
- No clock information is lost when an entry is evicted by subsumption
- A round-trip retract/restore still works correctly with the enriched clock state

---

### Stage 4i — Persistent DAG backing (optional upgrade from antichain list)

**Goal:** replace the flat `entries` array with a persistent causal DAG that preserves the full branching structure, not just the current antichain frontier.

This stage is optional — the antichain list from Stage 4d is correct and sufficient when the number of live worlds is small. Implement this when profiling shows O(n·k) antichain scans are a bottleneck, or when extraction propagators need to traverse causal ancestry.

#### Node type

```ts
type SituationNode<A> = {
    value:   A;
    clock:   VectorClock;
    parents: SituationNode<A>[];   // empty for root nodes
}

type Situation<A> = {
    kind:   "situation";
    leaves: SituationNode<A>[];    // current antichain — nodes with no children
    // all interior nodes are reachable via parent pointers from leaves
}
```

#### Adjoin on the DAG

When `situation_adjoin` evicts an entry `e` because `incoming` subsumes it, `incoming` becomes a child of `e` in the DAG (it is causally after `e`). When `incoming` is incomparable to `e`, both remain leaves with no parent/child relationship between them. When `incoming` contradicts `e`, both become leaves with a shared "fork" annotation.

```
before:  leaves = [e1, e2]
incoming v subsumes e1:
  v.parents = [e1]          // causal successor of e1
  leaves = [v, e2]          // e1 is now interior, v is new leaf
```

This gives extraction propagators access to the full ancestry of any current world — they can walk `node.parents` to reconstruct the causal chain that produced the current state.

#### Structural sharing

Immutable nodes (never mutated after creation) mean two Situations that share a common ancestor share those nodes in memory. A situation that forked at node `e` and later converged back can reference the same `e` node from both branches — analogous to Git's DAG of commits.

**Criteria for success:**
- `situation_adjoin` on the DAG produces the same antichain as the list implementation (same leaves)
- Interior nodes are reachable from leaves via `parents`
- Structural sharing: merging two Situations with a common ancestor does not duplicate the ancestor node
- Memory use is bounded by total unique `(value, clock)` pairs ever adjoined, not by the number of operations

---

### Stage 4j — Extraction propagator API

**Goal:** provide a standard set of propagator factories for reading history out of a Situation cell without modifying it.

Each extraction propagator wires a Situation cell as input and produces a derived output. The Situation itself is never written by extraction — only `p_situation` (Stage 4g) adjoins into it.

#### `p_situation_reduce` — fold over antichain

```ts
export const p_situation_reduce = <A, B>(
    sit_cell:    Cell<Situation<A>>,
    output_cell: Cell<B>,
    reducer:     (entries: A[]) => B
): Propagator =>
    primitive_propagator([sit_cell], [output_cell], () => {
        const sit = tvs_situation(cell_content(sit_cell));
        update_cell(output_cell, reducer(sit.entries));
    })

// usage: extract the merged value across all live worlds
p_situation_reduce(hist_cell, output_cell,
    (entries) => entries.reduce(cell_merge, the_nothing))
```

#### `p_situation_filter` — project a subset of worlds

```ts
export const p_situation_filter = <A>(
    sit_cell:    Cell<Situation<A>>,
    output_cell: Cell<Situation<A>>,
    predicate:   (entry: A) => boolean
): Propagator =>
    primitive_propagator([sit_cell], [output_cell], () => {
        const sit      = tvs_situation(cell_content(sit_cell));
        const filtered = sit.entries.filter(predicate);
        update_cell(output_cell, { kind: "situation", entries: filtered });
    })

// usage: only worlds where clock channel "P1" was observed
p_situation_filter(hist_cell, p1_cell,
    (entry) => has_clock_channel(entry, "P1"))
```

#### `p_situation_before` — causal filter (requires DAG from Stage 4i)

```ts
// retain only entries causally before a given clock snapshot
export const p_situation_before = <A>(
    sit_cell:    Cell<Situation<A>>,
    output_cell: Cell<Situation<A>>,
    cutoff:      VectorClock
): Propagator =>
    primitive_propagator([sit_cell], [output_cell], () => {
        const sit = tvs_situation(cell_content(sit_cell));
        const before = sit.entries.filter(
            (e) => vector_clock_dominates(cutoff, get_vector_clock_layer(e))
        );
        update_cell(output_cell, { kind: "situation", entries: before });
    })
```

**Criteria for success:**
- `p_situation_reduce` reruns when `sit_cell` updates, producing the correct folded value
- `p_situation_filter` produces a valid Situation (antichain invariant holds on the filtered subset)
- Retracting the spawning propagator's premise weakens the Situation in `sit_cell`, which flows through to all extraction outputs
- Extraction propagators do not write back to `sit_cell`

---

### Stage 4k — Custom merge handler API

**Goal:** make it easy to register domain-specific merge semantics for Situation entries without touching the core `situation_adjoin` logic.

The default merge handler (Stage 4e) uses `cell_merge` for pairwise entry comparison. For specific value types — intervals, fact sets, Datalog rules — the subsumption relation is different. `situation_merge_with` factors out the pairwise function so only the comparison changes:

```ts
export const situation_merge_with = <A>(
    a:           Situation<A>,
    b:           Situation<A>,
    entry_merge: (x: A, y: A) => A
): Situation<A> => {
    const adjoin_with = (sit: Situation<A>, v: A): Situation<A> => {
        const surviving: A[] = [];
        let absorbed = false;
        for (const e of sit.entries) {
            const m = entry_merge(e, v);
            if (is_contradiction(m))         { surviving.push(e); }
            else if (dominates_with(m, v, e, entry_merge)) { /* e evicted, clock merged */ }
            else if (dominates_with(m, e, v, entry_merge)) { surviving.push(e); absorbed = true; }
            else                             { surviving.push(e); }
        }
        if (!absorbed) surviving.push(v);
        return { kind: "situation", entries: surviving };
    };
    return b.entries.reduce(adjoin_with, a);
}
```

Registering a custom handler for a specific value type:

```ts
// intervals: subsumption = containment
define_generic_procedure_handler(
    generic_merge,
    match_args(is_situation_of(is_interval), is_situation_of(is_interval)),
    (a: Situation<Interval>, b: Situation<Interval>) =>
        situation_merge_with(a, b, interval_merge)
)

// fact sets: subsumption = subset relation
define_generic_procedure_handler(
    generic_merge,
    match_args(is_situation_of(is_fact_set), is_situation_of(is_fact_set)),
    (a: Situation<FactSet>, b: Situation<FactSet>) =>
        situation_merge_with(a, b, fact_set_merge)
)
```

`is_situation_of(pred)` is a compound predicate: `(v) => is_situation(v) && v.entries.every(pred)`. This lets the generic dispatch pick the right handler based on both the Situation wrapper and the entry type.

**Criteria for success:**
- `situation_merge_with` produces the same antichain invariant as the default handler for the default `cell_merge`
- Registering a custom handler for `is_interval` does not affect Situation merge for any other entry type
- `is_situation_of` correctly identifies Situations whose entries all satisfy the entry predicate
- Existing merge tests are unaffected (no handler collision)

---

## Premises Retraction and Restoration Flow

This section describes the full lifecycle of a premise flip — retraction and bring-back — after the store changes are in place. It answers two questions: what actually happens step-by-step, and when is `forwarding_source_clock` still necessary.

### Retraction (`kick_out`)

```
kick_out("P")
  → mark_premise_out("P")
  → PremiseMetaData.set_not_believed()
  → wake_up_roots()
      → store.cells_for_premise("P") = {cellId1, cellId2, ...}
      → for each: store.test_content(cellId, cell)
          → new_strongest = tvs_strongest_consequence(content)
              // filter-first: premise-out values stay in TVS but are excluded from the merge
          → if new_strongest ≠ old_strongest:
              store.write_strongest(cellId, new_strongest)
              alert_interested_propagators(cell.getNeighbors(), updated)
              // normal propagation cascade carries the weaker value downstream
  → ALERT_ALL_AMBS (search still needs this)
```

The key invariant: **retracted values are never deleted from TVS during retraction**. They remain in the cell's content and are excluded by the filter step in `tvs_strongest_consequence`. No information is lost until GC explicitly removes them.

### Restoration (`bring_in`)

```
bring_in("P")
  → mark_premise_in("P")
  → PremiseMetaData.set_believed()
  → wake_up_roots()
      → store.cells_for_premise("P") = {cellId1, cellId2, ...}
      → for each: store.test_content(cellId, cell)
          → new_strongest = tvs_strongest_consequence(content)
              // premise-in values now selected again — they were always in the TVS
          → if new_strongest ≠ old_strongest:
              store.write_strongest(cellId, new_strongest)
              alert_interested_propagators(cell.getNeighbors(), updated)
  → ALERT_ALL_AMBS
```

Because TVS preserved the retracted value, restoration is symmetric: `test_content` finds it again and the cascade re-propagates the stronger value downstream. **No replay from source is needed** as long as GC has not run.

### When `forwarding_source_clock` is still needed

`forwarding_source_clock` bumps the vector clock on the source cell, forcing downstream cells that use clock-based staleness checks to treat the re-emitted value as newer. It is needed in two cases:

1. **GC has run since retraction**: if `store.gc_cell` removed the retracted value from one or more downstream TVS cells (because it was premise-out and provably stale), those cells have genuinely lost the contribution. The source must re-emit so the value re-enters the TVS with a fresh clock.

2. **Downstream cells use `vector_clock_prove_staled_by` aggressively**: if a downstream cell received a newer value from the same source *after* retraction (before GC), the retracted value may have been evicted from that cell's TVS by staleness, not premise-out GC. Again, source re-emit is the only recovery.

In both cases, `bring_in` in `PremisesSource.ts` already calls `forwarding_source_clock(cell)` after `mark_premise_in`. After Stage 4, this call becomes a safety net for the GC edge cases rather than the primary restoration mechanism. The primary mechanism is `test_content` on the store.

### The edge case: value lost before GC runs

If a downstream cell received a superseding value from the same source (same clock channel, higher timestamp) while the premise was "in", the old entry was evicted by staleness — not by premise retraction. Retracting and restoring the premise does not recover the old value even with TVS preservation, because it was already gone before retraction. This is expected and correct: the source moved forward, and the old value is genuinely stale regardless of premise state.

This is the boundary of what the TVS-as-TMS approach handles. A full justification log (kept explicitly, not in the TVS) would be needed to recover pre-supersession values. That is deferred per the out-of-scope section.

---

## Situation Design

### GC and the Situation boundary

After Stages 4b and 4c, the TVS has two layers of compaction:

1. **Clock-based TVS GC** (Stage 4c): runs at `recompute_strongest`, evicts any entry whose clock is dominated by another entry in the same TVS. Premise-unaware. Situation entries are excluded.
2. **Situation self-compaction** (Stage 4d+): `situation_adjoin` applies `cell_merge` pairwise when a new value enters a Situation. The Situation's own antichain stays compact without any external GC.

This means **regular cells handle current-value semantics** — the TVS converges to the causally latest values across concurrent branches. **Situations handle history** — they accumulate all branches explicitly, with clock merging and subsumption managed internally.

The clean boundary: if a propagator only needs the current strongest value, it reads from a regular cell and GC keeps that cell lean. If a propagator needs history or guaranteed cross-hypothesis resurrection, it uses `p_situation` to maintain a Situation in a dedicated cell — excluded from clock-based GC, managed entirely by `situation_adjoin`.

---

### What a Situation is

A `Situation<A>` is a value type that lives **inside the TVS** alongside regular data values, carrying support layers and vector clocks like any other TVS entry. The cell interface is unchanged — `content` is still the TVS, `strongest` is still derived from it. `Situation` is invisible to `tvs_strongest_consequence`.

Unlike the earlier HistoryWant design (a declarative predicate telling external GC what to retain), a `Situation` holds the actual retained values and manages its own compaction via `cell_merge` semantics — analogous to situation calculus, where each "action" (cell update) produces a new situation, subsumption prunes dominated situations, and contradictions are kept as distinct branches.

```ts
type Situation<A> = {
    kind:    "situation";
    entries: A[];   // self-compacting via cell_merge on adjoin; red-black tree for large histories
}
```

---

### Merge semantics: `situation_adjoin`

When a new value arrives, `cell_merge` is applied pairwise against every existing entry:

```
incoming value v, existing entry e:
  cell_merge(e, v) = v            → v subsumes e    — evict e
  cell_merge(e, v) = e            → e subsumes v    — skip v (absorbed)
  cell_merge(e, v) = contradiction → incompatible   — keep both
  cell_merge(e, v) = something else → incomparable  — keep both
```

The Situation grows only when new information arrives that is not subsumed by anything already present. Contradictions are always kept — they represent distinct hypotheses needed for search and backtracking.

### Why GC never needs to touch a Situation

Subsumption via `cell_merge` IS the compaction mechanism. The only entries that survive indefinitely are:

- Values on incomparable branches (genuinely distinct information — correct to retain)
- Contradictions (needed for search/amb backtracking — correct to retain)

The Situation size is bounded by the antichain width of the information lattice for the cell's value type. No external GC policy or trigger is needed.

---

### A tree of worlds, not a linear history

A Situation is not a sequence of values in time. It is a **partially ordered set (poset) of possible worlds** — the antichain of maximal, mutually incomparable situations that have accumulated so far. Each world is a `(value, clock)` pair where the clock records its causal position relative to every premise channel.

The antichain is the live frontier: entries that nothing else subsumes. Branches under different hypotheses are incomparable (neither clock dominates the other), so they all coexist in the antichain simultaneously. This is why Situation naturally represents **search / amb worlds** — each live hypothesis is one antichain element, and the antichain grows when hypotheses fork and shrinks when one is resolved or subsumed.

```
World A (premise P1 in):  value=42,  clock={ P1:3, P2:∅ }
World B (premise P2 in):  value=100, clock={ P1:∅, P2:5 }
World C (merged):         value=?,   clock={ P1:3, P2:5 }  ← if A and B are compatible, C subsumes both
```

If A and B cannot be merged (contradiction or incomparable values), both stay in the antichain. If a third entry C's value subsumes both and its clock dominates both, both are evicted and C becomes the sole element.

### Why an array is wrong and a red-black tree is only partially right

An **array** implies a total order — a sequence — which the poset does not have. Scanning it for dominance is O(n·k) per insert (n entries, k clock channels) and gives no structural benefit.

A **red-black tree (BST)** requires a total ordering on keys. Vector clocks have a partial order, not a total one. Two entries with incomparable clocks have no defined BST position relative to each other. You can impose an arbitrary total order (e.g. lexicographic on the clock vector) to use a BST, but then dominance queries still require a scan — the tree structure doesn't help with partial order queries.

### Suitable data structures

**Antichain list (starting point):**  
Keep only the maximal elements. On each `situation_adjoin`, scan the list to find dominated entries (evict) and check whether the new entry is itself dominated (skip). O(n·k) per insert, where n = antichain width and k = number of clock channels. Correct and simple. For propagator systems where the number of live hypotheses is small (typically 2–10 with `p_amb`), this is adequate.

**Persistent causal DAG (for full world-branching):**  
Nodes are `(value, clock)` pairs. Directed edges run from predecessor situations to successor situations (causal order). When two worlds merge (their clocks become comparable), a new node with two parent edges is created. Structural sharing means worlds that share causal history share nodes — analogous to Git's commit DAG.

This structure preserves the full branching/merging history, not just the current antichain. Extraction propagators can traverse it to answer questions like "which worlds converged to this value?" or "what did the cell look like before premise P2 came in?". The antichain is simply the set of nodes with no outgoing edges (leaf nodes).

**Trie indexed by clock channels (for wide antichains):**  
If k (number of channels) is fixed and small, a trie on clock coordinate values gives O(k) dominance queries. Each path from root to leaf encodes a clock vector; dominance is prefix containment. Suitable when many worlds accumulate from a small set of premises.

**Starting recommendation:** implement with an antichain list (Stage 4d), define the interface cleanly, and replace the backing structure later — the merge handler and extraction API are independent of the backing store.

### Extending behavior: extraction propagators and custom merge handlers

The Situation's open-ended design means you never need to build every query into the core. There are two extension points:

**Extraction / reducer propagators** — a propagator that reads a Situation from an input cell and produces a derived value (or another Situation) in an output cell. Examples:

```ts
// extract the strongest value across all worlds
p_situation_reduce(hist_cell, output_cell, (sit) => tvs_strongest_consequence(sit.entries))

// extract only entries from premise P1's world
p_situation_filter(hist_cell, output_cell, (entry) => has_clock_channel(entry, "P1"))

// project the causal graph: which entries happened before clock { P1: 3 }?
p_situation_before(hist_cell, output_cell, { P1: 3 })
```

Each of these is a normal propagator wired to `hist_cell` as an input. When `hist_cell`'s Situation updates, the propagator runs and produces a new derived value. The Situation itself is never modified by extraction — it only grows via `situation_adjoin`.

**Custom merge handlers** — when the default `cell_merge` subsumption semantics are not right for a specific value type, register a new generic procedure handler for `(is_situation, is_situation)` scoped to that type. Examples:

```ts
// for numeric intervals: subsumption means containment, not equality
define_generic_procedure_handler(
    generic_merge,
    match_args(is_situation_of(is_interval), is_situation_of(is_interval)),
    (a, b) => situation_merge_with(a, b, interval_merge)
)

// for fact sets: subsumption means subset, union is the join
define_generic_procedure_handler(
    generic_merge,
    match_args(is_situation_of(is_fact_set), is_situation_of(is_fact_set)),
    (a, b) => situation_merge_with(a, b, fact_set_merge)
)
```

`situation_merge_with` is the same fold as the default handler but parameterized on the pairwise merge function. The Situation structure — antichain maintenance, clock merging, TMS integration — is reused; only the value-level comparison changes.

---

### Vector clocks as partial situation information

Each entry in a Situation carries a vector clock layer recording which channels contributed to that value and at what logical time. The clock is not merely a versioning tag — it is itself **partial information about the situation**, and it accumulates independently of the value payload.

An empty slot in a vector clock means "we have not yet observed anything from that channel." This is the bottom element in that channel's dimension. When two Situation entries are merged, their clocks are joined component-wise:

```
entry_1: value X, clock { P1: 3, P2: ∅ }
entry_2: value Y, clock { P1: ∅, P2: 5 }

clock join → { P1: 3, P2: 5 }
```

Filling an empty slot is not overwriting — it is **learning**. The resulting clock carries strictly more causal knowledge than either entry alone. This means `situation_adjoin` does two orthogonal things simultaneously:

1. **Value merge** — `cell_merge` pairwise: subsumption, incomparable, contradiction (already described)
2. **Clock merge** — vector clock join: fill empty slots, take max at filled slots

These two dimensions are independent. Two entries can be causally comparable (one clock dominates the other) while their values are incomparable, or vice versa. The Situation accumulates both kinds of information without conflating them.

The practical consequence is that **you can decouple the event from the time it happened**. A Situation entry might arrive carrying clock evidence about channel P1 even though its value is only partially related to P1. Later, a second entry fills in P2. The merged Situation now knows the causal ordering of both, even if neither entry alone had the full picture. The clock gradually fills in as more partial views of the situation accumulate — exactly the monotone accumulation model of the propagator system applied to time itself.

This also interacts with subsumption: if entry_2's clock strictly dominates entry_1's clock *and* its value subsumes entry_1's value, entry_1 is safely evicted. If only the clock dominates but the values are incomparable, both entries survive — the clock evidence is retained inside each surviving entry's layer.

---

### Situation calculus connection

Each write to a cell is an "action" producing a new situation. `situation_adjoin` applies successor state logic: weaker situations are pruned, incompatible situations survive as branches. This gives a principled account of search (multiple worlds), retraction (world weakens out), and restoration (world re-activates) — all within the existing TVS machinery.

---

### TMS and retraction

A `Situation` entry carries support layers exactly like any other TVS value. When the spawning propagator's premise is retracted:

- The Situation entry's premise goes out
- `tvs_situation` (which filters by `tvs_is_premises_in`) excludes premise-out Situation entries automatically
- No special disposal logic is needed — same machinery as any other TVS value

When the premise is restored, `tvs_situation` includes the Situation again. Its entries are intact because nothing evicted them — only premise-out filtering excluded them temporarily.

---

### `tvs_situation` accessor

Symmetric to `tvs_strongest_consequence` for data values:

```ts
export const tvs_situation = <A>(content: TemporaryValueSet<A>): Situation<A> =>
    pipe(
        content,
        (elements) => filter(elements, (e) => tvs_is_premises_in(e) && is_situation(get_base_value(e))),
        (sits)     => reduce(
            sits,
            (acc: Situation<A>, e: any) => generic_merge(acc, get_base_value(e)) as Situation<A>,
            empty_situation<A>()
        )
    )
```

`tvs_strongest_consequence` and `tvs_situation` partition the TVS — no entry appears in both.

---

### Boundedness

| State | Situation bound |
|-------|----------------|
| All values comparable (total order) | O(1) — only the strongest survives |
| Values from N independent premises | O(N) — one per antichain element |
| Contradictions from search | O(hypotheses) — all contradictory branches kept |

In the existing test suite no propagator creates a Situation. The TVS itself converges to at most one entry per source channel — bounded by the number of premises.

---

## What Remains Out of Scope for Now

- **Remote / distributed premises**: `PremisesSource.ts` comment ("cannot be tracked remotely") is a known limitation. The store is a local singleton; distributed sync is a future concern.
- **Datalog world-scoped FactSets**: premise-scoped retraction for Datalog facts is a separate problem, referenced in `PREMISES-RETRACTION.md §6`. The store design does not block that work but does not solve it either.
- **Full TMS / justification logs**: the TVS-as-TMS approach handles the common case (source cell retract → downstream weakens → bring-in restores). Cells that have had their TVS entry genuinely GC'd and whose source cell has also moved on require a justification log to resurrect. This is deferred.
