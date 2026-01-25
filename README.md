# ppropogator

Typescript implementation of propagator system
from the art of propagator & SDF.

Including the implementation of basic cells, 
propagators, support layer, 
generic arithmetic, as well as
simple backtracking(amb op).

The system extends a **vector clock-based reactive system** for transmitting values between cells and propagators. Vector clocks track causality and temporal ordering, enabling correct reactive updates in distributed and concurrent scenarios. Vector clocks can also be used as a **Truth Maintenance System (TMS)**, tracking dependencies and support relationships between values (see `test/advanceReactive.test.ts` and `DataTypes/TemporaryValueSet.ts`). Cells support **reflectivity**, allowing them to observe and react to their own state changes. The system includes a more generic scheduler that supports promises, which is different from the scheme implementation.

Both cells and propagators can be observed by external observers, opening up possibilities for visualization and debugging of the reactive computation flow.


Todos:
1. simplify premise->cell->amb subs
2. integrate with socket/libp2p for distributed computation
3. localize premises maintainance system(means premises also should notify whatever 
cell it was propagated to for update)




To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.18. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
