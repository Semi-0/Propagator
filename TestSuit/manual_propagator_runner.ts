import { test_propagator_constructor, r_i, r_o, run_scheduler, run_replay_scheduler } from "./propagator_test";
import { p_add } from "../Propagator/BuiltInProps";

const manual_test = test_propagator_constructor(async (description, testFn) => {
    console.log(`\n=== ${description} ===`);
    try {
        await Promise.resolve(testFn());
        console.log(`✅ ${description}`);
    } catch (error: any) {
        console.error(`❌ ${description}`);
        console.error(error);
    }
});

async function main() {
    await manual_test(
        "manual simple adder",
        p_add,
        ["a", "b", "sum"],
        [
            run_scheduler,
            r_i(1, "a"),
            r_i(1, "b"),
            r_o(2, "sum"),
        ],
        [
            run_replay_scheduler,
            r_i(2, "a"),
            r_i(2, "b"),
            r_o(4, "sum"),
        ]
    );
}

main().catch((error) => {
    console.error("Manual propagator test runner failed:");
    console.error(error);
});

