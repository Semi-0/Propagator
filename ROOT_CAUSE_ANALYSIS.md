# Root Cause Analysis: "should drop staled values" Test Failure

## Symptom
Test expects: 1 element (only the fresh value)
Test receives: 2 elements (both stale and fresh values)

The stale value should have been dropped but it wasn't.

---

## Log Analysis

### Test Setup
```
Stale Value:  base=10, victor_clock={source1: 1}, support=[premise1]
Fresh Value:  base=20, victor_clock={source1: 3}, support=[premise1]
```

### Execution Flow in Logs

**1. find_related_elements called:**
```
find_related_elements called with args: [
  [10, victor_clock: {}, support: [object]],  // stale value in set
  20,  // fresh value (base value only!)
  victor_clock: {}, 
  support: [object]
]
```

**ISSUE #1: `find_related_elements` receives entire fresh LayeredObject as second argument**
- Expected: layered_deep_equal to find all values in `set` that match the fresh value's base (20)
- Actual: The consolidator is receiving the whole fresh LayeredObject, not just the base

---

**2. base_equal comparison returns FALSE:**
```
base_equal called with args: [
  10,  // stale base value
  20   // fresh base value
]
base_equal returned: false
```

✅ This is CORRECT - bases don't match (10 ≠ 20)

BUT: This defeats the purpose! The function should be finding elements with the **SAME base value**, not filtering out those with different bases.

---

**3. find_related_elements returns array with stale value:**
```
find_related_elements returned: [
  [10, victor_clock: {}, ...]  // stale value wrapped in consolidator result
]
```

❌ **CRITICAL ISSUE**: `find_related_elements` is returning the stale value, which means:
- The consolidator wrapped the stale value as output
- This will be treated as "related elements found"
- But these aren't truly "related" - they have different bases!

---

**4. subsumes check:**
```
subsumes called with args: [[victor_clock: [10...]], 20...]

e_and called with args: [true, false]
e_and returned: false

subsumes returned: false
```

This means: "The stale value does NOT subsume the fresh value"
- ✅ Correct: subsumes should return false

---

**5. Since subsumes=false, the code executes:**
```
return add_item(drop(set, related_elements), elt)
```

This should:
1. Drop the stale value from the set
2. Add the fresh value

But instead... **both end up in the result!**

---

## Root Cause Chain

### Problem 1: Consolidator Signature Mismatch
```typescript
find_related_elements: (...args: any[]) => LayeredObject<any>[]
```

`construct_layered_consolidator("find_related_elements", 2, e_merge_sets, [])`

The consolidator calls `e_merge_sets(merged_layer_values)` where `merged_layer_values` contains layer pairs AFTER reduction through consolidator pipeline.

**The issue**: 
- `e_merge_sets = pipe(merge_sets, exclude_empty_value, exclude_base_layer)`
- It's merging layer VALUES, not filtering the SET by the element

---

### Problem 2: Mismatched Purpose
`find_related_elements` is supposed to:
- Input: `(set: LayeredObject[], element: LayeredObject)` 
- Output: Elements from set that are "related" to the element (e.g., same base value)

But what it's ACTUALLY doing:
- Consolidating layers from BOTH the set and the element
- Returning layer pairs, not set elements

---

### Problem 3: base_equal Logic
```typescript
return filter(set, (a: LayeredObject<any>) => {
    return log_tracer("base_equal", layers_base_equal)(a, elt)
})
```

This tries to filter by `layers_base_equal(a, elt)` where:
- `a` = element from set (LayeredObject with base=10)
- `elt` = fresh element (LayeredObject with base=20)

Result: NO elements match because bases differ!

---

## The Real Problem

**The consolidator pattern doesn't fit this use case:**

`construct_layered_consolidator` is designed to:
1. Take N layered objects
2. Extract layer values
3. Dispatch to layer-specific handlers
4. Reduce through layers

But `find_related_elements` needs to:
1. Take a SET of layered objects + a NEW element
2. Filter the set based on comparison with the new element
3. Return matching elements, NOT consolidated layers

**This is a fundamentally different operation!**

---

## Where the "Weirdness" Comes From

The logs show:
```
merge_sets called with args: [
  [], 
  [victor_clock, [10...]]  // Layer pairs being merged!
]

merge_sets returned: [victor_clock, [10...]]
```

The consolidator is:
1. Taking the layer pairs from both inputs
2. Merging them with `merge_sets` 
3. Excluding empty values
4. Excluding base layer
5. Returning a mangled result that's NOT the actual set elements

---

## What SHOULD Happen (vs What IS Happening)

### Expected Victor Clock Behavior
Stale (clock=1) vs Fresh (clock=3):
- Victor clock should recognize 1 < 3
- Fresh value should replace stale value
- `find_related_elements` should return the stale value (same base)
- `subsumes` should check if stale subsumes fresh (it doesn't, fresh is newer)
- Stale should be dropped, fresh added

### What's Actually Happening
- `find_related_elements` doesn't properly identify related elements
- It's consolidating layer values instead of filtering set elements
- The result is ambiguous and malformed
- The merge logic can't properly determine what to keep/drop

