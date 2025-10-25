import { cell_content, construct_cell } from "@/cell/Cell";
import type { Cell } from "@/cell/Cell";
import { p_apply_closure, p_apply_propagator, p_depot_cell, p_make_closure, ce_depot_cell, type SimpleClosure } from "@/cell/SimpleClosure";
import { describe, test, expect } from "bun:test";
import { patched_set_merge } from "../DataTypes/GenericValueSet";
import { set_merge } from "@/cell/Merge";
import { PublicStateCommand, set_global_state } from "../Shared/PublicState";
import type { Propagator } from "../Propagator/Propagator";
import { compound_tell } from "../Helper/UI";
import { p_decrement, p_increment } from "../Propagator/BuiltInProps";
import { construct_vector_clock, vector_clock_layer } from "../AdvanceReactivity/victor_clock";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { cell_strongest_base_value } from "ppropogator";

const input_vector_clock_tell = (cell: Cell<any>, info: any, time: number) => 
        compound_tell(
            cell,
            info,
            vector_clock_layer,
            construct_vector_clock([{
                source: "input",
                value: time
            }])
    ) 

describe("apply_closure", () => {
    test("apply_closure should apply a propagator closure", () => {
        set_global_state(PublicStateCommand.CLEAN_UP)
        set_merge(patched_set_merge)
        const closure_cell = construct_cell("closure") as Cell<SimpleClosure>

        const input = construct_cell("input")
        const output = construct_cell("output")

        const recept_cell = construct_cell("recept") as Cell<WeakRef<Propagator>> 

        p_apply_closure(closure_cell, recept_cell)
        
        input_vector_clock_tell(closure_cell, {
            propagator_constructor: p_increment,
            cells: [input, output]
        }, 1)

        input_vector_clock_tell(input, 1, 1)

        execute_all_tasks_sequential((error: Error) => {console.log(error)})

        expect(cell_strongest_base_value(output)).toBe(2)

        input_vector_clock_tell(closure_cell,
            {propagator_constructor: p_decrement,
            cells: [input, output]
        }, 2)

        input_vector_clock_tell(input, 2, 2)

        execute_all_tasks_sequential((error: Error) => {console.log(error)})

        expect(cell_strongest_base_value(output)).toBe(1)
        
    });

    test("p_apply_propagator should apply a propagator constructor with arguments", () => {
        set_global_state(PublicStateCommand.CLEAN_UP)
        set_merge(patched_set_merge)
        
        // maybe its because when network becomes different time becomes sophiscated?
        const propagator_constructor_cell = construct_cell("constructor") as Cell<any>
        const input = construct_cell("input")
        const output = construct_cell("output")
        const recept_cell = construct_cell("recept") as Cell<WeakRef<Propagator>>

        p_apply_propagator(propagator_constructor_cell, [input], [output], recept_cell)
        
        input_vector_clock_tell(propagator_constructor_cell, p_increment, 1)
        input_vector_clock_tell(input, 1, 1)

        execute_all_tasks_sequential((error: Error) => {console.log(error)})

        expect(cell_strongest_base_value(output)).toBe(2)

        input_vector_clock_tell(propagator_constructor_cell, p_decrement, 2)
        input_vector_clock_tell(input, 2, 2)

        execute_all_tasks_sequential((error: Error) => {console.log(error)})

        // so we learn that apply propagator would causes glitches

        // input_vector_clock_tell(propagator_constructor_cell, p_decrement, 3)
        // input_vector_clock_tell(input, 3, 3)

        // execute_all_tasks_sequential((error: Error) => {console.log(error)})

        console.log(cell_content(output))
        expect(cell_strongest_base_value(output)).toBe(1)
    });

    test("p_depot_cell should create a cell containing an array of cells", () => {
        set_global_state(PublicStateCommand.CLEAN_UP)
        set_merge(patched_set_merge)
        
        const input1 = construct_cell("input1")
        const input2 = construct_cell("input2")
        const depot_cell = construct_cell("depot") as Cell<Cell<any>[]>
        const pulse = construct_cell("pulse")
        
        const depot_propagator = p_depot_cell(input1, input2)
        depot_propagator(pulse, depot_cell)
        
        input_vector_clock_tell(input1, 10, 1)
        input_vector_clock_tell(input2, 20, 1)
        input_vector_clock_tell(pulse, true, 1)
        
        execute_all_tasks_sequential((error: Error) => {console.log(error)})
        
        const result = cell_strongest_base_value(depot_cell) as unknown as Cell<any>[]
        console.log(result)
        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(2)
        expect(cell_strongest_base_value(result[0])).toBe(10)
        expect(cell_strongest_base_value(result[1])).toBe(20)
    });

    test("p_make_closure should create a SimpleClosure from depot and constructor", () => {
        set_global_state(PublicStateCommand.CLEAN_UP)
        set_merge(patched_set_merge)
        
        const input1 = construct_cell("input1")
        const input2 = construct_cell("input2")
        const trigger = construct_cell("trigger")
        const depot_cell = ce_depot_cell(input1, input2)(trigger) as Cell<Cell<any>[]>
        const constructor_cell = construct_cell("constructor") as Cell<(...args: any[]) => any>
        const closure_cell = construct_cell("closure") as Cell<SimpleClosure>
        
        // Create the closure
        p_make_closure(depot_cell, constructor_cell as unknown as Cell<any>, closure_cell)
        
        input_vector_clock_tell(input1, 10, 1)
        input_vector_clock_tell(input2, 20, 1)
        input_vector_clock_tell(constructor_cell, p_increment, 1)
        input_vector_clock_tell(trigger, true, 1)
        
        execute_all_tasks_sequential((error: Error) => {console.log(error)})
        
        const closure = cell_strongest_base_value(closure_cell) as unknown as SimpleClosure
        expect(closure).toBeDefined()
        expect(closure.propagator_constructor).toBe(p_increment)
        console.log(closure)
        expect(Array.isArray(closure.cells)).toBe(true)
        expect(closure.cells).toHaveLength(2)
        expect(cell_strongest_base_value(closure.cells[0])).toBe(10)
        expect(cell_strongest_base_value(closure.cells[1])).toBe(20)
    });
});