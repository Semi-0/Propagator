# Propogator TODO

- `temporaryValueSetIntegration.test.ts` was relying on named source keys like `"A"` / `"sourceA"` for `kick_out(...)` and `bring_in(...)`.
- `PremisesSource.ts` currently registers source cells by `cell_id(cell)`, so name-based retracts need an alias path to work consistently.
- Keep the retract/bring-in semantics aligned with `advanceReactive.test.ts` and prefer direct source-cell updates where possible.
