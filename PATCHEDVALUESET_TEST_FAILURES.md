# PatchedValueSet Test Failures Report

Generated: October 20, 2025
Test Suite: `test/patchedValueSet.test.ts`

## Summary

- **Total Tests**: 42
- **Passed**: 35 ✅ (83%)
- **Failed**: 7 ❌ (17%)

## Failure Analysis

### 1. ❌ `should generate both remove and join patches for stale replacement`

**Location**: `scan_for_patches Tests > Victor Clock Integration`

**Error**:
```
expect(received).toBeDefined()
Received: undefined
```

**What Failed**:
```typescript
set = apply_content_patch(set, patches);
expect(set).toBeDefined();  // ← FAILED: set is undefined
```

**Expected Behavior**:
1. Scan for patches from stale value (v1, source1:1) to fresh value (v2, source1:5)
2. Generate remove patch for stale value (100) and join patch for fresh value (200)
3. Apply patches to the set
4. Result set should contain the fresh value (200), not the stale value (100)

**Root Cause**: 
`apply_content_patch()` is returning `undefined` instead of a `BetterSet`. This suggests that the function may have a code path where it returns `undefined` when processing patches.

---

### 2. ❌ `should keep concurrent values from different sources`

**Location**: `scan_for_patches Tests > Victor Clock Integration`

**Error**:
```
expect(received).toBe(expected)
Expected: 2
Received: 1
```

**What Failed**:
```typescript
set = patched_set_merge(set, value2);
expect(length(set)).toBe(2);  // ← FAILED: only has 1 value
```

**Expected Behavior**:
1. Create `value1` with `victor_clock: {source1: 2}`
2. Create `value2` with `victor_clock: {source2: 2}` (different source)
3. Merge them
4. Result should have **both** values (length = 2) since they're from incomparable/concurrent sources

**Actual Behavior**:
Set only contains 1 value after merge, suggesting one value was removed or replaced.

**Root Cause**: 
The Victor Clock comparison logic may be incorrectly treating values from different sources as comparable (one "dominates" the other), when they should be kept as concurrent values.

---

### 3. ❌ `should preserve value when clocks are incomparable (concurrent)`

**Location**: `scan_for_patches Tests > Victor Clock Integration`

**Error**:
```
expect(received).toBe(expected)
Expected: 2
Received: 1
```

**What Failed**:
```typescript
set = patched_set_merge(set, clockB);
expect(length(set)).toBe(2);  // ← FAILED: only has 1 value
```

**Expected Behavior**:
1. Create `clockA` with `victor_clock: {sourceA: 2}`
2. Create `clockB` with `victor_clock: {sourceB: 3}` (incomparable to A)
3. Merge them
4. Result should preserve **both** values (length = 2) since clocks are incomparable

**Actual Behavior**:
Set only has 1 value, indicating one was removed when both should be kept.

**Root Cause**: 
Same as failure #2 - Victor Clock comparison is incorrectly pruning concurrent values.

---

### 4. ❌ `Victor Clock patch merge workflow end-to-end`

**Location**: `scan_for_patches Tests > Victor Clock Integration`

**Error**:
```
expect(received).toBe(expected)
Expected: 2
Received: 1
```

**What Failed**:
```typescript
content = patched_set_merge(content, concurrent);
expect(length(content)).toBe(2);  // ← FAILED: only has 1 value
```

**Expected Behavior**:
1. Start with `initial` value (processor: 1, "result_v1")
2. Merge `updated` (processor: 2, "result_v2") → should replace (same source)
3. Merge `concurrent` (other_processor: 1, "other_result") → should add (different source)
4. Final result should have **both** "result_v2" and "other_result" (length = 2)

**Actual Behavior**:
Final result only has 1 value.

**Root Cause**: 
Concurrent values from different processors are being removed instead of added.

---

### 5. ❌ `should apply join patches`

**Location**: `apply_content_patch Tests > Basic Application`

**Error**:
```
expect(received).toBeDefined()
Received: undefined
```

**What Failed**:
```typescript
set = apply_content_patch(set, patches);
expect(set).toBeDefined();  // ← FAILED: set is undefined
```

**Expected Behavior**:
1. Start with empty set
2. Create join patch for value (10)
3. Apply patch to set
4. Result should be a non-empty BetterSet containing value 10

**Root Cause**: 
`apply_content_patch()` is returning `undefined`. This is a fundamental issue with the function.

---

### 6. ❌ `should apply multiple patches sequentially`

**Location**: `apply_content_patch Tests > Basic Application`

**Error**:
```
expect(received).toBeDefined()
Received: undefined
```

**What Failed**:
```typescript
set = apply_content_patch(set, patches);
expect(set).toBeDefined();  // ← FAILED: set is undefined
```

**Expected Behavior**:
1. Start with set containing `[value1: 10, value2: 20]`
2. Apply patches: remove value1, join value3 (30)
3. Result should contain `[value2: 20, value3: 30]`

**Root Cause**: 
Same as failure #5 - `apply_content_patch()` returning `undefined`.

---

### 7. ❌ `should handle replace pattern (remove + join)`

**Location**: `apply_content_patch Tests > Complex Patch Sequences`

**Error**:
```
expect(received).toBeDefined()
Received: undefined
```

**What Failed**:
```typescript
set = apply_content_patch(set, patches);
expect(set).toBeDefined();  // ← FAILED: set is undefined
```

**Expected Behavior**:
1. Start with set containing value 100
2. Apply patches: remove value 100, join value 200
3. Result should be a BetterSet containing value 200 (replaced)

**Root Cause**: 
Same as failures #5 & #6 - `apply_content_patch()` returning `undefined`.

---

## Root Cause Categories

### Category A: `apply_content_patch()` Returns `undefined` (3 failures)
**Affected Tests**: #5, #6, #7

**Issue**: The function is not returning a BetterSet in some code paths.

**Proposed Investigation**:
- Check `PatchedValueSet.ts` `apply_content_patch()` implementation
- Verify all code paths return a `BetterSet`
- Look for conditions where it might return `undefined`

---

### Category B: Victor Clock Concurrent Values Not Preserved (4 failures)
**Affected Tests**: #1, #2, #3, #4

**Issue**: Values from different/incomparable sources are being removed when they should be kept.

**Proposed Investigation**:
- Check the Victor Clock layer's version comparison logic in `victor_clock.ts`
- Review `proved_staled_with()` function - may be incorrectly identifying values as stale
- Verify incomparable vector clock comparison:
  - `{sourceA: 2}` vs `{sourceB: 3}` → should **both** be kept
  - `{source: 1}` vs `{source: 2}` → newer should **replace** older
- Check if support layer and Victor Clock layer are interacting correctly

---

## Test Execution Logs

### Notable Observations

1. **`scan_for_patches` is being called correctly**:
   ```
   scan_for_patches called with args:
   arg 0: [victor_clock, [object Object]]
   arg 1: [support, [object Object]]
   scan_for_patches returned: [object Object]
   ```
   The function returns patches, but the issue is in how they're applied or merged.

2. **Support layer tests ALL PASS**: All 2 support layer integration tests pass, suggesting the basic patching mechanism works when only the support layer is involved.

3. **Victor Clock + Support Layer tests MOSTLY FAIL**: Most failures involve Victor Clock with support layers, suggesting the interaction between layers is problematic.

---

## Recommendations

### Immediate Actions

1. **Fix `apply_content_patch()` undefined return**:
   - Add debug logging to see which code path returns `undefined`
   - Ensure all branches return a valid `BetterSet`
   - Add a fallback return for edge cases

2. **Debug Victor Clock version comparison**:
   - Add logging to `proved_staled_with()` to see what values it's identifying as stale
   - Verify vector clock comparison is working correctly for concurrent values
   - Test with simple examples: same source vs different sources

3. **Integration point investigation**:
   - Check how `scan_for_patches` is called for different layers
   - Verify the consolidator dispatcher correctly handles Victor Clock layer
   - Look at `define_consolidator_per_layer_dispatcher` in `victor_clock.ts`

### Code Areas to Inspect

- **`PatchedValueSet.ts`**: `apply_content_patch()` function
- **`victor_clock.ts`**: `proved_staled_with()` function and the consolidator dispatcher
- **`PatchedValueSet.ts`**: `patched_set_merge()` function - how it decides to remove values
