# ppropogator

Typescript implementation of propagator system
from the art of propagator & SDF.

Including the implementation of basic cells, 
propagators, support layer, 
generic arithmetic, as well as
simple backtracking(amb op).

Also, a customized observer-based reactive system has been included for 
transmitting values between cells and propagators, and a more generic scheduler supports promise,
which is different from the scheme implementation.

So, both the cell and propagator could be observed by external observers,
this could potentially open up some possibilities for visualization.


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
