

import { is_layered_object as _is_layered_object } from "sando-layer/Basic/LayeredObject"; 
import { register_predicate } from "generic-handler/Predicates";

export const is_layered_object = register_predicate("is_layered_object", (value: any) => _is_layered_object(value))