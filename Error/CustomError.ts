// CustomError.ts
export class CustomError extends Error {
    constructor(message: string) {
        super(message);
        // This is needed to make instanceof work correctly
        Object.setPrototypeOf(this, CustomError.prototype);
        // Set the name property to the class name
        this.name = this.constructor.name;
    }
}