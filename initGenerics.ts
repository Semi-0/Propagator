/**
 * Generic Procedure Handler Initialization
 * 
 * This file ensures all generic procedure handlers are registered in the correct order
 * to avoid circular dependency issues. Import this file BEFORE using any Cell, Propagator,
 * or Relation functionality that depends on generic procedures.
 * 
 * Order of initialization:
 * 1. First, all core modules are imported (Cell, Propagator, Relation)
 * 2. Then, generic handlers are registered for each type
 * 
 * This file should be imported at the entry point of your application or test suite.
 */

// This import order is critical to avoid circular dependencies
import "./DataTypes/RelationGenerics";
import "./Cell/CellGenerics";
import "./Propagator/PropagatorGenerics";

export const GENERICS_INITIALIZED = true;


