import { describe, it, expect, beforeAll } from "bun:test";
import {  is_contradiction, is_nothing, the_contradiction, the_nothing } from "../Cell/CellValue";
import { force_load_arithmatic } from "../Cell/GenericArith";
import { force_load_CellValue } from "../Cell/CellValue";
import { add, divide, multiply, subtract } from "generic-handler/built_in_generics/generic_arithmetic";

beforeAll(() => {
    force_load_CellValue()
    force_load_arithmatic()
})



describe("The Nothing", () => {
    it("critic for the nothing should work", () => {
        const value = the_nothing;
        expect(is_nothing(value)).toBe(true);
    });
});

describe("The Contradiction", () => {
    it("critic for the contradiction should work", () => {
        const value = the_contradiction;
        expect(is_contradiction(value)).toBe(true);
    });
});


describe("the_nothing with arithmetic", () => {
    it("any arithmetic with the_nothing should return the_nothing", () => {
        force_load_arithmatic()
        const value = the_nothing;
        expect(is_nothing(add(value, "1"))).toBe(true);
        expect(is_nothing(multiply(value, "1"))).toBe(true); 
        expect(is_nothing(divide(value, "1"))).toBe(true);
        expect(is_nothing(subtract(value, "1"))).toBe(true);
    });
});

describe("the_contradiction with arithmetic", () => {
    it("any arithmetic with the_contradiction should return the_contradiction", () => {
        force_load_arithmatic()
        const value = the_contradiction;
        expect(is_contradiction(add(value, "1"))).toBe(true);
        expect(is_contradiction(multiply(value, "1"))).toBe(true); 
        expect(is_contradiction(divide(value, "1"))).toBe(true);
        expect(is_contradiction(subtract(value, "1"))).toBe(true);
    });
});