import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure";

export const strongest_value = construct_simple_generic_procedure("strongest_value", 1, (a: any[]) => {
    return a;
})


