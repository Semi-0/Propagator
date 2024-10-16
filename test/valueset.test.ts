import { describe, it, expect } from "bun:test";
import { ValueSet, construct_value_set } from "../DataTypes/ValueSet";
import { add } from "generic-handler/built_in_generics/generic_arithmetic";
import { construct_better_set, set_get_length as get_length, merge_set, to_array } from "generic-handler/built_in_generics/generic_better_set";
import { get_support_layer_value, support_by } from "sando-layer/Specified/SupportLayer";
import { get_base_value } from "sando-layer/Basic/Layer";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";

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
    expect(result.to_array()).toEqual([3]);

  });

  it("should able to add multiple elements", () => {
    const elements = [1, 2];
    const valueSet = construct_value_set(elements);
    const valueSet2 = construct_value_set([4, 5]);
    const result = add(valueSet, valueSet2);
    expect(result.to_array()).toEqual([5, 6, 7]);
  });

  it("should add multiple layered objects", () => {
    const elements = [1, 2];
    const valueSet = construct_value_set(elements.map(e => (support_by(e, "f"))));
    const valueSet2 = construct_value_set([4, 5].map(e => (support_by(e, "f"))));
    
    const result = add(valueSet, valueSet2);
    // @ts-ignore
    const base_result = result.to_array().map(e => get_base_value(e))
    // @ts-ignore
    const support_result = result.to_array().map(e => get_support_layer_value(e)).reduce((acc, curr) => merge_set(acc, curr), construct_better_set([], (a) => a))
    expect(base_result).toEqual([5, 6, 7]);
    console.log(support_result)
    expect(to_array(support_result)).toEqual(["f"]);
  });

  it("should check if a value is a ValueSet", () => {
    const elements = [1];
    const valueSet = construct_value_set(elements);
    expect(valueSet instanceof ValueSet).toBe(true);
  });


});