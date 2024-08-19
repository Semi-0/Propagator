import { describe, it, expect } from "bun:test";
import { ValueSet, construct_value_set } from "../DataTypes/ValueSet";
import { construct_cell_value, get_cell_value } from "../Cell/CellValue";
import { add } from "generic-handler/built_in_generics/generic_arithmetic";

describe("ValueSet", () => {
  it("should create a ValueSet with given elements", () => {
    const elements = [construct_cell_value(1), construct_cell_value(2)];
    const valueSet = construct_value_set(elements);
    expect(valueSet.elements.get_length()).toBe(2);
  });


  it("should add two ValueSets", () => {
    const elements1 = [construct_cell_value(1)];
    const elements2 = [construct_cell_value(2)];
    const valueSet1 = construct_value_set(elements1);
    const valueSet2 = construct_value_set(elements2);
    const result = add(valueSet1, valueSet2);
    expect(result.elements.get_length()).toBe(2);
  });

  it("should check if a value is a ValueSet", () => {
    const elements = [construct_cell_value(1)];
    const valueSet = construct_value_set(elements);
    expect(valueSet instanceof ValueSet).toBe(true);
  });

  it("should map a procedure over a ValueSet", () => {
    const elements = [construct_cell_value(1), construct_cell_value(2)];
    const valueSet = construct_value_set(elements);
    // @ts-ignore
    const result = valueSet.elements.map((el) => construct_cell_value(get_cell_value(el) * 2));
    expect(result.get_length()).toBe(2);
    expect(get_cell_value(result.get_value(0))).toBe(2);
    expect(get_cell_value(result.get_value(1))).toBe(4);
  });
});