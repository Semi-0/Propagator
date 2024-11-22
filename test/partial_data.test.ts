import { describe, it, expect, beforeEach } from "bun:test"
import { make_partial_data } from "../DataTypes/PartialData";
import { PublicStateCommand, set_global_state } from "../Shared/PublicState";
import { set_merge } from "@/cell/Merge";
import { merge_value_sets } from "../DataTypes/ValueSet";
import { cell_strongest_base_value, construct_cell } from "@/cell/Cell";
import { p_add } from "../Propagator/BuiltInProps";
import { tell } from "../Helper/UI";
import { type Cell } from "@/cell/Cell";
import { execute_all_tasks_sequential } from "../Shared/Reactivity/Scheduler";
describe('partialData', () => {
    let a: Cell, b: Cell, sum: Cell

    beforeEach(() => {

        set_global_state(PublicStateCommand.CLEAN_UP);
        set_merge(merge_value_sets);

        // Set up cells
        a = construct_cell("a");
        b = construct_cell("b");
        sum = construct_cell("sum");
        p_add(a, b, sum);
});

  it('should return the correct identifier', () => {
    const result = make_partial_data(3);
    expect(result.identifier).toBe('partial data');
  });

  it('should return the correct data', () => {
    const result = make_partial_data(3);
    expect(result.data).toBe(3);
  });

  it('should handle different inputs correctly', () => {
    const result1 = make_partial_data(3);
    const result2 = make_partial_data(5);
    const result3 = make_partial_data(7);

    expect(result1.data).toBe(3);
    expect(result2.data).toBe(5);
    expect(result3.data).toBe(7);
  });

  it('partial data with propagator network', () => {
    tell(a, make_partial_data(1), "fst")
    tell(b, make_partial_data(2), "snd")

    execute_all_tasks_sequential((e) => {})
    //@ts-ignore
    expect(cell_strongest_base_value(sum).data).toBe(3)


    tell(a, make_partial_data(2), "trd")
    execute_all_tasks_sequential((e) => {})
    //@ts-ignore
    expect(cell_strongest_base_value(sum).data).toBe(4)
  });

  
});