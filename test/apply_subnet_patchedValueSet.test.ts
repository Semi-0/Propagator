// @ts-nocheck
import { describe, test, expect, beforeEach } from "bun:test";
import { construct_cell, cell_strongest_base_value, type Cell } from "@/cell/Cell";
import { apply_subnet } from "../Propagator/HelperProps";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { set_scheduler, execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { simple_scheduler } from "../Shared/Scheduler/SimpleScheduler";
import { set_merge } from "@/cell/Merge";
import { merge_patched_set } from "../DataTypes/PatchedValueSet";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { vector_clock_layer } from "../AdvanceReactivity/vector_clock";
import { p_add, p_multiply } from "../Propagator/BuiltInProps";
import { the_nothing } from "@/cell/CellValue";
import "../DataTypes/register_vector_clock_patchedValueSet";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_scheduler(simple_scheduler());
  set_merge(merge_patched_set);
});

describe("apply_subnet with PatchedValueSet + Victor Clock", () => {
  test("subnet constructor should apply layered addition", async () => {
    const subnetCell = construct_cell("subnet_ctor");
    const inputA = construct_cell("inputA");
    const inputB = construct_cell("inputB");
    const output = construct_cell("output");

    const wrapper = apply_subnet(subnetCell, [inputA, inputB], [output]);

    const additionConstructor = (...cells: Cell<any>[]): any => {
      const [a, b, out] = cells;
      return p_add(a, b, out);
    };

    subnetCell.update(
      construct_layered_datum(additionConstructor, vector_clock_layer, new Map([["ctor", 1]]))
    );
    await execute_all_tasks_sequential(() => {});

    const valueA = construct_layered_datum(
      10,
      vector_clock_layer, new Map([["procA", 1]])
    );
    const valueB = construct_layered_datum(
      20,
      vector_clock_layer, new Map([["procB", 1]])
    );

    inputA.update(valueA);
    inputB.update(valueB);
    await execute_all_tasks_sequential(() => {});

    const result = cell_strongest_base_value(output);
    expect(result).toBe(30);
  });

  test("switching subnet constructor updates behavior", async () => {
    const subnetCell = construct_cell("subnet_ctor_switch");
    const inputA = construct_cell("inputA_switch");
    const inputB = construct_cell("inputB_switch");
    const output = construct_cell("output_switch");

    apply_subnet(subnetCell, [inputA, inputB], [output]);

    const additionConstructor = (...cells: Cell<any>[]): any => {
      const [a, b, out] = cells;
      return p_add(a, b, out);
    };

    subnetCell.update(
        construct_layered_datum(additionConstructor, vector_clock_layer, new Map([["ctor", 1]]))
    );

    await execute_all_tasks_sequential(() => {});

    const v1A = construct_layered_datum(10, vector_clock_layer, new Map([["procA", 1]]));
    const v1B = construct_layered_datum(20, vector_clock_layer, new Map([["procB", 1]]));
    inputA.update(v1A);
    inputB.update(v1B);
    await execute_all_tasks_sequential(() => {});

    expect(cell_strongest_base_value(output)).toBe(30);

    const multiplyConstructor = (...cells: Cell<any>[]): any => {
      const [a, b, out] = cells;
      return p_multiply(a, b, out);
    };

    subnetCell.update(
      construct_layered_datum(multiplyConstructor, vector_clock_layer, new Map([["ctor", 2]]))
    );
    await execute_all_tasks_sequential(() => {});

    const v2A = construct_layered_datum(4, vector_clock_layer, new Map([["procA", 2]]));
    const v2B = construct_layered_datum(5, vector_clock_layer, new Map([["procB", 2]]));
    inputA.update(v2A);
    inputB.update(v2B);
    await execute_all_tasks_sequential(() => {});

    expect(cell_strongest_base_value(output)).toBe(20);
  });
});

