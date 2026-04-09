# `Propagator/` module documentation

This folder holds **human-oriented notes** for the core propagator implementation (the directory that contains `Propagator.ts`, built-in propagators, and sugar). Source files remain alongside code; these docs are an index and map.

## Source layout (this directory)

| File | Role |
|------|------|
| [`Propagator.ts`](../Propagator.ts) | `Propagator` interface, `construct_propagator`, `compound_propagator`, disposal, activation wiring to cells |
| [`BuiltInProps.ts`](../BuiltInProps.ts) | Standard primitive propagators (`p_sync`, switches, constants, arithmetic-facing helpers, …) |
| [`HelperProps.ts`](../HelperProps.ts) | Composed helpers built from primitives |
| [`PropagatorGenerics.ts`](../PropagatorGenerics.ts) | Generic-procedure hooks for propagator identity / children (kept separate to limit cycles) |
| [`Search.ts`](../Search.ts) | Search / `amb`-style exploration support |
| [`Sugar.ts`](../Sugar.ts) | Ergonomic cell-level constructors (`make_ce_arithmetical`, …) |
| [`ErrorHandling.ts`](../ErrorHandling.ts) | Error propagation helpers |

## Wider repo docs

- **Project overview:** [`../../README.md`](../../README.md)
- **Patch / reactive cell strategies:** [`../../PatchSystem/README.md`](../../PatchSystem/README.md) and sibling files in `PatchSystem/`
- **Worker-backed cells:** [`../../Cell/WorkerCell/README.md`](../../Cell/WorkerCell/README.md)
- **Design scratchpad:** [`../../TODO.md`](../../TODO.md)

Add new notes here under `Propagator/docs/` (e.g. `Propagator/docs/design/…`) when they belong specifically to this module rather than the whole library.
