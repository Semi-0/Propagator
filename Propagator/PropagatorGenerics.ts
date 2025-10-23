/**
 * Generic procedure handlers for Propagator type
 * 
 * This file registers handlers for generic procedures that operate on Propagators.
 * It must be imported after both Propagator.ts and Generics.ts are loaded.
 */

import { define_generic_procedure_handler } from 'generic-handler/GenericProcedure';
import { match_args} from 'generic-handler/Predicates';
import { identify_by } from 'generic-handler/built_in_generics/generic_better_set';
import { to_string } from 'generic-handler/built_in_generics/generic_conversation';
import { get_children, get_id } from '../Shared/Generics';
import { is_propagator, propagator_id, propagator_children, type Propagator } from './Propagator';

// Register to_string handler for Propagator
define_generic_procedure_handler(to_string, match_args(is_propagator), (propagator: Propagator) => {
    return propagator.summarize();
});

// Register identify_by handler for Propagator
define_generic_procedure_handler(identify_by, match_args(is_propagator), propagator_id);

