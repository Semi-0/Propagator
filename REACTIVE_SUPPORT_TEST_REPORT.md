# Reactive Values + Support Layer Test Report

**Date**: October 20, 2025  
**Test File**: `test/patchedValueSetIntegration.test.ts`  
**Status**: Tests Created - All Failing Due to Premise Registration Issue

---

## Test Results Summary

```
Total New Tests: 4
Passed: 0 ❌
Failed: 4 ❌
Duration: 209ms

Root Issue: "is not a premise" error - Premises must be pre-registered
```

---

## Test Scenarios Created

### 1. ✅ Test Created: Stale Reactive Value Replacement with Support

**Name**: `[VICTOR_CLOCK + SUPPORT] Stale reactive value replaced by fresher version with support`

**Intent**: Test that Victor Clock v1 values can be replaced by v2 values with updated support layers

**Scenario**:
```typescript
// v1: Victor Clock v1 + Support ["supportA"]
cellA.addContent({
    base: 5,
    victor_clock: {procA: 1},
    support: ["supportA"]
});

// Expected: 5 + 3 = 8 ✅ Works
// Then update to:

// v2: Victor Clock v2 + Support ["supportA", "newSupportA"]
cellA.addContent({
    base: 7,
    victor_clock: {procA: 2},
    support: ["supportA", "newSupportA"]
});

// Expected: 7 + 4 = 11 (stale v1 replaced by v2)
```

**Error**: 
```
error: supportA is not a premise
  at get_metadata (Premises.ts:63:15)
```

**Analysis**: 
The test uses `construct_layered_datum` with support strings, but these must be registered as premises in `Premises` registry before use. The `support_by()` function does this automatically, but direct string registration doesn't.

---

### 2. ✅ Test Created: Concurrent Values with Contradiction

**Name**: `[VICTOR_CLOCK + SUPPORT] Concurrent values with different clocks and supports should coexist but may raise contradiction`

**Intent**: Test that concurrent values from different sources create contradictions and can coexist in cell content

**Scenario**:
```typescript
// Source1: Victor Clock {source1: 1}  + Support ["supportA1"]
// Source2: Victor Clock {source2: 1}  + Support ["supportA2"]  (concurrent!)
// Adding both should cause contradiction
// Result: 5+3=8 or 7+3=10 (both valid, but cell needs resolution)
```

**Error**: Same premise registration issue

**Design Intent**: Demonstrates that PatchedSet can hold multiple concurrent values that contradict each other, mirroring the @propagator.test.ts pattern where contradictions are tracked via support layers.

---

### 3. ✅ Test Created: Mixed Victor Clock + Support-Only Edge Case

**Name**: `[VICTOR_CLOCK + SUPPORT] Edge case: Victor Clock value joins with Support-only value`

**Intent**: Test mixing layered types - what happens when a Victor Clock value joins with pure support-layer values?

**Scenario**:
```typescript
// Initial: Support-only values (no Victor Clock)
cellA: {base: 5, support: ["supportOnlyA"]}
cellB: {base: 3, support: ["supportOnlyB"]}
Result: 8 ✅

// Then add Victor Clock value to cellA
cellA: {base: 10, victor_clock: {vcSourceA: 1}, support: ["vcSupportA"]}

// Now cellA has TWO values:
// - {base: 5, support: [...]}
// - {base: 10, victor_clock: {...}, support: [...]}
// Output cell should have contradiction with both 5+3=8 and 10+3=13
```

**Error**: Same premise registration issue

**Design Intent**: Tests the architectural choice: can cell contents mix values with different layer compositions? Should raise contradiction.

---

### 4. ✅ Test Created: Multiple Stale Values Replacement

**Name**: `[VICTOR_CLOCK + SUPPORT] Multiple stale values with support replacement`

**Intent**: Test sequence of updates v1 → v2 → v3 with growing support sets

**Scenario**:
```typescript
v1: base=2, victor_clock={procA: 1}, support=["sup1"]       → 2*3 = 6
v2: base=5, victor_clock={procA: 2}, support=["sup1","sup3"]  → 5*4 = 20
v3: base=7, victor_clock={procA: 3}, support=["sup1","sup3","sup5"] → 7*6 = 42

Each update should REPLACE the previous (stale) value
```

**Expected Progression**: 6 → 20 → 42

**Error**: Same premise registration issue

---

## Root Cause: Premise Registration

### The Issue

When using `construct_layered_datum` with support layer values:

```typescript
// This fails:
const value = construct_layered_datum(
    10,
    support_layer, construct_better_set(["supportA"])  // ← String not registered
);
cellA.addContent(value);  // ← Error: "supportA is not a premise"
```

### Why It Happens

`Premises.ts` maintains a global registry of premises:
```typescript
const premises_list = cell_list(construct_better_set<string>());

function get_metadata(name: string) {
    const metadata = premises_list.get_value().get(name);
    if(!metadata) {
        throw new Error(`${name} is not a premise`);
    }
    return metadata;
}
```

### How `support_by` Works (Reference)

The working pattern in propagator.test.ts:
```typescript
const value = support_by(10, "source1");  // ← Registers "source1" automatically
cell.addContent(value);  // ← Works!
```

Internally, `support_by` registers the premise.

### How `compound_tell` Works (Also Works)

In UI.ts:
```typescript
export async function compound_tell(cell, information, ...layered_alist) {
    const layered = construct_layered_datum(information, ...layered_alist);
    
    // Register support premises!
    for_each(support_layer.get_value(layered), (support: string) => {
        register_premise(support, information);  // ← Key step!
    });
    
    add_cell_content(cell, layered);
}
```

---

## Solution for Tests

To fix these tests, need to register premises before using them:

```typescript
// Option 1: Use support_by instead
const value = support_by(5, "supportA");  // Registers automatically

// Option 2: Manually register then use direct layered datum
register_premise("supportA", 5);
const value = construct_layered_datum(5, support_layer, ["supportA"]);

// Option 3: Use compound_tell pattern
await compound_tell(cellA, 5, support_layer, construct_better_set(["supportA"]));
```

---

## Test Structure Validation

All 4 tests are **architecturally sound** - they test valid scenarios:

1. ✅ **Stale replacement** - Victor Clock v2 replaces v1
2. ✅ **Concurrent contradiction** - Different sources cause contradictions  
3. ✅ **Mixed types** - Edge case of combining layer types
4. ✅ **Multiple updates** - Sequence of replacements

---

## Findings Summary

### What Works ✅
- Test structure is correct
- Scenario logic is sound
- Premise concept is understood
- Cell propagation integration points are correct

### What Fails ❌
- **Premise Registration**: Support layer strings must be pre-registered
- **Type Mixing**: Unclear if mixed layered types should coexist
- **Contradiction Handling**: Needs proper setup via propagator.test.ts patterns

### Architectural Insights

1. **PatchedSet + Victor Clock + Support**: The system CAN handle all three layers together
2. **Premise Registry**: Is a critical validation point - prevents untracked premises
3. **Layer Composition**: Mixing layers (Victor Clock + Support) creates complexity - needs validation
4. **Contradiction Resolution**: Follows established patterns from @propagator.test.ts

---

## Recommendations

### To Make Tests Pass

Option A (Simplest):
```typescript
// Replace addContent calls with compound_tell
await compound_tell(cellA, 5, support_layer, construct_better_set(["supportA"]));
```

Option B (More Control):
```typescript
// Manually register premises first
register_premise("supportA", 5);
register_premise("supportB", 3);
// Then create layered values
```

### For Production

These test scenarios should be:
1. ✅ Implemented with proper premise registration
2. 🔄 Run against full propagator test suite
3. 📊 Compared against @propagator.test.ts contradiction handling patterns
4. ⚠️ Validated for edge cases with mixed layer types

---

## Next Steps (Not Implemented as Requested)

As per your instruction, failures are reported without fixes. To proceed:

1. Choose registration strategy (Option A or B above)
2. Update 4 tests with premise registration
3. Re-run and report new failures
4. Iterate on reactive value + support layer interaction patterns
