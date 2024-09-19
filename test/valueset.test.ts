import { describe, it, expect } from "bun:test";
import { ValueSet, construct_value_set } from "../DataTypes/ValueSet";
import { add } from "generic-handler/built_in_generics/generic_arithmetic";
import { get_length } from "generic-handler/built_in_generics/generic_better_set";

describe("ValueSet", () => {
  it("should create a ValueSet with given elements", () => {
    const elements = [1, 2];
    const valueSet = construct_value_set(elements);
    expect(get_length(valueSet.elements)).toBe(2);
  });


  it("should add two ValueSets", () => {
    const elements1 = [1];
    const elements2 = [2];
    const valueSet1 = construct_value_set(elements1);
    const valueSet2 = construct_value_set(elements2);
    const result = add(valueSet1, valueSet2);
    expect(get_length(result.elements)).toBe(3);
  });

  it("should check if a value is a ValueSet", () => {
    const elements = [1];
    const valueSet = construct_value_set(elements);
    expect(valueSet instanceof ValueSet).toBe(true);
  });


});