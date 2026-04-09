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

### Stage 1 — `CellValueStore` module (no cell changes yet)

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

---

### Stage 2 — Wire `primitive_construct_cell` to the store

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

---

### Stage 3 — Replace `FORCE_UPDATE_ALL_CELLS` with targeted wake

**Goal:** `PremiseMetaData.wake_up_roots` uses the store's premise index.

Replace `wake_up_roots` in `DataTypes/PremiseMetaData.ts`:

```ts
wake_up_roots() {
    const affected = cell_value_store.cells_for_premise(this.name);
    for (const cellId of affected) {
        const cell = get_cell_by_id(cellId);  // from existing cell registry
        if (cell) cell_value_store.test_content(cellId, cell);
    }
    set_global_state(PublicStateCommand.ALERT_ALL_AMBS);
    // FORCE_UPDATE_ALL_CELLS removed
}
```

`get_cell_by_id` uses the existing cell registry populated by `PublicStateCommand.ADD_CELL`.

**Criteria for success:**
- `kick_out` / `bring_in` in `advanceReactive.test.ts` pass
- Premise retraction does not wake cells whose content contains no value from that premise
- `temporaryValueSetIntegration.test.ts` passes (the alias issue in `TODO.md` must also be resolved or explicitly deferred)
- No `FORCE_UPDATE_ALL_CELLS` call remains in production code paths

---

### Stage 4 — Fix `tvs_strongest_consequence` and decouple GC from merge

**Goal:** make premise filtering a pre-step before merge (not interleaved inside it), and stop `value_set_adjoin` from evicting during write.

#### 4a. Fix `tvs_strongest_consequence`

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

Replace with filter-first, matching the pattern already used in `ValueSet.strongest_consequence`:

```ts
// proposed — premise filtering is a pre-step; partial_merge is premise-unaware
export const tvs_strongest_consequence = (content: TemporaryValueSet<any>) => pipe(
    content,
    (elements) => filter(elements, tvs_is_premises_in),
    (filtered) => reduce(filtered, partial_merge, the_nothing)
)
```

The cell content (TVS) still holds all values including premise-out ones — nothing is deleted. Premise-out values simply do not participate in the merge that produces `strongest`. `partial_merge` remains completely premise-unaware; all premise logic is in the filter step.

#### 4b. Remove eviction from `value_set_adjoin`

Remove the `vector_clock_prove_staled_by` eviction call inside `internal_merge_temporary_value_set`. `value_set_adjoin` only adjoins; it never evicts. Eviction moves to the explicit GC pass described in the Value GC Design section.

**Criteria for success:**
- `tvs_strongest_consequence` produces identical results to the current implementation for all existing tests
- `partial_merge` has zero calls to `is_premises_in` / `is_premises_out` — verifiable by grep
- Retracted values survive in the TVS (resurrection without source re-emit works for at least one premise flip cycle)
- GC does not remove values whose premise is currently "in"

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

## Value GC Design

### Why GC is currently entangled with merge

`TemporaryValueSet.value_set_adjoin` (`DataTypes/TemporaryValueSet.ts:89`) calls `vector_clock_prove_staled_by` on every adjoin to filter out dominated entries. This is convenient but wrong for two reasons:

1. **Evicts during retraction**: a premise-out value that happens to be clock-dominated by a newer entry gets removed at merge time, destroying the information needed for resurrection.
2. **Ignores consumer intent**: GC runs blindly on every write. Some propagators may need history; others need nothing beyond the current strongest. A single eviction policy cannot serve both.

After Stage 4, `value_set_adjoin` only adjourns; it never evicts. Eviction is an explicit, context-aware operation driven by what downstream propagators actually need.

---

### `HistoryWant`: a predicate-based value type inside the TVS

`HistoryWant` is a distinct value type that lives **inside the TVS** alongside regular data values. The cell interface stays completely unchanged — `content` is still the TVS, `strongest` is still derived from it. `HistoryWant` entries can carry the same support and vector clock layers as data values, so TMS can later track which propagator justified which retention requirement without any extra machinery.

Rather than storing a count or a channel map, `HistoryWant` holds a **`RetainPredicate`** — a serializable data description of which TVS elements to keep. GC evaluates this predicate against each element to decide what survives. This makes retention criteria arbitrarily composable and extensible without changing the GC machinery.

#### `RetainPredicate` — a closed algebra over TVS elements

```ts
type RetainPredicate =
    | { kind: "none" }                              // retain nothing (⊥)
    | { kind: "all" }                               // retain everything (⊤)
    | { kind: "last_n";    channel: string; n: number }   // last N by clock in channel
    | { kind: "all_from";  channel: string }              // all elements carrying channel
    | { kind: "within_ms"; channel: string; ms: number }  // elements within N ms in channel
    | { kind: "or";  preds: RetainPredicate[] }    // retain if ANY pred matches (join ⊔)
    | { kind: "and"; preds: RetainPredicate[] }    // retain if ALL preds match  (meet ⊓)
```

Evaluation against a single TVS element:

```ts
const retain_matches = (pred: RetainPredicate, element: any, tvs: TemporaryValueSet<any>): boolean => {
    switch (pred.kind) {
        case "none":      return false
        case "all":       return true
        case "last_n":    return rank_in_channel(element, pred.channel, tvs) <= pred.n
        case "all_from":  return has_clock_channel(element, pred.channel)
        case "within_ms": return age_in_channel(element, pred.channel)  <= pred.ms
        case "or":        return pred.preds.some(p  => retain_matches(p, element, tvs))
        case "and":       return pred.preds.every(p => retain_matches(p, element, tvs))
    }
}
```

`rank_in_channel` sorts all TVS elements by clock value for a given channel and returns this element's 1-based position. `age_in_channel` requires a timestamp layer on elements.

#### `HistoryWant` type

```ts
type HistoryWant = {
    kind:      "history_want";
    predicate: RetainPredicate;
}

const is_history_want = register_predicate(
    "is_history_want",
    (v: any): v is HistoryWant => v?.kind === "history_want"
)
```

#### Constructors

```ts
const want_none  = (): HistoryWant => ({ kind: "history_want", predicate: { kind: "none" } })
const want_all   = (): HistoryWant => ({ kind: "history_want", predicate: { kind: "all"  } })

const want_last_n   = (channel: string, n: number):  HistoryWant =>
    ({ kind: "history_want", predicate: { kind: "last_n",    channel, n  } })
const want_all_from = (channel: string): HistoryWant =>
    ({ kind: "history_want", predicate: { kind: "all_from",  channel     } })
const want_within   = (channel: string, ms: number): HistoryWant =>
    ({ kind: "history_want", predicate: { kind: "within_ms", channel, ms } })
```

#### Algebraic operations

`want_or` is the **join** (⊔) — an element is retained if any predicate covers it. This is the correct operation for composing multiple independent propagator wants: the cell must retain what any propagator needs:

```ts
const want_or = (a: HistoryWant, b: HistoryWant): HistoryWant => ({
    kind: "history_want",
    predicate: { kind: "or", preds: [a.predicate, b.predicate] }
})

const want_and = (a: HistoryWant, b: HistoryWant): HistoryWant => ({
    kind: "history_want",
    predicate: { kind: "and", preds: [a.predicate, b.predicate] }
})
```

`want_none()` is the lattice bottom (⊥) — identity under `want_or`. `want_all()` is the top (⊤).

#### Normalization rules

Predicate trees can be simplified before evaluation or storage:

```
or(none, p)   = p          and(all,  p)  = p
or(all,  _)   = all        and(none, _)  = none
or(p,    p)   = p          and(p,    p)  = p     (idempotent)
or(or(a,b),c) = or(a,b,c)                        (flatten nested ors)
```

Normalization is optional but keeps predicate trees from growing unboundedly when many propagators compose their wants.

#### Composition examples

```ts
// retain last 5 from any channel
want_last_n("*", 5)   // or: want_all() with a global rank — depends on implementation

// retain last 3 from source A AND last 7 from source B
want_or(want_last_n("A", 3), want_last_n("B", 7))

// propagator 1 wants last 3 from all channels; propagator 2 wants everything from B
want_or(
    want_last_n("A", 3),   // propagator 1
    want_all_from("B")     // propagator 2
)
// element retained if: (rank in A <= 3) OR (carries channel B)

// the previous count-based want_all(5) and want_channel("B", 7) from earlier designs:
want_or(want_last_n("*", 5), want_last_n("B", 7))
// count-based approach is a special case of predicate-based
```

The `merge_history_want` generic handler (registered for `(is_history_want, is_history_want)`) delegates to `want_or`, so `HistoryWant` entries compose automatically when adjoined into the same TVS.

---

### `tvs_strongest_consequence` splits by type

`tvs_strongest_consequence` filters to data values only — `HistoryWant` entries are invisible to the strongest computation:

```ts
export const tvs_strongest_consequence = (content: TemporaryValueSet<any>) => pipe(
    content,
    (elements) => filter(elements, (e) => tvs_is_premises_in(e) && !is_history_want(get_base_value(e))),
    (filtered) => reduce(filtered, partial_merge, the_nothing)
)
```

A parallel reducer collects the effective `HistoryWant` by joining all `HistoryWant` entries in the TVS with `want_or`:

```ts
export const tvs_history_want = (content: TemporaryValueSet<any>): HistoryWant =>
    pipe(
        content,
        (elements) => filter(elements, (e) => is_history_want(get_base_value(e))),
        (wants)    => reduce(wants,
            (acc, e) => want_or(acc, get_base_value(e)),
            want_none()
        )
    )
```

GC evaluates `retain_matches(tvs_history_want(content).predicate, element, tvs)` per element to decide what survives. No separate storage; no extra cell fields.

---

### How propagators declare their want

On initialization, a propagator writes a `HistoryWant` value into the cell via the standard `update_cell` path:

```ts
// propagator 1 — retain last 3 from channel A
update_cell(input_cell, support_by(want_last_n("A", 3), propagator_1_premise_id))

// propagator 2 — retain everything from channel B
update_cell(input_cell, support_by(want_all_from("B"), propagator_2_premise_id))

// effective predicate via tvs_history_want:
// or(last_n("A", 3), all_from("B"))
// element retained if: rank in A <= 3  OR  carries channel B
```

`HistoryWant` entries survive in the TVS exactly as long as their supporting premise is in — which is exactly when the declaring propagator is active. If a propagator is retracted as a premise, its `HistoryWant` entry weakens out of `tvs_history_want` automatically, and GC tightens retention on the next post-settle pass. New predicate kinds can be added without changing `tvs_history_want`, `tvs_strongest_consequence`, or the GC trigger — only `retain_matches` needs a new case.

---

### Baseline: no `history_want` declared

When `history_want` is empty (no propagator has declared a requirement), the cell retains only what is necessary for correct premise retraction and resurrection:

- **Keep**: any element that is premise-in (required for current `strongest`)
- **Keep**: any premise-out element that is NOT clock-dominated by a premise-in element from the same source (required for resurrection)
- **Evict**: premise-out elements that are clock-dominated by a premise-in element — a newer, currently-believed version already covers them

```
evict(E) iff:
    all channels of E are premise-out
    AND exists E' in TVS:
        vector_clock_prove_staled_by(E, E')
        AND all channels of E' are premise-in
```

---

### With `history_want` declared

For each channel `C` with a declared want `n`, GC retains the `n` most recent elements whose vector clock includes `C`, regardless of premise state. These are kept in addition to the baseline retention set:

```
for each channel C in history_want:
    n = history_want[C]
    sorted = sort elements by clock[C] descending
    mark sorted[0..n-1] as retained for channel C

evict(E) iff:
    E is not in baseline retention set
    AND E is not marked retained for any channel
```

This composes cleanly: an element retained by any channel's want or by the baseline rule survives GC.

---

### Monotone growth and disposal

`history_want` only ever grows. If a propagator that declared `want: 5` is disposed, the cell's `history_want` does not decrease — the history is kept as a safe over-approximation. This matches the monotone model: information is never retracted from `history_want`, only accumulated. In practice, cells accumulate wants from a small fixed set of propagators (their static neighbors), so unbounded growth is not a concern.

If a cell needs to shed history (e.g. after a test reset), the explicit `store.gc_cell(cellId)` call with a zeroed `history_want` handles that.

---

### GC trigger

GC runs **post-settle**: after `wake_up_roots` completes and the propagation queue drains, schedule `gc_cell(cellId)` for each cell in `cells_for_premise(premiseId)`. At that point `test_content` has already run, so `strongest` is correct and GC operates on a stable snapshot.

Explicit `store.gc_cell(cellId)` is also exposed for test boundary resets.

---

### GC and the premise index

After eviction, clean up stale premise index entries:

```ts
const surviving_channels = all_clock_channels(retained);
for each premiseId previously indexed for cellId:
    if premiseId not in surviving_channels:
        store.premise_index.get(premiseId).delete(cellId);
```

Cells whose TVS no longer holds any value from premise `P` are removed from the premise index and will not be woken on future `P` flips.

---

### Boundedness guarantees

| `history_want` state | TVS bound per cell |
|----------------------|--------------------|
| Empty (no wants declared) | O(active premises contributing to cell) |
| `{ C: n }` for channel C | O(n) for channel C + baseline |
| Multiple channels | O(sum of n per channel) + baseline |

In the existing test suite no propagator declares history wants. TVS converges to at most one entry per source channel — bounded by the number of premises in the system.

---

## What Remains Out of Scope for Now

- **Remote / distributed premises**: `PremisesSource.ts` comment ("cannot be tracked remotely") is a known limitation. The store is a local singleton; distributed sync is a future concern.
- **Datalog world-scoped FactSets**: premise-scoped retraction for Datalog facts is a separate problem, referenced in `PREMISES-RETRACTION.md §6`. The store design does not block that work but does not solve it either.
- **Full TMS / justification logs**: the TVS-as-TMS approach handles the common case (source cell retract → downstream weakens → bring-in restores). Cells that have had their TVS entry genuinely GC'd and whose source cell has also moved on require a justification log to resurrect. This is deferred.
