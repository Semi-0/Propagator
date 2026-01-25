# ppropogator

Typescript implementation of propagator system
from the art of propagator & SDF.

Including the implementation of basic cells, 
propagators, support layer, 
generic arithmetic, as well as
simple backtracking(amb op).

The system extends a **vector clock-based reactive system** for transmitting values between cells and propagators. Vector clocks track causality and temporal ordering, enabling correct reactive updates in distributed and concurrent scenarios. Vector clocks can also be used as a **Truth Maintenance System (TMS)**, tracking dependencies and support relationships between values (see `test/advanceReactive.test.ts` and `DataTypes/TemporaryValueSet.ts`). Cells support **reflectivity**, allowing them to observe and react to their own state changes.

## Key Architectural Extensions

Beyond vector clock-based reactivity, this implementation introduces several major architectural changes:

- **Distributed Execution Models**: 
  - **WorkerCell**: Cells can run in isolated worker threads for parallel computation
  - **RemoteCell/SocketIOCell**: Network-based distributed cells for multi-machine computation
  - **SubnetCell**: Isolated subnetworks with independent schedulers

- **Dynamic Behavior System**:
  - **Patch System**: Hot-swappable cell strategies for memory, intake, selection, and emission (see `PatchSystem/`)
  - **Generic Propagator**: Framework for creating generic, extensible propagators with critic-based handler dispatch (actively used in `GenericValueSet` and `PatchedValueSet`)
  - **Object System**: Ergonomic helpers and critics for object-oriented patterns (`comprehensive_object.ts` provides working utilities; `object_propagator.ts` is experimental/commented)

- **Advanced Scheduler Framework**:
  - Multiple scheduler implementations (Simple, Staged, Reactive, Experimental, Proposed)
  - **Promise/Async Support**: Scheduler supports asynchronous operations and promises
  - **Steppable Execution**: Fine-grained control over propagator execution
  - **Replay System**: Ability to replay propagator execution for debugging

- **Virtualization & Isolation**:
  - **Virtual Environment**: Virtual copy operations for isolated execution contexts
  - **CarriedCell**: Cells that carry other cells, enabling nested and structured data

- **Observability**:
  - Both cells and propagators can be observed by external observers
  - Full execution replay and debugging capabilities
  - Visualization and introspection support

## Origins

This library is a TypeScript reimplementation of propagator-based
infrastructure originally developed by Chris Hanson and Gerald Jay
Sussman as part of the SDF system accompanying the book
*Software Design for Flexibility*.

The original implementation is written in MIT/GNU Scheme and released
under the GNU General Public License v3 or later.

This implementation is not a line-by-line translation. It adapts the
core ideas to a modern TypeScript runtime and introduces architectural
changes appropriate to a push-based and distributed execution model.

Todos:
1. simplify premise->cell->amb subs
2. integrate with socket/libp2p for distributed computation
3. localize premises maintainance system(means premises also should notify whatever 
cell it was propagated to for update)




## Installation

### Quick Start

The easiest way to set up the Propagator workspace is using the provided install script:

```bash
git clone https://github.com/Semi-0/Propagator.git
cd Propagator
./install.sh
```

This script will:
- Clone required workspace dependencies (GenericProcedure, Sando)
- Set up the workspace structure
- Install all dependencies using `bun`
- Run tests to verify the installation

### Manual Setup

If you prefer to set up manually:

1. Clone the repository and its dependencies:
```bash
git clone https://github.com/Semi-0/Propagator.git
git clone https://github.com/Semi-0/GenericProcedure.git
git clone https://github.com/Semi-0/Sando.git
```

2. Create a workspace `package.json` in the parent directory:
```json
{
  "name": "propagator-workspace",
  "private": true,
  "workspaces": [
    "Propagator",
    "GenericProcedure",
    "Sando"
  ]
}
```

3. Install dependencies:
```bash
bun install
```

## Usage

### Running Tests

```bash
cd Propagator
bun test
```

### Running Examples

```bash
cd Propagator
bun run index.ts
```

This project was created using `bun init` in bun v1.1.18. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
