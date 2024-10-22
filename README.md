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









To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.18. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
