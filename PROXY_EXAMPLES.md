# JavaScript Proxy Guide: Intercepting Method Calls

## 1. Basic Proxy with Method Call Interception

```typescript
// Original function/method
function greet(name: string) {
  return `Hello, ${name}!`;
}

// Create proxy with apply trap (for function calls)
const handler = {
  apply(target, thisArg, argumentsList) {
    console.log(`Calling function with args: ${JSON.stringify(argumentsList)}`);
    return target.apply(thisArg, argumentsList);
  }
};

const proxyGreet = new Proxy(greet, handler);
console.log(proxyGreet("Alice")); 
// Logs: Calling function with args: ["Alice"]
// Output: Hello, Alice!
```

## 2. Proxying Class Instances to Intercept Methods

```typescript
class Calculator {
  add(a: number, b: number) {
    console.log(`Adding ${a} + ${b}`);
    return a + b;
  }
  
  multiply(a: number, b: number) {
    return a * b;
  }
}

const calc = new Calculator();

const handler = {
  get(target, property, receiver) {
    const originalMethod = target[property];
    
    // If it's a function, wrap it with logging
    if (typeof originalMethod === 'function') {
      return function (...args) {
        console.log(`🔵 Method called: ${String(property)}`);
        console.log(`   Arguments: ${JSON.stringify(args)}`);
        const result = originalMethod.apply(this, args);
        console.log(`   Result: ${result}`);
        return result;
      };
    }
    
    return originalMethod;
  }
};

const proxyCalc = new Proxy(calc, handler);
proxyCalc.add(5, 3);
// Logs: 🔵 Method called: add
//       Arguments: [5, 3]
//       Adding 5 + 3
//       Result: 8
```

## 3. Intercepting Constructor Calls with `new`

```typescript
class Person {
  name: string;
  
  constructor(name: string) {
    console.log(`Constructor called with: ${name}`);
    this.name = name;
  }
  
  greet() {
    return `Hi, I'm ${this.name}`;
  }
}

// Create a proxy for the class itself (not instances)
const PersonProxy = new Proxy(Person, {
  construct(target, argumentsList, newTarget) {
    console.log(`🏗️  Creating new instance with args: ${JSON.stringify(argumentsList)}`);
    const instance = new target(...argumentsList);
    console.log(`✅ Instance created successfully`);
    return instance;
  }
});

const person = new PersonProxy("Bob");
// Logs: 🏗️  Creating new instance with args: ["Bob"]
//       Constructor called with: Bob
//       ✅ Instance created successfully
console.log(person.greet()); // Hi, I'm Bob
```

## 4. Real-World Example: Ambiguous Values Interception

```typescript
class AmbiguousValue {
  private values: any[];
  
  constructor(...values: any[]) {
    this.values = values;
  }
  
  getValues() {
    return this.values;
  }
  
  add(other: AmbiguousValue) {
    return new AmbiguousValue(
      ...this.values.map(v => v + other.getValues()[0])
    );
  }
}

// Create proxy to track all amb operations
const AmbProxy = new Proxy(AmbiguousValue, {
  construct(target, args, newTarget) {
    console.log(`📦 Creating Amb with values: [${args}]`);
    return new target(...args);
  }
});

// Proxy instance methods
function createAmbWithTracking(values: any[]) {
  const amb = new AmbProxy(...values);
  
  return new Proxy(amb, {
    get(target, property) {
      const value = target[property];
      
      if (typeof value === 'function') {
        return function (...args: any[]) {
          console.log(`🔷 Amb.${String(property)} called`);
          const result = value.apply(target, args);
          console.log(`🔷 Result: ${JSON.stringify(result)}`);
          return result;
        };
      }
      
      return value;
    }
  });
}

const amb1 = createAmbWithTracking([1, 2, 3]);
const amb2 = createAmbWithTracking([10, 20]);

amb1.add(amb2);
// Logs: 🔷 Amb.add called
//       🔷 Result: AmbiguousValue { values: [11, 12, 13] }
```

## 5. Advanced: Tracking Property Changes

```typescript
class Amb {
  public values: any[] = [];
  
  constructor(...values: any[]) {
    this.values = values;
  }
}

const handler = {
  // Intercept property access
  get(target, property) {
    console.log(`📖 Reading property: ${String(property)}`);
    return target[property];
  },
  
  // Intercept property assignment
  set(target, property, value) {
    console.log(`✏️  Setting ${String(property)} = ${JSON.stringify(value)}`);
    target[property] = value;
    return true;
  },
  
  // Intercept 'in' operator
  has(target, property) {
    console.log(`🔍 Checking if property exists: ${String(property)}`);
    return property in target;
  },
  
  // Intercept Object.keys()
  ownKeys(target) {
    console.log(`🔑 Getting all keys`);
    return Object.keys(target);
  }
};

const amb = new Proxy(new Amb(1, 2, 3), handler);
amb.values;           // Logs: 📖 Reading property: values
amb.values = [4, 5];  // Logs: ✏️  Setting values = [4, 5]
'values' in amb;      // Logs: 🔍 Checking if property exists: values
Object.keys(amb);     // Logs: 🔑 Getting all keys
```

## 6. Combining Constructor + Method Interception

```typescript
class ReactiveAmb {
  private listeners: Function[] = [];
  
  constructor(public values: any[]) {}
  
  update(newValues: any[]) {
    this.values = newValues;
    this.notify();
  }
  
  private notify() {
    this.listeners.forEach(f => f(this.values));
  }
  
  subscribe(listener: Function) {
    this.listeners.push(listener);
  }
}

const ReactiveAmbProxy = new Proxy(ReactiveAmb, {
  construct(target, args) {
    console.log(`⚡ Creating ReactiveAmb`);
    return new target(...args);
  }
});

function createReactiveAmb(...values: any[]) {
  const amb = new ReactiveAmbProxy(values);
  
  // Proxy the methods
  return new Proxy(amb, {
    get(target, property) {
      if (property === 'update' || property === 'subscribe') {
        return function (...args: any[]) {
          console.log(`⚙️  ${String(property)} called`);
          const result = target[property].apply(target, args);
          console.log(`   Updated values: ${JSON.stringify(target.values)}`);
          return result;
        };
      }
      return target[property];
    }
  });
}

const reactive = createReactiveAmb(1, 2, 3);
// Logs: ⚡ Creating ReactiveAmb

reactive.subscribe((vals: any[]) => console.log(`Notified: ${vals}`));
// Logs: ⚙️  subscribe called
//       Updated values: [1, 2, 3]

reactive.update([4, 5, 6]);
// Logs: ⚙️  update called
//       Notified: [4, 5, 6]
//       Updated values: [4, 5, 6]
```

## Key Trap Types

| Trap | Purpose | Example |
|------|---------|---------|
| `apply` | Function call | `proxy()` |
| `construct` | `new` operator | `new proxy()` |
| `get` | Property access | `proxy.prop` |
| `set` | Property assignment | `proxy.prop = val` |
| `has` | `in` operator | `'prop' in proxy` |
| `ownKeys` | `Object.keys()` | `Object.keys(proxy)` |
| `deleteProperty` | `delete` operator | `delete proxy.prop` |
| `getPrototypeOf` | `Object.getPrototypeOf()` | Protocol introspection |

## Best Practices for amb/Ambiguous Values

```typescript
// ✅ DO: Create clear handler objects
const createAmbHandler = () => ({
  get(target, property) {
    if (typeof target[property] === 'function') {
      return function (...args) {
        const result = target[property].apply(target, args);
        target.listeners?.forEach(f => f({ property, args, result }));
        return result;
      };
    }
    return target[property];
  }
});

// ✅ DO: Use composition for complex interception
const createTrackedAmb = (values: any[]) => {
  const amb = new Amb(...values);
  return new Proxy(amb, createAmbHandler());
};

// ❌ DON'T: Put too much logic in trap handlers
// ❌ DON'T: Create new handlers on every call
```

## For Your amb System

```typescript
// Example: Tracking amb consolidation
class AmbConsolidator {
  consolidate(values: any[]) {
    return values.reduce((a, b) => a + b, 0);
  }
}

const handler = {
  get(target, property) {
    if (property === 'consolidate') {
      return function (...args: any[]) {
        console.log(`🔄 Consolidating amb values`);
        const result = target[property].apply(target, args);
        console.log(`✨ Consolidated result: ${result}`);
        return result;
      };
    }
    return target[property];
  }
};

const consolidator = new Proxy(new AmbConsolidator(), handler);
consolidator.consolidate([1, 2, 3, 4, 5]);
// Logs: 🔄 Consolidating amb values
//       ✨ Consolidated result: 15
```
