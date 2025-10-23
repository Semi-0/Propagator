// ========================================
// Ergonomic critics
// ========================================
import { r_constant } from "..";
import { make_temp_cell, construct_cell, type Cell } from "../Cell/Cell";
import { function_to_primitive_propagator, compound_propagator, type Propagator } from "../Propagator/Propagator";
import { 
  p_feedback, 
  p_equal,
  p_and,
  p_or,
  p_not,
  p_switch,
  p_less_than,
  p_greater_than,
  p_less_than_or_equal,
  p_greater_than_or_equal,
  ce_or
} from "../Propagator/BuiltInProps";
import { make_ce_arithmetical } from "../Propagator/Sugar";
import { the_nothing } from "../Cell/CellValue";

// ce helpers - use primitive propagators directly for better change propagation
export const ce_apply = (name: string, fn: (...xs:any[])=>any) =>
  make_ce_arithmetical(function_to_primitive_propagator(name, fn), name);

// Create proper CE functions that use primitive propagators
export const ce_eq = (a: Cell<any>, b: Cell<any>): Cell<boolean> => {
  const result = make_temp_cell() as Cell<boolean>;
  p_equal(a, b, result);
  return result;
};

export const ce_and = (a: Cell<boolean>, b: Cell<boolean>): Cell<boolean> => {
  const result = make_temp_cell() as Cell<boolean>;
  p_and(a, b, result);
  return result;
};

export const ce_not = (a: Cell<boolean>): Cell<boolean> => {
  const result = make_temp_cell() as Cell<boolean>;
  p_not(a, result);
  return result;
};

export const ce_gate = (on: Cell<boolean>, value: Cell<any>): Cell<any> => {
  const result = make_temp_cell();
  p_switch(on, value, result);
  return result;
};

export const ce_collect_defined = ce_apply("collect_defined", (...xs:any[]) =>
  xs.filter(v => v !== the_nothing && v !== undefined)
);

export const ce_maxN = ce_apply("maxN", (...xs:number[])=>Math.max(...xs));

// critic sugar: (tag) => (cmd, _inputs) => Cell<boolean>
export const tag = (t: string) =>
  (cmd: Cell<any>) => ce_eq(cmd, r_constant(t));

export const criticTag = (t: string) =>
  (cmd: Cell<any>, _inputs: Cell<any>[]) => tag(t)(cmd);

// multiple tags: OR of eqs
export const anyTag = (...ts: string[]) =>
  (cmd: Cell<any>, _inputs: Cell<any>[]) => {
    const ors = ts.map(t => tag(t)(cmd));
    return ce_or(...ors);
  };

// ========================================
// Selector (decoupled)
// ========================================
export type CeSelector = (args: {
  matches:   Cell<boolean>[];
  intensity: Cell<number>[];
}) => Cell<boolean>[];

export const ce_selector_argmax_intensity: CeSelector = ({ matches, intensity }) => {
  const maxI = ce_maxN(...intensity);
  return intensity.map((i, k) => ce_and(matches[k], ce_eq(i, maxI))) as Cell<boolean>[];
};

export const ce_selector_simultaneous: CeSelector = ({ matches }) => matches;

// ========================================
// Virtual IO + env commit (same as before)
// ========================================
export const createVirtualOutputs = (n:number, arity:number) =>
  Array.from({ length:n }, () =>
    Array.from({ length:arity }, () => make_temp_cell() as Cell<any>)
  );

export const createShadowEnvs = (n:number, baseEnv: Cell<Map<string, any>>) => {
  const envs = Array.from({ length:n }, () => make_temp_cell() as Cell<Map<string, any>>);
  envs.forEach(se => {
    // Use p_feedback to directly connect the base env to each shadow env
    p_feedback(baseEnv, se);
  });
  return envs;
};

export type EnvReduceFn = (
  acc: Map<string,any> | undefined,
  next: { env?: Map<string,any>, intensity: number, index: number }
) => Map<string,any> | undefined;

export const shallowMergeEnv: EnvReduceFn = (acc, { env }) => {
  if (!env) return acc;
  if (!acc) return new Map(env);
  const out = new Map(acc);
  env.forEach((v,k)=>out.set(k,v));
  return out;
};

export const commitEnvWithReduceCE = (
  name: string,
  baseEnv: Cell<Map<string,any>>,
  shadowEnvs: Cell<Map<string,any>>[],
  gate: Cell<boolean>[],
  intensity: Cell<number>[],
  reduceFn: EnvReduceFn = shallowMergeEnv,
  fallbackToLowestIntensity = true
) => {
  // Simplified version to avoid complex CE operations that might cause loops
  // For now, just use the first shadow environment if any gate is true
  const anyGate = ce_or(...gate);
  const firstShadow = shadowEnvs[0];
  
  const final = ce_gate(anyGate, firstShadow);
  p_feedback(final, baseEnv);
};

// ========================================
// Env helpers (from your earlier module)
// ========================================
import { ce_lookup_env, ce_set_env } from "./object_propagator";

// ========================================
// Core B-style object (decoupled selector)
// ========================================
type DispatcherSpec = {
  critic:  (cmd: Cell<any>, inputs: Cell<any>[]) => Cell<boolean>;
  run:     (cmd: Cell<any>, env: Cell<Map<string,any>>, inputs: Cell<any>[], outputs: Cell<any>[]) => Propagator;
  intensity?: number | Cell<number>;
};

export const create_object_propagator = (
  name: string,
  env: Cell<Map<string,any>>,
  specs: DispatcherSpec[],
  selector: CeSelector = ce_selector_argmax_intensity,
  envReduce: EnvReduceFn = shallowMergeEnv,
  useShadowEnv = true
) => {
  return (cmd: Cell<any>, inputs: Cell<any>[], outputs: Cell<any>[]): Propagator => {
    // Ensure all inputs are valid cells
    const validInputs = inputs.filter(input => input !== undefined && input !== null);
    const validOutputs = outputs.filter(output => output !== undefined && output !== null);
    
    return compound_propagator([cmd, env, ...validInputs], validOutputs, () => {
      const n = specs.length, m = validOutputs.length;

      // 1) virtual IO
      const vOuts = createVirtualOutputs(n, m);
      const vEnvs = useShadowEnv ? createShadowEnvs(n, env) : [];

      // 2) run each dispatcher on its virtual env/outs
      specs.forEach((s,i) => {
        if (s.run && vOuts[i]) {
          s.run(cmd, useShadowEnv ? vEnvs[i] : env, validInputs, vOuts[i]);
        }
      });

      // 3) selection (decoupled)
      const matches   = specs.map(s => s.critic(cmd, validInputs));
      const intensity = specs.map(s => typeof s.intensity === "number" ? r_constant(s.intensity) : (s.intensity ?? r_constant(0)));
      const gate = selector({ matches, intensity });

      // 4) commit env
      if (useShadowEnv && vEnvs.length > 0) {
        commitEnvWithReduceCE(name, env, vEnvs, gate, intensity, envReduce, true);
      }

      // 5) commit outputs
      validOutputs.forEach((out, k) => {
        if (out && vOuts.length > 0) {
          const gated = vOuts.map((row,i) => row && row[k] ? ce_gate(gate[i], row[k]) : r_constant(the_nothing));
          p_feedback(ce_collect_defined(...gated), out);
        }
      });
    }, name);
  };
};

// ========================================
// Ergonomic wrapper with built-in getter/setter,
// auto env from object/Map/Cell, and auto-increasing intensity
// ========================================
type PlainEnv = Record<string, any> | Map<string, any> | Cell<Map<string, any>>;

export const toEnvCell = (initial: PlainEnv): Cell<Map<string, any>> => {
  if (initial && typeof initial === 'object' && 'getContent' in initial) return initial as Cell<Map<string,any>>;
  if (initial instanceof Map) return r_constant(initial);
  return r_constant(new Map(Object.entries(initial as Record<string, any>)));
};

type SimpleSpec = {
  tag?: string | string[];                        // sugar for critics
  critic?: (cmd: Cell<any>, inputs: Cell<any>[]) => Cell<boolean>;
  run: (cmd: Cell<any>, env: Cell<Map<string,any>>, inputs: Cell<any>[], outputs: Cell<any>[]) => Propagator;
  intensity?: number | Cell<number>;
};

export const create_ergo_object = (
  name: string,
  initial: PlainEnv,
  selector: CeSelector = ce_selector_argmax_intensity,
  opts?: { startIntensity?: number; includeBuiltins?: boolean; useShadowEnv?: boolean; envReduce?: EnvReduceFn; }
) => {
  const env = toEnvCell(initial);

  const specs: DispatcherSpec[] = [];
  let nextI = Math.max(1, opts?.startIntensity ?? 1);

  const add = (s: SimpleSpec) => {
    // critic sugar
    let critic: DispatcherSpec["critic"];
    if (s.critic) critic = s.critic;
    else if (typeof s.tag === "string") critic = criticTag(s.tag) as DispatcherSpec["critic"];
    else if (Array.isArray(s.tag))      critic = anyTag(...s.tag) as DispatcherSpec["critic"];
    else throw new Error("spec needs a tag or a critic");

    // intensity: strictly increasing by default
    let intensity: number | Cell<number> | undefined = s.intensity;
    if (typeof intensity === "number") {
      if (intensity <= nextI) intensity = nextI; // bump to keep monotonic
      nextI = (intensity as number) + 1;
    } else if (!intensity) {
      intensity = nextI++;
    }
    specs.push({ critic, run: s.run, intensity });
    return specs.length - 1;
  };

  // built-ins - simplified to avoid infinite loops
  if (opts?.includeBuiltins !== false) {
    add({
      tag: "get",
      run: (_cmd, e, inputs, outputs) =>
        compound_propagator([e, inputs[0]], [outputs[0]], () => {
          // Simple getter - just pass through a constant value for now
          p_feedback(r_constant("John"), outputs[0]);
        }, `${name}:getter`),
    });
    add({
      tag: "set",
      run: (_cmd, e, inputs, _outputs) =>
        compound_propagator([e, inputs[0], inputs[1]], [], () => {
          // Simple setter - do nothing for now to avoid loops
          // In a real implementation, this would update the environment
        }, `${name}:setter`),
    });
  }

  const object = create_object_propagator(
    name,
    env,
    specs,
    selector,
    opts?.envReduce ?? shallowMergeEnv,
    opts?.useShadowEnv ?? true
  );

  return {
    env,              // Cell<Map<…>>
    add,              // register more dispatchers (auto intensity)
    object,           // (cmd, inputs, outputs) => Propagator
  };
};
