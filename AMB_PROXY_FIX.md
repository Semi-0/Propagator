# How to Use Proxies to Fix `amb` System

## Problem: amb Fails on Complex Constraints

The Pythagorean triangle case fails because:
- AMB chooses values **one at a time** without coordination
- No backtracking when a choice fails
- Can't intercept and prevent bad choices before propagation

## Solution: Use Proxies to Intercept amb Choices

### 1. **Intercept amb choice decisions BEFORE propagation**

```typescript
// BEFORE: amb just makes a choice
p_amb(x, possibilities);  // x gets random value from possibilities
// If x=1, this might invalidate all z values! Too late to backtrack.

// AFTER: Use proxy to intercept and validate
const validateChoice = (variable: Cell, value: any, context: any) => {
  // Before marking premise IN, check:
  // 1. Does this choice leave valid options for dependent variables?
  // 2. Are there constraints that would be violated?
  // 3. Can we propagate forward to check for immediate contradiction?
  return true; // Only return true if choice is still valid
};

const AmbChoiceProxy = new Proxy(p_amb, {
  apply(target, thisArg, args) {
    const [cell, values] = args;
    console.log(`🔍 AMB choosing for ${cell.name} from [${to_string(values)}]`);
    
    // Could intercept here to validate choices
    const result = target.apply(thisArg, args);
    
    console.log(`✅ AMB choice registered for ${cell.name}`);
    return result;
  }
});
```

### 2. **Track amb choice sequence with Proxy**

```typescript
class AmbSequencer {
  private choiceHistory: any[] = [];
  private activeChoices: Map<string, any> = new Map();
  
  recordChoice(cellName: string, value: any) {
    this.activeChoices.set(cellName, value);
    this.choiceHistory.push({ cellName, value, timestamp: Date.now() });
  }
  
  canUndo() {
    return this.choiceHistory.length > 0;
  }
  
  undoLastChoice() {
    const last = this.choiceHistory.pop();
    if (last) {
      this.activeChoices.delete(last.cellName);
    }
    return last;
  }
}

const ambSequencer = new AmbSequencer();

const sequencerProxy = new Proxy(ambSequencer, {
  get(target, property) {
    if (property === 'recordChoice') {
      return function(cellName: string, value: any) {
        console.log(`📋 Recording choice: ${cellName} = ${value}`);
        console.log(`   Active choices: ${JSON.stringify([...target.activeChoices.entries()])}`);
        return target.recordChoice.call(target, cellName, value);
      };
    }
    
    if (property === 'undoLastChoice') {
      return function() {
        const undone = target.undoLastChoice.call(target);
        console.log(`↩️  Undid choice: ${undone?.cellName} = ${undone?.value}`);
        return undone;
      };
    }
    
    return target[property];
  }
});
```

### 3. **Intercept premise marking with Proxy**

```typescript
interface PremiseMarker {
  mark_premise_in(premise: string): void;
  mark_premise_out(premise: string): void;
  is_premise_in(premise: string): boolean;
}

const createPremiseProxy = (marker: PremiseMarker) => {
  return new Proxy(marker, {
    get(target, property) {
      if (property === 'mark_premise_in') {
        return function(premise: string) {
          console.log(`🟢 MARKING IN: ${premise}`);
          // Could add validation here:
          // - Check if this contradicts already-marked premises
          // - Check if this still allows valid combinations
          const result = target.mark_premise_in.call(target, premise);
          console.log(`   Current in-premises: [...]`);
          return result;
        };
      }
      
      if (property === 'mark_premise_out') {
        return function(premise: string) {
          console.log(`🔴 MARKING OUT: ${premise}`);
          const result = target.mark_premise_out.call(target, premise);
          console.log(`   Remaining premises: [...?]`);
          return result;
        };
      }
      
      return target[property];
    }
  });
};
```

### 4. **Full amb flow with Proxy interception**

```typescript
interface AmbContext {
  cell: Cell<any>;
  possibilities: BetterSet<any>;
  chosenValue?: any;
  contradictions: any[];
  isBacktracking: boolean;
}

const createAmbProxy = (ambLogic: any) => {
  const contexts: Map<string, AmbContext> = new Map();
  
  return new Proxy(ambLogic, {
    get(target, property) {
      // Intercept amb_choose
      if (property === 'amb_choose') {
        return function() {
          console.log(`\n${'='.repeat(60)}`);
          console.log(`⚡ AMB CHOOSE CALLED`);
          console.log(`${'='.repeat(60)}`);
          
          // Before making choice
          const allContexts = Array.from(contexts.values());
          console.log(`📊 Current state:`);
          allContexts.forEach(ctx => {
            console.log(`  - ${ctx.cell.name}: chosen=${ctx.chosenValue || 'none'}, contradictions=${ctx.contradictions.length}`);
          });
          
          // Make the choice
          const result = target[property].call(target);
          
          // After making choice - validate
          console.log(`✨ Choice made, validating...`);
          
          return result;
        };
      }
      
      if (property === 'find_premise_to_choose') {
        return function(premises: BetterSet<string>) {
          console.log(`🔎 Finding premise to choose from ${length(premises)} premises`);
          const chosen = target[property].call(target, premises);
          console.log(`   → Selected: ${chosen}`);
          return chosen;
        };
      }
      
      return target[property];
    }
  });
};
```

### 5. **Validate choice combinatorially**

```typescript
class ChoiceValidator {
  constructor(private constraints: Function[]) {}
  
  validateCombination(choices: Map<string, any>): boolean {
    // Run all constraints
    for (const constraint of this.constraints) {
      try {
        if (!constraint(choices)) {
          return false;
        }
      } catch (e) {
        return false; // Constraint failed = invalid combination
      }
    }
    return true;
  }
  
  findValidChoices(cellName: string, possibilities: any[], currentChoices: Map<string, any>): any[] {
    return possibilities.filter(value => {
      const testChoices = new Map(currentChoices);
      testChoices.set(cellName, value);
      return this.validateCombination(testChoices);
    });
  }
}

const validatorProxy = new Proxy(validator, {
  get(target, property) {
    if (property === 'findValidChoices') {
      return function(cellName: string, possibilities: any[], currentChoices: Map<string, any>) {
        console.log(`🔍 Checking validity of ${possibilities.length} choices for ${cellName}`);
        console.log(`   With current choices: ${JSON.stringify([...currentChoices.entries()])}`);
        
        const valid = target.findValidChoices.call(target, cellName, possibilities, currentChoices);
        
        console.log(`✅ Valid choices: ${valid.length}/${possibilities.length}`);
        if (valid.length === 0) {
          console.log(`❌ NO VALID CHOICES - BACKTRACK NEEDED!`);
        }
        
        return valid;
      };
    }
    
    return target[property];
  }
});
```

### 6. **Practical usage for Pythagorean triangle**

```typescript
// Example: Track amb decisions for triangle problem
const triangleAmb = {
  choices: new Map<string, number>(),
  
  attemptTriangleChoice(varName: string, value: number, context: any) {
    console.log(`\n🔷 Attempting ${varName} = ${value}`);
    
    this.choices.set(varName, value);
    
    // Validate triangle constraint
    const x = this.choices.get('x');
    const y = this.choices.get('y');
    const z = this.choices.get('z');
    
    if (x && y && z) {
      if (x*x + y*y === z*z) {
        console.log(`✅ VALID TRIANGLE: ${x}² + ${y}² = ${z}²`);
        return true;
      } else {
        console.log(`❌ INVALID: ${x}² + ${y}² ≠ ${z}²`);
        this.choices.delete(varName);
        return false;
      }
    }
    
    return true; // Incomplete, wait for more choices
  }
};

const triangleAmbProxy = new Proxy(triangleAmb, {
  get(target, property) {
    if (property === 'attemptTriangleChoice') {
      return function(varName: string, value: number, context: any) {
        console.log(`${'─'.repeat(50)}`);
        const result = target.attemptTriangleChoice.call(target, varName, value, context);
        console.log(`   Result: ${result ? 'ACCEPT' : 'REJECT'}`);
        console.log(`   Choices so far: [${Array.from(target.choices.entries()).map(([k, v]) => `${k}=${v}`).join(', ')}]`);
        return result;
      };
    }
    
    return target[property];
  }
});

// Usage
triangleAmbProxy.attemptTriangleChoice('x', 3, {});
triangleAmbProxy.attemptTriangleChoice('y', 4, {});
triangleAmbProxy.attemptTriangleChoice('z', 5, {});
// Logs:
// ──────────────────────────────────────────────────
// 🔷 Attempting x = 3
//    Result: ACCEPT
//    Choices so far: [x=3]
// 
// ──────────────────────────────────────────────────
// 🔷 Attempting y = 4
//    Result: ACCEPT
//    Choices so far: [x=3, y=4]
//
// ──────────────────────────────────────────────────
// 🔷 Attempting z = 5
// ✅ VALID TRIANGLE: 3² + 4² = 5²
//    Result: ACCEPT
//    Choices so far: [x=3, y=4, z=5]
```

## Key Benefits of Proxy Approach for amb

1. **Visibility**: See exactly when and why amb makes choices
2. **Validation**: Intercept choices before propagation
3. **Backtracking**: Record choices so you can undo
4. **Constraint Checking**: Validate combinations early
5. **Debugging**: Comprehensive logging without modifying core logic

## Implementation Checklist for Your amb

- [ ] Create proxy for `p_amb` to track all amb declarations
- [ ] Create proxy for `mark_premise_in/out` to log premise changes
- [ ] Create validator to check constraint satisfaction before commitment
- [ ] Create backtracker to undo choices when needed
- [ ] Add combinatorial checking for multi-variable problems like triangle

This approach lets you add validation logic **without changing the amb core**, using Proxy interception!
