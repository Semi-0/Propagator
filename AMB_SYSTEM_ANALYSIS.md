# AMB System Failure Analysis

## Problem Summary

The AMB (ambiguous choice) system works correctly for simple addition and multiplication cases but fails for the Pythagorean triangle case (`x² + y² = z²`). The test shows that `x = &&the_nothing&&`, `y = 1`, `z = 2`, which is clearly incorrect.

## Observed Behavior from Test Output

1. **Initial Phase**: All hypotheses (1-8) are added to each cell (x, y, z)
2. **Kickout Phase**: System kicks out premises one by one as contradictions are detected
3. **Oscillation**: The system repeatedly chooses and kicks out the same premises in a cycle:
   - Chooses premise for z (e.g., `419f27ea...`)
   - Then kicks it out due to contradiction
   - Chooses premise for x (e.g., `7488231b...`)
   - Then kicks it out due to contradiction
   - Repeats in a loop

4. **Final State**: System fails to converge to a valid solution (3,4,5 or 4,3,5)

## Root Cause Hypotheses

### 1. **Greedy One-at-a-Time Premise Selection (Most Likely)**

**Problem**: The `find_premise_to_choose` function (line 83-103 in Search.ts) only finds ONE premise without nogoods at a time.

```typescript
export function find_premise_to_choose(premises: BetterSet<string>): string | undefined{
    return find(premises, (premise: string) => {
        return pipe(premises_nogoods(premise),
            (nogoods) => {
                if (length(nogoods) === 0){
                    return false  // Premise with no nogoods yet
                }
                else {
                    try {
                        return !some(nogoods, is_premises_in)  // Find first without active nogoods
                    }
                    //...
                }
            })
    })
}
```

**Why this breaks for triangle**:
- Triangle problem requires **coordinated choice** of 3 variables: x, y, z must all be chosen together
- Valid solutions: (3,4,5), (4,3,5), (6,8,10), (8,6,10)
- The system picks x=1, which immediately creates nogoods for most z values
- Then it picks z based on remaining options, which conflicts with x
- **No backtracking**: Once x=1 is chosen and creates nogoods, the system doesn't reconsider x when those nogoods propagate

**Why this works for addition**:
- Addition (`x + y = z`) is **monotonic** and has **fewer constraints**
- If x=1, y=1, then z=2 works immediately
- No need for complex search or backtracking

### 2. **Missing Global Search Strategy**

**Problem**: The system uses **dependency-directed backtracking** but lacks a global search strategy.

The comment on line 49 hints at this:
```typescript
// TODO: this need be able to work only if the support set can be propagated first!!!
```

**Issue**: 
- The AMB system assumes local contradiction resolution is sufficient
- For triangle: x², y², z² creates **non-local constraints**
- The constraint `x² + y² = z²` requires all three values to be "right" simultaneously
- Current approach: pick x, propagate, find contradiction, kick out x, try again
- **This creates an infinite loop of kicking out and retrying**

### 3. **Insufficient Nogood Learning**

**Problem**: The `save_nogood` function (line 244-261) saves nogoods, but the system doesn't use them effectively for multi-variable constraints.

```typescript
function save_nogood(nogood: BetterSet<string>){
    for_each(nogood, (premise: string) => {
        const previous_nogoods = premises_nogoods(premise)
        const merged_nogoods = add_item(previous_nogoods, remove_item(nogood, premise))
        set_premises_nogoods(premise, merged_nogoods)
    })
}
```

**Issue**:
- Nogoods are saved per-premise, but triangle needs **combination nogoods**
- Example: "x=1 AND z=2" is a nogood combination, but system only tracks "x=1 conflicts with {something}"
- When system reconsiders x=1 after trying other values, it doesn't remember "x=1 is incompatible with z=2"

### 4. **Premise Selection Order Problem**

**Problem**: `choose_premise_to_disbelieve` (line 263-281) prioritizes hypothetical premises, but doesn't consider **which hypothesis to try next**.

```typescript
function choose_premise_to_disbelieve(nogoods: BetterSet<BetterSet<string>>): any[] {
    //...
    return pipe(
        nogoods,
        (set) => sort_by(set, (nogood: BetterSet<string>) => count(is_hypothetical, nogood)),
        first,
        choose_first_hypothetical
    )
}
```

**Issue**:
- System always chooses the "first" hypothetical from the nogood set
- No heuristic for **which hypothesis to try next** after a kickout
- For triangle: after kicking out x=1, system might try x=2, which also fails
- Should use **constraint propagation** to narrow down viable choices before picking

### 5. **Wake-up Mechanism Timing**

**Problem**: When a premise is marked in/out, `wake_up_roots()` is called (PremiseMetaData.ts line 57-66):

```typescript
wake_up_roots(){
    set_global_state(PublicStateCommand.FORCE_UPDATE_ALL_CELLS)
    set_global_state(PublicStateCommand.ALERT_ALL_AMBS)
}
```

**Issue**:
- This forces UPDATE of ALL cells and alerts ALL AMBs
- For triangle: this causes cascading re-evaluations
- Might create **race conditions** where cells update before nogoods are fully propagated
- The system may be **thrashing**: constantly re-evaluating without settling

### 6. **Cross-Product Union Issues**

**Problem**: `cross_product_union` (line 212-215) computes Cartesian product of nogood sets:

```typescript
export function cross_product_union(nogoodss: BetterSet<BetterSet<BetterSet<string>>>): BetterSet<BetterSet<string>>{
    return reduce_right(nogoodss, pairwise_union, construct_better_set([[]]))
}
```

**Issue**:
- For 3 AMB variables with 8 choices each: potential for 8³ = 512 combinations
- If all are marked as nogoods, `cross_product_union` creates massive set
- Test output shows `nogoods [object Object]` without details - might be huge
- System might be **overwhelmed by nogoods** and unable to find a valid combination

## Why Simple Cases Work

**Addition (x + y = z)**:
- **Monotonic**: Constraints propagate in one direction
- **Dense solution space**: Many valid combinations (1+1=2, 1+2=3, 2+2=4, etc.)
- **Local decisions work**: Picking x=1 doesn't significantly constrain y and z
- **Fast convergence**: Usually finds solution within 1-2 iterations

**Multiplication (x * y = z)**:
- Similar to addition but slightly more constrained
- Still has many valid solutions in range 1-5
- Constraint propagation is straightforward

## Why Triangle Fails

**Pythagorean Triangle (x² + y² = z²)**:
- **Non-monotonic**: Changing x affects both x² and z² constraints
- **Sparse solution space**: Only (3,4,5) and (4,3,5) in range 1-8
- **Highly coupled**: All three variables must be correct simultaneously
- **Global constraint**: Cannot solve by picking variables one at a time
- **Requires search**: Need to explore multiple combinations systematically

## Recommended Solutions

### Short-term Fixes

1. **Add Search Depth Limit**: Prevent infinite loops
   ```typescript
   let search_depth = 0;
   const MAX_SEARCH_DEPTH = 100;
   if (search_depth++ > MAX_SEARCH_DEPTH) throw new Error("Search exhausted");
   ```

2. **Better Logging**: Show which premises are being chosen/kicked
   - Already have `configure_log_nogoods(true)` but output shows `[object Object]`
   - Need `JSON.stringify()` or custom formatter

3. **Cycle Detection**: Detect when same premises are being kicked repeatedly

### Long-term Solutions

1. **Implement Chronological Backtracking**
   - Maintain a **choice stack**: record all AMB decisions
   - When contradiction found: backtrack to last choice point
   - Try next alternative at that choice point

2. **Add Constraint Propagation Before Choice**
   - Before picking a premise, **propagate constraints** to eliminate impossible values
   - For triangle: if x=8, then y² < 0, so eliminate y>0 early

3. **Use Better Heuristics for Premise Selection**
   - **Most constrained first**: Choose AMB variable with fewest valid options
   - **Fail-first**: Choose premise most likely to expose contradictions early

4. **Implement Forward Checking**
   - When choosing premise for x, **check impact on y and z** before committing
   - Only choose if some valid combination exists for y and z

5. **Add Explicit Backjumping**
   - Instead of backtracking one level, **jump back to the choice that caused the conflict**
   - Uses nogood information to identify culprit

## Conclusion

The AMB system's fundamental issue is **lack of backtracking and global search**. It works for locally-constrained problems (addition, multiplication) but fails for globally-constrained problems (Pythagorean triples). The system needs either:

1. **Complete search** with backtracking (like Prolog's AMB)
2. **Smart constraint propagation** to reduce search space before choosing
3. **Better nogood learning** to avoid repeating failed combinations

Without these, the system will continue to work only for "easy" problems where greedy local choice suffices.

