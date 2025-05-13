import { construct_node } from "./MrPrimitive";
import { stepper } from "./MrPrimitiveCombinators";


export const construct_state = <A>(initial: A) => stepper(initial)(construct_node());
