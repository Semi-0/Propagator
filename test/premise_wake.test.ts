import { describe, test, expect, beforeEach } from "bun:test";
import { construct_cell, update_cell, cell_id, NeighborType } from "@/cell/Cell";
import { construct_propagator } from "../Propagator/Propagator";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { set_merge } from "@/cell/Merge";
import {
    install_temporary_value_set_handlers,
    merge_temporary_value_set,
} from "../DataTypes/TemporaryValueSet";
import { register_premise, mark_premise_out, mark_premise_in } from "../DataTypes/Premises";
import { cells_for_premise } from "../Shared/CellValueStore";
import { construct_layered_datum } from "sando-layer/Basic/LayeredDatum";
import { vector_clock_layer } from "sando-layer/Specified/VectorClockLayer";
import { construct_vector_clock } from "../AdvanceReactivity/vector_clock";
import { init_propagator_system } from "../init_propagator_system";

beforeEach(async () => {
    set_global_state(PublicStateCommand.CLEAN_UP);
    await init_propagator_system();
    set_merge(merge_temporary_value_set);
    install_temporary_value_set_handlers();
});

describe("CellValueStore premise index (clock channels)", () => {
    test("cells_for_premise lists cell id after merge with registered premise channel", () => {
        register_premise("P", {});
        const c = construct_cell("c");
        const v = construct_layered_datum(
            42,
            vector_clock_layer,
            construct_vector_clock([{ source: "P", value: 0 }]),
        );
        update_cell(c, v);
        expect(cells_for_premise("P").has(cell_id(c))).toBe(true);
    });

    test("unregistered clock channel does not add cell to premise_index", () => {
        const c = construct_cell("c");
        const v = construct_layered_datum(
            99,
            vector_clock_layer,
            construct_vector_clock([{ source: "UnregisteredQ", value: 0 }]),
        );
        update_cell(c, v);
        expect(cells_for_premise("UnregisteredQ").size).toBe(0);
    });

    test("plain cell without premise channel is not listed for P", () => {
        register_premise("P", {});
        const withP = construct_cell("withP");
        const plain = construct_cell("plain");
        update_cell(
            withP,
            construct_layered_datum(
                1,
                vector_clock_layer,
                construct_vector_clock([{ source: "P", value: 0 }]),
            ),
        );
        update_cell(plain, 200);
        expect(cells_for_premise("P").has(cell_id(withP))).toBe(true);
        expect(cells_for_premise("P").has(cell_id(plain))).toBe(false);
    });
});

describe("Stage 3 targeted premise wake", () => {
    test("mark_premise_out runs testContent on cells indexed for P, not on unrelated cells", () => {
        register_premise("P", {});
        const indexed = construct_cell("indexed");
        const sink = construct_cell("sink");
        const other = construct_cell("other");
        const otherSink = construct_cell("otherSink");

        let indexedContentTests = 0;
        let otherContentTests = 0;

        construct_propagator(
            [indexed],
            [sink],
            () => {
                indexedContentTests++;
            },
            "spy_indexed",
            null,
            [NeighborType.content_tested],
        );
        construct_propagator(
            [other],
            [otherSink],
            () => {
                otherContentTests++;
            },
            "spy_other",
            null,
            [NeighborType.content_tested],
        );

        update_cell(
            indexed,
            construct_layered_datum(
                1,
                vector_clock_layer,
                construct_vector_clock([{ source: "P", value: 0 }]),
            ),
        );
        update_cell(other, 999);

        execute_all_tasks_sequential(() => {});
        const afterSetupIndexed = indexedContentTests;
        const afterSetupOther = otherContentTests;

        mark_premise_out("P");
        execute_all_tasks_sequential(() => {});

        expect(indexedContentTests).toBeGreaterThan(afterSetupIndexed);
        expect(otherContentTests).toBe(afterSetupOther);

        mark_premise_in("P");
        execute_all_tasks_sequential(() => {});
        expect(indexedContentTests).toBeGreaterThan(afterSetupIndexed);
    });
});
