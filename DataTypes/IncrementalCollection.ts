/**
 * IncrementalCollection — differential dataflow on Propogator cells.
 *
 * Implementation lives under `./IncrementalCollection/`; this file is the
 * stable entry point so imports like `from "../DataTypes/IncrementalCollection"`
 * keep working.
 */
export * from "./IncrementalCollection/diffAlgebra";
export * from "./IncrementalCollection/versionFrontier";
export * from "./IncrementalCollection/messagesTrace";
export * from "./IncrementalCollection/operatorFactory";
export * from "./IncrementalCollection/operators";
export * from "./IncrementalCollection/ceWrappers";

import "./IncrementalCollection/registerDispatch";
