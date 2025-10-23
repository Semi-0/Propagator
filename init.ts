/**
 * Initialization module for Propogator
 * 
 * This file must be imported AFTER all other modules to register
 * generic procedure handlers that have circular dependencies.
 */

// Import the RelationGenerics to register Relation handlers
import "./DataTypes/RelationGenerics";

// All generic handlers should now be registered
export const initialized = true;


