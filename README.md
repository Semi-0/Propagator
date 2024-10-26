# ppropogator

Typescript implementation of propagator system
from the art of propagator & SDF.

including the implementation of basic cells, 
propagaters, support layer, 
generic arithmetic, as well as
simple backtracking(amb op).

I made a customized observer-based reactive system,
which is different from the scheme implementation,
and a more generic scheduler supports promise.
So, both the cell and propagator could be observed by external observers,
this could potentially open up some possibilities for visualization.



todo:
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
