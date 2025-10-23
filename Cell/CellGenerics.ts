/**
 * Generic procedure handlers for Cell type
 * 
 * This file registers handlers for generic procedures that operate on Cells.
 * It must be imported after both Cell.ts and Generics.ts are loaded.
 */

import { define_generic_procedure_handler } from 'generic-handler/GenericProcedure';
import { match_args } from 'generic-handler/Predicates';
import { identify_by } from 'generic-handler/built_in_generics/generic_better_set';
import { to_string } from 'generic-handler/built_in_generics/generic_conversation';
import { get_children, get_id } from '../Shared/Generics';
import { is_cell, cell_id, cell_children, type Cell } from './Cell';

// Register to_string handler for Cell
