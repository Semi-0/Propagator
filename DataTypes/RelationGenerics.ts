/**
 * Generic procedure handlers for Relation type
 * 
 * This file must be imported after Generics.ts to avoid circular dependencies
 */

import { define_generic_procedure_handler } from 'generic-handler/GenericProcedure';
import { match_args } from 'generic-handler/Predicates';
import { get_children, get_id } from '../Shared/Generics';
import { is_relation, type Relation } from './Relation';

// Register get_children handler for Relation
define_generic_procedure_handler(get_children, match_args(is_relation), (relation: Relation) => {
    return relation.get_children();
});

// Register get_id handler for Relation
define_generic_procedure_handler(get_id, match_args(is_relation), (relation: Relation) => {
    return relation.get_id();
});


