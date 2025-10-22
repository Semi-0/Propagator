# Victor Clock + PatchedSet Propagator Test Report

## Executive Summary

Tested integration of Victor Clock layer with PatchedSet in propagator system. Results:
- **3/15 tests passing** ✅
- **12/15 tests failing** ❌
- **No fixes attempted** - report only

## Test Results Overview

### Passing Tests ✅

1. **`[VICTOR_CLOCK] Basic addition with victor clock values in propagator`**
   - Setup: Two cells with Victor Clock values
   - Operation: p_add
   - Expected: 10 + 20 = 30
   - Result: ✅ **30** (CORRECT)
   - Runtime: 145.33ms

2. **`[VICTOR_CLOCK] Concurrent values from different sources`**
   - Setup: Concurrent values from source1 and source2
   - Operation: p_multiply  
   - Expected: 5 * 6 = 30
   - Result: ✅ **30** (CORRECT)
   - Runtime: 1.02ms

3. **`[VICTOR_CLOCK] Division with stale value detection`**
   - Setup: Stale values (v1), then fresh values (v2)
   - Operation: p_divide
   - Expected after v2: 60 / 6 = 10
   - Result: ✅ **10** (CORRECT)
   - Runtime: 4.52ms

### Failing Tests ❌

#### Group 1: Basic Support Layer Tests (Premise Validation Error)
**All 8 previous tests fail with:**
```
error: [premise_name] is not a premise
  at get_metadata (Premises.ts:63:15)
  at _premises_metadata (Premises.ts:90:21)
  at is_premise_in (Premises.ts:101:12)
```

**Root Cause**: The `support_by()` function creates support sets with string names like "sourceA", "s1", etc. These are checked against a global premises registry that is empty or doesn't contain these strings.

**Affected Tests**:
- should handle addition with supported values
- should handle multiplication with support layer values
- should handle subtraction with support layer values
- should handle division with support layer values
- should verify cell content is stored as PatchedSet
- should handle simple propagator with patched set merge
- should handle multiple additions in sequence
- should maintain patched set through propagator chain
- should handle empty cell values gracefully
- should handle adding same base value multiple times

#### Group 2: Victor Clock Test Failures

##### Test: `[VICTOR_CLOCK] Stale value replacement in propagator`
```
Initial result (5+3): 8 ✅
Adding updated values (v2)...
Result after stale replacement (7+4): 8 ❌ (Expected: 11)

ERROR: expect(received).toBe(expected)
Expected: 11
Received: 8
```

**What Happened**:
1. First addition works: 5+3 = 8 ✅
2. Victor Clock patches generated correctly for v2 values
3. `scan_for_patches` called twice per cell (Victor Clock + Base layer) ✅
4. New values added to cells correctly (logged in "testing content")
5. **BUT**: Output value did NOT update to 11
6. Output still shows 8 (old value)

**Diagnosis**: Stale value replacement is not propagating to output cell. Possible reasons:
- Victor Clock dispatcher in `scan_for_patches` not being invoked correctly
- Patches generated but not applied to the propagator graph
- Output cell not receiving update notification
- Consolidation not happening across multiple cells

##### Test: `[VICTOR_CLOCK] Multiple updates from same processor`
```
Result after v1 (1+2): 3 ✅
Update 2: Adding v2 from same processor...
Result after v2 (10+20): 3 ❌ (Expected: 30)

ERROR: expect(received).toBe(expected)
Expected: 30
Received: 3
```

**What Happened**:
1. First update works: 1+2 = 3 ✅
2. Victor Clock patches logged correctly for both cells
3. Both cells' content updated (from test logs)
4. Patches generated for output calculation
5. **BUT**: Output remains 3 (the original result)
6. Expected 30 but got 3

**Pattern**: Updates from same processor with higher version numbers are NOT being reflected in propagator outputs.

## Key Observations

### What Works ✅
- Victor Clock layer creation with `construct_layered_datum`
- Patch generation via `scan_for_patches`
- Cell content updates with new values
- Concurrent values from different sources
- Basic arithmetic (when values propagate correctly)
- Division operation tracking

### What Fails ❌
- **Stale value replacement NOT triggering output updates**
- **Multiple updates from same processor NOT being reflected**
- **Support layer premise validation (separate from Victor Clock issue)**
- **Update propagation from cells to propagator outputs**

## Hypothesis: Why Stale Replacement Isn't Working

### Theory 1: Patch Generation vs. Application Mismatch
```
scan_for_patches returns patches ✅
BUT patches not propagating to propagator constraints
```

The logs show `scan_for_patches` is called and returns patches, but the output cells don't reflect the new values.

### Theory 2: Propagator Graph Not Re-evaluating
When cells are updated with new values:
- Cell content is updated ✅
- Patches are generated ✅
- But propagators (p_add, p_multiply) are NOT re-triggered
- Output remains based on old values

### Theory 3: Victor Clock Dispatcher Not Removing Old Values
```
Expected flow:
1. scan_for_patches finds stale value with clock v1
2. Victor Clock dispatcher generates patch_remove(v1)
3. Patches applied: remove v1, join v2
4. Propagator sees new value, recalculates

Actual flow:
1. scan_for_patches generates patches correctly
2. Patches applied to PatchedSet
3. BUT PatchedSet might contain BOTH v1 and v2
4. Propagator might be using v1 (old) or undefined for strongest
```

### Theory 4: Strongest Value Selection Issue
When a cell contains a PatchedSet with multiple versions, the propagator might be:
- Selecting the first value instead of freshest
- Not calling `cell_strongest_base_value` correctly
- Using old cached value

## Code Execution Flow Observed

```
Test: Stale Replacement
├─ Add v1: cellA=5(v1), cellB=3(v1), output=8 ✅
├─ Add v2: cellA+={7(v2)}, cellB+={4(v2)}
├─ scan_for_patches called:
│  ├─ Victor Clock layer: generates patches
│  └─ Base layer: generates patches
├─ Patches applied to PatchedSet
├─ test_content executed (logs cell state)
├─ cell_strongest_base_value(output)
└─ Returns 8 (NOT 11) ❌

MISSING: Propagator re-evaluation from new cell values to output
```

## Test Comparison: Why Basic Test Passes But Stale Fails

### Basic Addition (PASSES)
```javascript
cellA.addContent(valueA_v1)  // 10 from procA
cellB.addContent(valueB_v1)  // 20 from procB
propagate()
output = 30 ✅
```

**Why it works**: Fresh values are added once. Propagator evaluates correctly.

### Stale Replacement (FAILS)
```javascript
cellA.addContent(valueA_v1)  // 5 from procA
cellB.addContent(valueB_v1)  // 3 from procB
propagate()
output = 8 ✅

cellA.addContent(valueA_v2)  // 7 from procA (v2)
cellB.addContent(valueB_v2)  // 4 from procB (v2)
propagate()
output = 8 ❌ (Expected: 11)
```

**Why it fails**: Second update doesn't trigger re-evaluation in propagator. The issue is that:
- First propagation works
- Second call to propagate() doesn't seem to re-evaluate output
- Output cell might have state locked from first evaluation

## Issue Categories

### Critical Issues
1. **Stale value replacement doesn't trigger output recalculation**
2. **Multiple updates don't propagate to output**
3. **Support layer premise validation breaks ALL tests using support_by()**

### Design Issues
1. Propagator system may not handle cell content updates properly with PatchedSet
2. Victor Clock patches generated but not integrated into propagation graph
3. May need explicit "dirty" marking when cells update in propagators

## Next Steps (For User)

### Investigation Needed
1. Check if `execute_all_tasks_sequential` is queueing multiple cell updates correctly
2. Verify propagator constraints are being re-evaluated after cell updates
3. Examine if PatchedSet updates are triggering propagator notifications
4. Check if Victor Clock dispatcher for `scan_for_patches` is in the correct execution order

### Possible Root Causes to Explore
1. **Cell notification system**: Not notifying propagators of content changes
2. **Propagator re-triggering**: Not queuing new constraints after initial evaluation
3. **BetterSet vs Array**: PatchedSet structure incompatibility with propagator logic
4. **Victor Clock integration**: Dispatcher not properly coordinating with other layers

## Files to Investigate
- `Propogator/Cell/Cell.ts` - Check propagator update notification
- `Propogator/Propagator/Propagator.ts` - Check re-evaluation logic
- `Propogator/AdvanceReactivity/victor_clock.ts` - Victor Clock dispatcher
- `Propogator/DataTypes/PatchedValueSet.ts` - Patch application and notification

## Metrics
- Total tests: 15
- Passing: 3 (20%)
- Failing: 12 (80%)
- Errors: 2 types
  - Premise validation (8 tests)
  - Stale value not propagating (2 tests)
  - Other failures (2 tests)

---

**Test Date**: October 2025
**Status**: Complete - No fixes attempted, issues documented for investigation



