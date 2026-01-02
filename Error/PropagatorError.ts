import type { Propagator } from "../Propagator/Propagator";
import { CustomError } from "./CustomError";

export class PropagatorError extends CustomError {
    constructor(
        message: string,
        public readonly propagator_description: string,
        public readonly error: Error,
        public readonly context?: unknown
    ) {
        super(message  + " " + propagator_description + " " + error.message);
    }
}
