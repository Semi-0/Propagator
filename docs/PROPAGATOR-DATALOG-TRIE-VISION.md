# Propagator Datalog: Trie Fact Store and Leapfrog-as-Network

*Design notes — complements `reactive-datalog-design.md` at repo root*

---

## 1. Motivation

The current propagator-based Datalog wiring is useful as an experiment, but it does not yet treat **relations and joins as first-class propagator structure**. The aim here is a tighter alignment:

- **Trie-shaped partial information** should be a **native cell value**, not an auxiliary index rebuilt beside a flat fact list.
- Each **predicate / relationship** behaves like a **propagator** whose job is to maintain consistency between its underlying trie and the rest of the network.
- The **entire extensional (and derived) fact store** can be seen as a **large structured cell** whose merge semantics expose a **computable interface** (layered objects, vector clocks, premise in/out — same stack as `TemporaryValueSet`).
- **Semi-naïve evaluation** should remain valid **after** the network is built: users can **assert new facts** without tearing down propagators; retractions should flow through **premise metadata** and TVS merge (`TemporaryValueSet.ts`), not ad hoc mutation.

This note spells out that architecture, maps **Leapfrog Triejoin (LFTJ)** to **propagator coordination**, and separates **when contradictions arise** from ordinary accumulation.

---

## 2. Trie as partial information in cells

In the propagator literature, a cell holds **partial information** that becomes more specific under merge. A trie is exactly that for relational data:

- **Structure**: prefix paths encode shared prefixes of ground tuples; insertion is monotone refinement (more paths / leaves).
- **Merge semantics**: merging two trie fragments combines compatible branches; conflicts at the same path may require resolution policy (last-write-wins by clock, or explicit contradiction).

So instead of `Cell<FlatFact[]>` plus a separate index cell, the preferred model is:

```text
Relation R  ──►  Cell<FactTrie[R]>   (or Cell<LayeredObject<FactTrie>>)
```

with merge handlers that know how to combine trie-shaped values **and** layered provenance (vector clock channels, `premises_in` / `premises_out`).

**Dual trie** (current + delta) stays internal to the relation’s **computed view**: delta is not a second conceptual database; it is bookkeeping for semi-naïve rounds, analogous to `DualTrie` in `kiroshi` (`dual_trie.ts`, `semiNaiveStepTrie` in `engine.ts`).

---

## 3. One relation ≈ one propagator; store ≈ composed cell

Conceptually:

| Idea | Role |
|------|------|
| Predicate `P` | Maintains `Cell<Trie_P>` (possibly layered). |
| Rule `head :- body` | A **compound propagator** reading trie cells for literals in `body`, writing derived tuples into `Trie_head` (with provenance). |
| Whole DB | **Product** or **named merge** of relation cells — “one giant cell” only at the type level of store aggregation; physically it can stay a map `pred → Cell`. |

**Adding facts after the network exists** is normal: `update_cell` on the trie cell merges new provenanced tuples. Propagators scheduled from that cell run incrementally; semi-naïve uses **delta trie**, not a full re-scan of EDB.

**Retraction** uses the same pipeline as the rest of Propogator:

- Facts carrying **vector clock / premise layers** enter via `merge_temporary_value_set` / `value_set_adjoin` (`TemporaryValueSet.ts`).
- When a source is invalidated, elements become **weaker** (`premises_out`, stale clock); `strongest_consequence` and `element_subsumes` decide what still counts as believed.
- The trie cell’s **believed** projection shrinks; downstream rule propagators fire accordingly.

No requirement to delete propagators when facts change — only cell contents and scheduler wakeups change.

---

## 4. Layered object as computable interface

Cells already merge **layered** values: base tuple + support / clock layers. The trie should participate as **base structure** or as a dedicated layer, consistently with `LayeredObject` rules:

- **Query / UI / solvers** read **strongest consequence**, not raw merges.
- **Join algorithms** read **structural** views (trie iterators) derived from the same cell snapshot.

The important design constraint: **one authoritative merge lattice** for “what is true now,” with trie operations defined so they respect that lattice (monotone insert/supersede; explicit contradiction only when policy says so).

---

## 5. Three models of recursion in propagator networks

Recursive rules (e.g. transitive closure `path :- path, edge`) need a **semantic choice** for what “repeat until stable” means in wires-and-cells form. At least three distinct patterns should be kept apart:

| Model | Mechanism | What grows |
|--------|-----------|------------|
| **I — Structural (“tail”) recursion** | Each recursive **stage** is compiled into **more propagators** attached to the graph — recursion-as-expansion of the network (compound propagators that install children, staged specialization, or codegen that unrolls depth). | **Topology**: node count / linkage changes as you “go deeper.” |
| **II — Event / history recursion** | Each recursive **round** is a **new event** in partial-information history: another adjoin with a fresher clock, another delta trie slice, or another generation tag in TVS. The **same** subgraph runs; **correctness** lives in provenance and ordering of merges, not in allocating new propagators per step. | **Evidence**: multiset / lattice depth over time, not wiring. |
| **III — Cell feedback (“pull”) recursion** | A **fixed** subgraph where some cells are **both** inputs and outputs of the same propagator(s). Execution **reads** `strongest` / trie snapshot, computes one step, **merges** new facts back into the IDB cell; the scheduler revisits until quiescence or explicit round boundary. | **Cell contents** only; topology fixed. |

**How they relate to Datalog / trie vision:**

- **III** matches the usual **semi-naïve + shared IDB cell** picture: one engine watches `edb` and `idb`, derives new tuples, merges into `idb`; leapfrog runs over **current vs delta** tries until no delta remains — **fixpoint in state**, not in graph size.
- **II** aligns **vector clocks**, **dual trie**, and §8’s history trie: “recursive step” is **another observable transition** in stored partial history (audit-friendly, retract-friendly when provenance is threaded).
- **I** appears when the **rule set or query shape** itself is specialized per depth (dynamic rule installation, template expansion, or very explicit structural unfolding). It is powerful but easy to confuse with fixed-point iteration unless scope is narrow.

These models **compose**: e.g. **III** for steady-state evaluation, **II** for explaining *why* round k fired, **I** only when you deliberately grow the network (new predicates, new rules hot-loaded).

---

## 6. Leapfrog trie join ↔ propagator network (cursor / max index)

Leapfrog coordination is **local**: at each variable, iterators agree on a key by repeatedly advancing the **minimum** iterator to match the **maximum** key (`seek` to max). Globally, every trie participates through its **cursor position** in a shared variable order.

**Propagator mapping sketch:**

- Each **TrieIterator** can be backed by a **small propagator** or by shared state held in a **cursor cell** updated whenever iterators leap / descend / ascend.
- **“Jump to the maximum cursor”** is exactly the **seek(max_key)** step: the lagging iterators align to the same frontier.
- Multiple iterators **do not send arbitrary messages** — they **couple only through shared bound variables** (and the trie structure), which matches propagator **directionality**: trie cells are inputs; cursor state is ephemeral or stored in cells dedicated to the active rule evaluation.

So LFTJ is not “separate from propagators”; it is the **numeric heart** of a **join subgraph** that could be realized as:

```text
Trie cells for each literal  ──►  leapfrog micro-scheduler  ──►  head trie / output facts
                                    (seek / next / open / up)
```

Whether that micro-scheduler is imperative code inside one propagator or split across several is an implementation choice; **semantically**, it is still “partial information flowing until join stabilizes on this variable binding.”

Implemented references in-repo: `kiroshi_core/engine.ts` (`leapfrogSearch`, `TrieIterator`, `semiNaiveStepTrie`), and Clojure sketches in `kiroshi_core/leapfrog.clj`.

---

## 7. Decoupling query expression and solver (AMB-like)

If **constraints** are ordinary propagators over cells (including trie-backed relation cells), then:

- The **textual / AST rule form** becomes one possible **frontend** that installs propagators.
- Alternative frontends (GUI constraints, incremental API, other solvers) attach to the **same cells**, without owning the engine internals.

This mirrors **AMB-style** separation: search structure lives in the network; expressions only **wire** cells. Datalog rules are then **one declarative compiler target**, not the sole owner of execution.

---

## 8. Vector clock history as trie-shaped evidence (meta-Datalog)

`TemporaryValueSet` keeps not a single timestamp but a **set of layered elements**, each carrying **vector clock channels** (`get_vector_clock_layer`, `prove_staled_by`, `element_subsumes` in `TemporaryValueSet.ts`; clocks as `Map<SourceID, Clock>` in `AdvanceReactivity/vector_clock.ts`). That gives two orthogonal trie-shaped views:

**A. Tuple trie (extensional)** — keys are **ground relation arguments**; paths are shared prefixes of facts.

**B. History / clock trie (intensional over time)** — keys are **sources and ticks** (or a canonical serialization of clock prefixes). Each update walks deeper along “who asserted what, after whom.” A **prefix** of a vector clock can be read as a path in a trie over `(channel × ordinal)` space; comparing clocks is already **partial order** reasoning on those paths.

If **B** is made explicit and stable:

- The **history** of a cell’s TVS — not only `strongest_consequence` today but the **evidence DAG** implied by dependencies — becomes another **partial-information structure** you can store or summarize in trie form (exact shape depends on whether you log every adjoin or only frontier snapshots).
- **Propagator dependencies** (which cells fed which merges) give **edges** between clocks: “this derived fact’s clock includes channels inherited from these upstream cells.” That is exactly the kind of **relational** data Datalog handles well.

Then a **second-layer Datalog** (or the same engine with different predicates) can state rules over **meta-facts**, for example:

- `caused_by(DerivedClock, UpstreamClock)` from dependency wiring at derivation time.
- `dominates(A, B)` when `vector_clock_subsumes` / `prove_staled_by` holds — aligning with existing TVS predicates.
- Temporal or diagnostic queries: “what tuples were supported **only** by premise sets later retracted?” once retractions are represented as clock movement or `premises_out`.

So **the same propagator + trie + Datalog toolkit** could **reason about the history of cells**, not only their current strongest view — provided you commit to:

1. **Retention policy** — full TVS vs bounded log vs materialized summaries (otherwise history explodes).
2. **Canonical encoding** — how a vector clock maps to trie keys so leapfrog and merge stay coherent (multi-dimensional clocks may need a total order or a fixed channel enumeration).
3. **Derived provenance threading** — IDB facts must carry **merged** upstream clocks (already required for Strategy B retraction in `reactive-datalog-design.md`); history-queries stay honest only if those merges are stored or reconstructible.

This does **not** require every clock comparison to be physically stored as a trie on disk; the claim is **structural**: **history has trie-shaped joins** similar to relation trie joins, so **one architectural stance** (trie-backed cells + leapfrog + rules) can unify **data** and **meta-data about belief change**.

---

## 9. Contradictions: what actually bites?

**Pure Horn / monotone Datalog (append-only facts, ∧ only)**  

- Derivation is **subset monotone** in the IDB: new facts add tuples; resolution does not invent negated atoms.
- **Join failure** means “no tuple here,” not a logical contradiction — absence is `the_nothing` / empty branch, not `the_contradiction`.

**Where contradiction *can* appear:**

1. **Explicit merge clash**: merging two **incompatible** layered facts at the **same** tuple identity (if the schema treats tuple key as unique and merge requires disjoint clocks but both are forced IN).
2. **Negation / constraints**: rules like `false :- P(x), Q(x)` or stratified negation, typing constraints, etc., map to **disallowed combinations** — those are exactly the cases that should escalate to **`the_contradiction`** for the propagator lattice to notice.
3. **Multi-valued / ambiguous merge policy**: if trie merge is poorly specified when two sources assert **different payloads** for the same path, the merge must either **branch** (TVS-style set of alternatives), **pick strongest** (clock), or **contradict**.

So: **accumulation alone does not create contradiction**; **conflicting evidence at the same claim** or **negative / constraint rules** do. Join failure alone does not.

For **retraction-heavy** workloads, **non-monotone negation** (NAF) remains hard: propagator monotonicity and well-founded semantics pull in opposite directions — see §10–12 in `reactive-datalog-design.md`.

---

## 10. Known elements from the workspace

These are the parts that already exist or are strongly evidenced by current files:

| Element | Status | Evidence |
|---------|--------|----------|
| Flat Datalog facts/rules | Implemented | `PMatcher/new_match/MiniDatalog.ts` defines `Fact`, `Atom`, `Rule`, `resolve`, `naive_datalog`, and `semi_naive_datalog`. |
| Flat semi-naive delta loop | Implemented | `resolve_semi_naive` picks `delta` for one body literal and `all_facts` for the others. |
| Trie node primitive | Implemented | `kiroshi/kiroshi_core/mtrie.ts` has `MTrieNode`, sorted keys, insert, remove, collect, and path membership. |
| Dual trie | Implemented | `kiroshi/kiroshi_core/dual_trie.ts` keeps `currentTrie` and `deltaTrie`, with `advanceDualTrieRound`. |
| Leapfrog seek primitive | Implemented sketch | `kiroshi/kiroshi_core/join.ts` has `leapfrogSearch`; `engine.ts` uses it inside `joinRuleBody`. |
| Trie semi-naive step | Implemented sketch | `kiroshi/kiroshi_core/engine.ts` has `semiNaiveStepTrie`, swapping one relation to its delta trie per variant. |
| TVS stale / strongest merge machinery | Implemented | `Propogator/DataTypes/TemporaryValueSet.ts` has `value_set_adjoin`, `vector_clock_prove_staled_by`, `element_subsumes`, and `strongest_consequence`. |
| Reactive fact store experiment | Implemented sketch | `kiroshi/kiroshi_core/tvs_runtime.ts` models predicate stores as cells, creates rule runtimes, and supports assert/retract APIs. |
| Dynamic rule installation | Implemented sketch | `reactiveDatalogCarriedRules` builds runtimes from a `Cell<Map<string, Cell<Rule>>>`. |
| Three recursion models | Design vocabulary now explicit | §5 names structural recursion, event/history recursion, and cell-feedback recursion. |

Important caveat: the existing `kiroshi` TVS runtime is **not yet** the final vector-clock TVS story. It uses `FactEntry.active`, clears derived facts on retraction, and calls flat `semi_naive_datalog` per rule. That is a useful baseline, but not yet “provenance-cascaded trie Datalog.”

---

## 11. Unknown elements and decision points

These are the real research / design unknowns:

| Unknown | Why it matters | First resolution bias |
|---------|----------------|-----------------------|
| **Fact identity** | TVS compares layered elements; trie paths compare ground tuple keys. We need one identity rule for “same fact, different provenance.” | Bias toward **tuple path = identity**, provenance = layer/support set. |
| **Trie merge lattice** | `MTrieNode` currently mutates; cells need a lawful merge story. | Bias toward **persistent or copy-on-write trie fragments** first, optimize later. |
| **Layered trie representation** | Is the trie the base value, or are leaves layered facts inside the trie? | Bias toward **layered leaves** first; simpler TVS compatibility. |
| **Derived provenance threading** | Retraction correctness needs IDB facts to remember which EDB/IDB facts supported them. | Bias toward **augment join results with proof/support metadata**, not global side effects. |
| **Multiple derivations of one tuple** | `path(a,c)` may have several proofs; retracting one support should not remove all. | Bias toward **TVS set of proof alternatives** at the leaf. |
| **Round boundary for delta trie** | Semi-naive needs a precise moment when `deltaTrie` is cleared. | Bias toward **explicit round-boundary cell/event**, not hidden mutation in arbitrary code. |
| **Variable order and trie order** | LFTJ wants a global variable order; predicates appear in different rules/orders. | Bias toward **static per-rule order first**, then add multi-order indexes only when needed. |
| **Proper LFTJ vs heuristic leapfrog** | Current code leapfrogs a narrow shared-variable case, not full worst-case-optimal LFTJ. | Bias toward **make the current heuristic correct**, then generalize. |
| **Recursive rule semantics** | Structural recursion, event recursion, and feedback recursion imply different termination and history behavior. | Bias toward **cell feedback for evaluation**, **history events for explanation**. |
| **Retraction strategy** | Full re-derive is simple; provenance-cascade is elegant but harder. | Bias toward **Strategy A as oracle**, Strategy B as optimized implementation to validate against it. |
| **Contradiction policy** | Pure Horn Datalog has no contradiction from failed joins, but constraints and conflicting merges do. | Bias toward **monotone positive Datalog first**, constraints second, negation last. |
| **History trie retention** | Full vector-clock history can grow without bound. | Bias toward **frontier snapshots + optional audit log**, not mandatory full history. |
| **Cell equality / wake policy** | If trie values mutate in place, cells may miss real changes or re-fire too much. | Bias toward **structural version tags or immutable roots**. |

---

## 12. Subproblem decomposition, with bias-aware resolution

This is the suggested problem split. Each subproblem should produce a small primitive or combinator that can be tested independently.

### 12a. Define the domain primitives

**Unknowns:** fact identity, layered leaves vs layered root, arity/predicate metadata.

**Primitive target:**

- `GroundFact = readonly [predicate, ...args]`
- `FactKey = predicate + serialized args`
- `ProvenancedFact = LayeredObject<GroundFact>`
- `FactTrieLeaf = TemporaryValueSet<ProvenancedFact>` or equivalent proof set

**Bias:** keep the **tuple path** clean and structural; put support, clocks, and premise status in the **leaf value**. This separates join navigation from belief/provenance semantics.

### 12b. Define trie merge as a cell value

**Unknowns:** mutable vs persistent implementation; `cell_equal`; pruning after retraction.

**Primitive target:**

- `mergeFactTrie(current, increment)`
- `strongestTrieView(trie)` or `believedFacts(trie)`
- `trieDelta(currentRound)` / `advanceRound`

**Bias:** start conservative: immutable root or versioned mutable root. Cell wakeups should depend on **logical content/version**, not object identity accidents.

### 12c. Preserve a simple oracle evaluator

**Known:** `MiniDatalog.ts` already has flat naive and semi-naive evaluators.

**Target:** keep a flat evaluator as a correctness oracle for small tests:

- trie result equals flat result for positive Datalog
- retraction Strategy A equals full re-derive result
- Strategy B provenance cascade must match Strategy A on tested programs

**Bias:** use the existing flat engine as a **specification harness**, not as the final architecture.

### 12d. Make trie join correct before making it complete

**Known:** `engine.ts` already performs delta variants and calls `leapfrogSearch`; `join.ts` has `trieCandidates`.

**Unknowns:** full multi-variable LFTJ, variable order selection, constraints/equality integration.

**Target path:**

1. Prove binary joins with one shared variable.
2. Add n-way agreement for one variable.
3. Add recursive descent over variable order.
4. Add equality / inequality / finite-domain constraints.

**Bias:** favor **small, total iterator laws** (`open`, `up`, `seek`, `next`, `key`, `atEnd`) over clever special cases.

### 12e. Choose recursion model per layer

**Evaluation layer:** use **III — cell feedback recursion**. Fixed graph, read trie snapshots, derive deltas, merge into IDB.

**History / explanation layer:** use **II — event recursion**. Each round or support merge can become history evidence, indexed by clock/event.

**Rule installation layer:** reserve **I — structural recursion** for dynamic rule loading or deliberate specialization only.

**Bias:** do not grow the propagator graph just to reach a Datalog fixpoint. Grow values first; grow topology only when the program itself changes.

### 12f. Thread provenance through joins

**Unknowns:** how to record proof alternatives, how to combine vector clocks, how to avoid duplicating huge proof trees.

**Target:** join result should be more than `Fact`:

```typescript
type DerivedFact = {
    readonly fact: GroundFact
    readonly support: readonly ProvenancedFact[]
    readonly clock: VectorClockLike
}
```

**Bias:** derive provenance **locally during join**, because the join already knows which candidate facts matched. Avoid reconstructing proofs after the fact.

### 12g. Retraction semantics

**Known:** `TemporaryValueSet.ts` already treats retracted/stale values as weaker instead of deleting them; `tvs_runtime.ts` currently uses active flags and re-derives derived facts.

**Target path:**

1. Implement **Strategy A**: any retraction triggers full re-derive over current believed EDB.
2. Use Strategy A as oracle.
3. Implement **Strategy B**: derived facts carry unioned support clocks; TVS removes/weakens only unsupported proofs.
4. Compare Strategy B to Strategy A in tests.

**Bias:** correctness beats incrementality; use full re-derive until provenance cascade is proven equivalent.

### 12h. History as data

**Unknowns:** retention policy, vector-clock trie key encoding, how much dependency graph to materialize.

**Target predicates:**

- `asserted(FactKey, Clock)`
- `derived(FactKey, RuleId, Clock)`
- `depends_on(ClockA, ClockB)`
- `staled_by(ClockA, ClockB)`

**Bias:** materialize **summaries first** (`depends_on`, `derived`, `staled_by`), not every intermediate trie cursor. The history Datalog layer should explain belief changes without becoming the whole runtime.

### 12i. Contradictions and constraints

**Known:** positive Datalog accumulation is monotone; join failure is absence, not contradiction.

**Target path:**

1. Positive Datalog only.
2. Explicit constraint rules (`false :- bad_combination(...)`).
3. Stratified negation only after the monotone engine and retraction are stable.

**Bias:** keep contradiction policy explicit and small. Do not let ordinary “no join result” leak into `the_contradiction`.

---

## 13. Open design tensions (honest checklist)

1. **Trie key order vs multiple variable orders**: LFTJ may need multiple tries or multi-order indexes per predicate (already flagged in `reactive-datalog-design.md` §11e).
2. **Dual trie round boundary**: delta must reset in sync with scheduler rounds (`dual_trie_advance_round` pattern).
3. **Provenance on derived tuples**: for Strategy B retraction, joins must thread **which base facts** contributed — flat `resolve_semi_naive` must grow provenance-aware variants (`MiniDatalog.ts` / `engine.ts` evolution).
4. **Fact identity**: TVS distinguishes layers on **elements**; trie paths must align with **element identity** for adjoin/supersede to stay correct.
5. **History layer**: materializing clock/evidence tries alongside tuple tries duplicates storage unless summarized; indexing strategy for “query past belief” vs “current belief” should stay explicit.
6. **Recursion model choice**: mixing **I** (grow graph) with **III** (feedback cell) without discipline duplicates work or breaks termination guarantees — pick the leading model per subsystem.

---

## 14. Related files

| Area | Location |
|------|----------|
| TVS merge, stale, strongest | `Propogator/DataTypes/TemporaryValueSet.ts` |
| Full reactive Datalog sketch | `reactive-datalog-design.md` (repo root) |
| Trie + leapfrog + semi-naïve | `kiroshi/kiroshi_core/engine.ts`, `mtrie.ts`, `dual_trie.ts`, `join.ts` |
| Premise / clock helpers | `Propogator/DataTypes/PremiseMetaData.ts`, `AdvanceReactivity/vector_clock.ts` |

---

## 15. One-sentence thesis

**Treat trie-backed relations as propagator cells carrying layered partial information; compile rules into join subgraphs whose leapfrog dynamics mirror iterator coordination; use TVS semantics for growth and retraction; reserve `the_contradiction` for genuine clashes or constraint violations, not empty joins.**

A longer horizon: **tuple tries for “what,” clock / evidence tries for “why and when,”** both fed by the same TVS and dependency-aware propagator network so **Datalog can query data and the evolution of belief** where provenance is complete enough.
