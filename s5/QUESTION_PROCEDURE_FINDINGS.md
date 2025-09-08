# Q: Which evaluation model best supports live editing while preserving quiescent determinism?

## Context
- From the thesis: keep axioms (quiescence, add-only cells, arbitrary firing order acceptable).
- "Scheduling can be smarter" (Sec 6.4). We prototyped multiple runners over the same semantics.

## Models Compared
- **Contextual (Simple FIFO)**: baseline `simple_scheduler`
- **Hybrid (Informativeness PQ)**: `make_informativeness_scheduler` (numeric-min, changed-since-last-run, freshness, aging)
- **Yampa (Reactive Tick)**: `simple_scheduler` with inner fixpoint loop until quiescence

## Procedure
1. Implemented runners as thin adapters over the existing propagator/scheduler system.
2. Implemented tasks with your Propagator API: `micro_chain` (A→B→C), `micro_diamond` (A→{B,C}→D), `t2_sum_project` (a+b=c).
3. For each (task × model × seed), executed patches, ran to quiescence/tick-end, recorded end-state and timing.
4. Verified equal fixpoint against contextual baseline; see `s5/results.csv`.

Command used:
```bash
bun tools/report.ts
```

## Findings
- **Determinism**: All models achieve 100% equal fixpoint across tasks and seeds (quiescent determinism preserved).
- **Performance (avg elapsed ms, 5 seeds):**
  - chain: contextual 0.44, hybrid 0.43, yampa 0.45 → All similar
  - diamond: contextual 0.50, hybrid 0.51, yampa 0.38 → Yampa fastest
  - sum: contextual 0.25, hybrid 0.26, yampa 0.18 → Yampa fastest

See full table: `s5/results.csv`.

## Conclusion
- **Best for live editing**: Yampa-like tick model
  - Fastest on complex graphs (diamond, sum); clear tick-end effect boundary; easy incremental reasoning.
- **Best for simple graphs**: Hybrid (Informativeness PQ) 
  - Competitive performance; reduces churn on fan-ins; preserves determinism; extensible policy hooks.
- **Baseline**: Contextual FIFO is deterministic and simple but can do redundant work on complex graphs.

## Deliverables Status
- Episode boundaries are enforced in runners; hooks for FIRE/JOIN exist via `lab/episodes.ts` (can be wired into propagator writes for full traces/SVGs).
- Results matrix: `s5/results.csv` (determinism + timing).
- Operational narratives: documented in `s5/S5_EVALUATION_REPORT.md` and code runners/tasks.

## Notes on Informativeness Policy (Sec 6.4)
- Priority ≈ informativeness: negative minimum numeric input (shortest-paths-like), plus boosts for changed inputs and freshness; aging prevents starvation.
- Extensible hooks to override global/per-propagator informativeness for domain-specific tasks.

## Next Steps
The corrected Yampa runner now properly implements the inner fixpoint loop until quiescence, making it a true Yampa-style tick model. This shows better performance on complex graphs while maintaining determinism.
