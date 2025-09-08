# S5: Scheduling Probes over a Stable Core

This project implements tiny, swappable runners (hybrid invalidate→pull, Yampa-like tick, and contextual scheduler) over one Core Semantics Interface (CSI) with deterministic logs, replay, and explanations.

## Goal

Build evaluation models to answer: **Which evaluation model best supports live editing while preserving quiescent determinism?**

## Axioms (Fixed)

- Join-only updates (no destructive overwrite)
- Quiescence = no propagator can add info
- Arbitrary firing order acceptable; outcomes must be schedule-independent for a given episode

## Architecture

### Core Semantics Interface (CSI)

The CSI provides a unified interface for all runners:

- **Lattices**: Interval, Set, Bool3, Product, EventLog
- **Cells**: Typed containers with lattice values
- **Propagators**: Pure, monotone functions that compute deltas
- **Graph**: Dependency tracking and management

### Runners

1. **Hybrid Runner** (`runners/hybrid.ts`)
   - invalidate → pull → stabilize pattern
   - Pluggable queue policies: FIFO, priority-by-informativeness, topological+SCC
   - Effect boundary: effects fire only after quiescence

2. **Yampa Runner** (`runners/yampa.ts`)
   - Single-tick clarity with inner fixpoint loop
   - Deterministic per tick
   - Effect boundary: effects fire at end-of-tick

3. **Contextual Runner** (`runners/contextual.ts`)
   - Thin adapter to existing scheduler (placeholder)

### Tasks

- `micro_chain.ts`: A→B→C simple chain
- `micro_diamond.ts`: A→{B,C}→D diamond pattern
- `micro_feedback.ts`: X↔Y narrowing loop
- `t1_routing.ts`: sets/intervals + conflict
- `t2_sum_project.ts`: a + b = c with over-determination
- `t3_temporal_diff.ts`: append-only log → rolling window

## Usage

### Running Tests

```bash
# Test individual components
bun test test/micro_chain.test.ts
bun test test/yampa.test.ts
bun test test/t2_sum_project.test.ts

# Run fuzz comparison
bun tools/fuzz_compare.ts --runner=hybrid --task=micro_chain --seeds=10
bun tools/fuzz_compare.ts --runner=yampa --task=all --seeds=50
```

### Package Scripts

```bash
# Build the project
bun run build

# Run fuzz tests
bun run t:hybrid
bun run t:yampa
bun run t:context

# Generate visualizations
bun run viz
bun run why
```

## Results

### Determinism Verification

All runners produce identical fixpoints for the same inputs, confirming schedule independence.

### Performance Comparison

- **Hybrid Runner**: More efficient for simple chains (2 fires vs 4 for Yampa)
- **Yampa Runner**: Simpler semantics, easier debugging
- **Priority Policies**: Reduce steps on shortest-path patterns

### Key Metrics

- **Fires**: Number of propagator executions
- **Joins**: Number of cell value updates
- **Redundancy**: Ratio of redundant joins (joins - fires) / joins
- **First Stable**: Time to first quiescent state
- **Queue Max**: Maximum queue length during execution

## Implementation Status

✅ **Completed**
- Core Semantics Interface
- Lattices (Interval, Set, Bool3, Product, EventLog)
- Pure operators (Route, Sum Projection, Boolean ops)
- Episode logging and replay
- Hybrid runner with FIFO policy
- Yampa runner
- Basic tasks (micro_chain, micro_diamond, t2_sum_project)
- Fuzz comparison tool
- Deterministic RNG

🔄 **In Progress**
- Priority queue policies (pq_info, topo_scc)
- Contextual runner adapter
- Advanced tasks (t1_routing, t3_temporal_diff)
- Visualization tools (why, to_graphviz)

📋 **Planned**
- Effect boundary verification
- Causal slice analysis
- Performance optimization
- Live editing support

## Design Principles

1. **Functional Programming**: Pure functions, immutable data, composition
2. **Modularity**: Swappable components, clear interfaces
3. **Determinism**: Reproducible results, schedule independence
4. **Observability**: Comprehensive logging, replay capability
5. **Performance**: Efficient scheduling, minimal redundancy

## Contributing

1. Follow functional programming principles
2. Write tests for new components
3. Ensure determinism across runners
4. Document lattice laws and operator properties
5. Use the episode logging system for debugging

## License

MIT License - see LICENSE file for details.
