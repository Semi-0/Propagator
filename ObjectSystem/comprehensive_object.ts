// ========================================
// Ergonomic critics
// ========================================
import { r_constant } from "..";
import { make_temp_cell, construct_cell, type Cell } from "../Cell/Cell";
import { function_to_primitive_propagator, compound_propagator, type Propagator } from "../Propagator/Propagator";
import { p_feedback } from "../Propagator/BuiltInProps";
import { make_ce_arithmetical } from "../Propagator/Sugar";
import { the_nothing } from "../Cell/CellValue";

// ce helpers
export const ce_apply = (name: string, fn: (...xs:any[])=>any) =>
  make_ce_arithmetical(function_to_primitive_propagator(name, fn), name);
export const ce_eq  = ce_apply("eq",  (a:any,b:any)=>a===b);
export const ce_and = ce_apply("and", (a:boolean,b:boolean)=>!!a && !!b);
export const ce_not = ce_apply("not", (a:boolean)=>!a);
export const ce_gate = ce_apply("gate",(on:boolean, v:any)=> on ? v : the_nothing);
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
    return ce_apply("orN", (...bs:boolean[]) => bs.some(Boolean))(...ors);
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
  const passthrough = make_ce_arithmetical(function_to_primitive_propagator("env_passthrough", (x:any)=>x));
  const envs = Array.from({ length:n }, () => make_temp_cell() as Cell<Map<string, any>>);
  envs.forEach(se => passthrough(baseEnv, se));
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
  const gated = shadowEnvs.map((se,i)=>ce_gate(gate[i], se));
  const reduced = ce_apply(`${name}_env_reduce`, (...vals:any[]) => {
    let acc: Map<string,any> | undefined = undefined;
    for (let i=0;i<vals.length;i+=2) {
      const env   = vals[i]     as Map<string,any> | undefined;
      const inten = vals[i + 1] as number;
      acc = reduceFn(acc, { env, intensity: inten, index: i/2 });
    }
    return acc ?? the_nothing;
  })(...gated.flatMap((g,i)=>[g, intensity[i]]));

  if (!fallbackToLowestIntensity) { p_feedback(reduced, baseEnv); return; }

  const anyGate = ce_apply(`${name}_anyGate`, (...bs:boolean[]) => bs.some(Boolean))(...gate);
  const minI    = ce_apply(`${name}_minI`,   (...xs:number[]) => Math.min(...xs))(...intensity);
  const fbCands = shadowEnvs.map((se,i)=>ce_gate(ce_eq(intensity[i], minI), se));
  const fallbackEnv = ce_apply(`${name}_last_defined`, (...vs:(Map<string,any>|undefined)[]) => {
    for (let j=vs.length-1;j>=0;j--) if (vs[j]) return vs[j];
    return the_nothing;
  })(...fbCands);

  const final = ce_apply(`${name}_pick_final`, (a:any,b:any)=>a ?? b)(
    ce_gate(anyGate, reduced),
    ce_gate(ce_not(anyGate), fallbackEnv)
  );
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
  return (cmd: Cell<any>, inputs: Cell<any>[], outputs: Cell<any>[]): Propagator =>
    compound_propagator([cmd, env, ...inputs], outputs, () => {
      const n = specs.length, m = outputs.length;

      // 1) virtual IO
      const vOuts = createVirtualOutputs(n, m);
      const vEnvs = useShadowEnv ? createShadowEnvs(n, env) : [];

      // 2) run each dispatcher on its virtual env/outs
      specs.forEach((s,i) => s.run(cmd, useShadowEnv ? vEnvs[i] : env, inputs, vOuts[i]));

      // 3) selection (decoupled)
      const matches   = specs.map(s => s.critic(cmd, inputs));
      const intensity = specs.map(s => typeof s.intensity === "number" ? r_constant(s.intensity) : (s.intensity ?? r_constant(0)));
      const gate = selector({ matches, intensity });

      // 4) commit env
      if (useShadowEnv) commitEnvWithReduceCE(name, env, vEnvs, gate, intensity, envReduce, true);

      // 5) commit outputs
      outputs.forEach((out, k) => {
        const gated = vOuts.map((row,i)=>ce_gate(gate[i], row[k]));
        p_feedback(ce_collect_defined(...gated), out);
      });
    }, name);
};

// ========================================
// Ergonomic wrapper with built-in getter/setter,
// auto env from object/Map/Cell, and auto-increasing intensity
// ========================================
type PlainEnv = Record<string, any> | Map<string, any> | Cell<Map<string, any>>;

export const toEnvCell = (initial: PlainEnv): Cell<Map<string, any>> => {
  if ((initial as any)?.constructor?.name === "Cell") return initial as Cell<Map<string,any>>;
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

  // built-ins
  if (opts?.includeBuiltins !== false) {
    add({
      tag: "get",
      run: (_cmd, e, inputs, outputs) =>
        compound_propagator([e, inputs[0]], [outputs[0]], () => {
          p_feedback(ce_lookup_env(e, inputs[0] as Cell<string>), outputs[0]);
        }, `${name}:getter`),
    });
    add({
      tag: "set",
      run: (_cmd, e, inputs, _outputs) =>
        compound_propagator([e, inputs[0], inputs[1]], [e], () => {
          p_feedback(ce_set_env(inputs[0] as Cell<string>, inputs[1], e), e); // writes to shadow env when enabled
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
