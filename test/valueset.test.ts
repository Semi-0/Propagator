import { describe, it, expect } from "bun:test";
import { construct_value_set, element_subsumes } from "../DataTypes/ValueSet";
import { add } from "generic-handler/built_in_generics/generic_arithmetic";
import { construct_better_set, is_better_set } from "generic-handler/built_in_generics/generic_better_set";
import { construct_defualt_support_set, get_support_layer_value, support_by, support_layer } from "sando-layer/Specified/SupportLayer";
import { get_base_value } from "sando-layer/Basic/Layer";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { length } from "generic-handler/built_in_generics/generic_collection";
describe("ValueSet", () => {
  it("should create a ValueSet with given elements", () => {
    const elements = [1, 2];
    const valueSet = construct_value_set(elements);
    expect(length(valueSet)).toBe(2);
  });



  // it("should add multiple layered objects", () => {
  //   const elements = [1, 2];
  //   const valueSet = construct_value_set(elements.map(e => (support_by(e, "f"))));
  //   const valueSet2 = construct_value_set([4, 5].map(e => (support_by(e, "f"))));
    
  //   const result = add(valueSet, valueSet2);
  //   // @ts-ignore
  //   const base_result = result.to_array().map(e => get_base_value(e))
  //   // @ts-ignore
  //   const support_result = result.to_array().map(e => get_support_layer_value(e)).reduce((acc, curr) => merge_set(acc, curr), construct_better_set([], (a) => a))
  //   expect(base_result).toEqual([5, 6, 7]);
  //   console.log(support_result)
  //   expect(to_array(support_result)).toEqual(["f"]);
  // });

  it("should check if a value is a ValueSet", () => {
    const elements = [1];
    const valueSet = construct_value_set(elements);
    expect(is_better_set(valueSet)).toBe(true);
  });


  it("element subsumes shoud when support and base is the same", () => {
    const element1 = support_by(1, "f");

    const element2 = support_by(1, "f");

    expect(element_subsumes(element1, element2)).toBe(true);
  })

  it("element subsumes shoud when base is the same and support is higher", () => {
    const element1 = support_by(1, "f");

    const element2 = support_by(1, "g");

    expect(element_subsumes(element1, element2)).toBe(false);
  })

  it("element subsumes shoud when base is higher", () => {
    const element1 = support_by(1, "f");

    const element2 = support_by(2, "f");

    expect(element_subsumes(element1, element2)).toBe(false);
  })


  it("element subsumes shoud when support is higher", () => {
    const element1 = support_by(1, "f");
    const element3 = construct_layered_datum(1, support_layer, construct_defualt_support_set(["f", "g"]))
    const element2 = support_by(1, "g");


    expect(element_subsumes(element1, element3)).toBe(true);
    expect(element_subsumes(element2, element3)).toBe(true);
    expect(element_subsumes(element1, element2)).toBe(false);
  })



});