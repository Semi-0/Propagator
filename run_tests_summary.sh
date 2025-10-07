#!/bin/bash
echo "=== TEST SUMMARY ===" 
echo ""
echo "1. Basic Tests:"
bun test test/cell.test.ts test/cellvalue.test.ts 2>&1 | grep -E "pass|fail|Ran" | tail -3
echo ""
echo "2. Propagator Tests:"
bun test test/propagator.test.ts 2>&1 | grep -E "pass|fail|Ran" | tail -3
echo ""
echo "3. Reactive Tests:"
bun test test/advanceReactive.test.ts 2>&1 | grep -E "pass|fail|Ran" | tail -3
echo ""
echo "4. Disposal Tests:"
bun test test/disposal.test.ts test/compound_disposal.test.ts test/stateful_disposal.test.ts 2>&1 | grep -E "pass|fail|Ran" | tail -3
echo ""
echo "5. Patch System Tests:"
bun test test/patchSystem*.test.ts 2>&1 | grep -E "pass|fail|Ran" | tail -3
