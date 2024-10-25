# ppropogator


Typescript implementation of propagator system
from the art of propagator & SDF.

Includes implementation of basic cell, 
propagates, supported value, 
generic arithmetic, as well as
simple backtracking(amb op).

i made a customized push based reactive system,
which difference from the scheme impl,
and a more generic simple scheduler supports promise.
So both the cell and propagator could be observed by external observer,
this could opens up some possibilities for visualization.




todo:
1. simplify premise->cell->amb subs
2. integrate with socket/libp2p for distributed computation
3. localize premises maintain system(means premises also should notify whatever 
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
