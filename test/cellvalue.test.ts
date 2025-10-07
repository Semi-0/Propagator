import { describe, it, expect, beforeAll } from "bun:test";
import {  is_contradiction, is_nothing, the_contradiction, the_nothing } from "../Cell/CellValue";
import { force_load_CellValue } from "../Cell/CellValue";
import { add, divide, multiply, subtract } from "../AdvanceReactivity/Generics/GenericArith";
import { is_no_compute } from "../Helper/noCompute";

beforeAll(() => {
    force_load_CellValue()
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


