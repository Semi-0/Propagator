import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";

export const same_source = construct_simple_generic_procedure("same_source", 2, () => {throw new Error("same_source is not defined for traced_timestamp")}) 

