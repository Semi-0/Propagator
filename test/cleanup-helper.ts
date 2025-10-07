/**
 * Helper to ensure clean state after tests that might leave contradictions or other pollution.
 * Import and call this at the end of test files that use merge_value_sets or create contradictions.
 */
import { afterAll } from "bun:test";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";

export function cleanupAfterTests() {
    afterAll(() => {
        // Force a complete cleanup to prevent state leaking to next test file
        set_global_state(PublicStateCommand.CLEAN_UP);
    });
}
