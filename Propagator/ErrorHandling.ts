import { construct_advice, install_advice } from "generic-handler/built_in_generics/generic_advice"
import { generic_wrapper } from "generic-handler/built_in_generics/generic_wrapper";
import { primitive_propagator } from "./Propagator";



export const error_handling_function = (module_name: string, f: (...args: any[]) => any) =>
     (...args: any[]) => {
    try {
        return f(...args);
    } catch (error) {
        console.error(`Error in ${module_name}:`, error,
            "propagator_name", module_name,
            "args", args,
        );
        throw error;
    }
}


 