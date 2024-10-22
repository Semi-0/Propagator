# ppropogator


typesscript implementation of propagator system
from the art of propagator & SDF.

Includes implementation of basic cell, 
propagates, supported value, 
generic arithmetic, as well as
simple backtracking(amb op).

The main difference from the scheme inplementation is
it used a customized push based reactive system,
and a more generic simple scheduler which supports promise.
So both the cell and propagator could be observed by external observer,
this could opens up other possibility of visualization.









To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.18. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
