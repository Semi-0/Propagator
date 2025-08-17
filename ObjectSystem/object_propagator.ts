import type { Cell, Propagator } from "..";
import { no_compute } from "../Helper/noCompute";
import { make_temp_cell } from "../Cell/Cell";
import { function_to_primitive_propagator, compound_propagator } from "../Propagator/Propagator";
import { c_fold, c_fold_pack, c_reduce, ce_equal, ce_map, ce_pull, p_map_a, p_reduce, p_switch } from "../Propagator/BuiltInProps";
import { p_feedback } from "../Propagator/BuiltInProps";
import { p_sync } from "../Propagator/BuiltInProps";
import { r_constant, the_nothing } from "..";
import { construct_simple_generic_propagator } from "../GenericPropagator/generic_propagator";
import { construct_simple_generic_procedure } from "generic-handler/GenericProcedure";
import { make_ce_arithmetical } from "../Propagator/Sugar";
import type { state } from "fp-ts";

type msg = {
    op: "get" | "set" | "call" | "custom"
    value: any
    reply_to: Cell<any> | undefined
}



export const create_object_reducer = <T, R = any>(
  name: string,
  step: (s: T, cmd: any) => { state: T; result?: R },
  state: Cell<T>
) => (
  cmd: Cell<any>,
  result?: Cell<R>
): Propagator => {
    // maybe it should take a step propagator instead of a step function
  // Step function as a cell effectful computation
  const ce_step = make_ce_arithmetical(
    function_to_primitive_propagator(`${name}:step`, step)
  );

  // Extractors for state and result
  const get_result = ce_map(
    (s: { state: T; result?: R }) => s.result ?? the_nothing
  ) as (s: Cell<{ state: T; result?: R }>) => Cell<R>;

  const get_state = ce_map(
    (s: { state: T; result?: R }) => s.state
  ) as (s: Cell<{ state: T; result?: R }>) => Cell<T>;

  // Compose the compound propagator
  return compound_propagator(
    [state, cmd],
    result ? [state, result] : [state],
    () => {
      // Apply the step and feedback the new state
      const stepped = ce_step(state, cmd) as Cell<{ state: T; result?: R }>;
      p_feedback(get_state(stepped), state);

      // Optionally sync the result
      if (result) {
        p_sync(get_result(stepped), result);
      }
    },
    name
  );
};

export const create_object_reducer_b = <T, R = any>(
    name: string,
    step: (s: Cell<T>, cmd: Cell<any>) => Cell<{ state: T; result?: R }>,
    state: Cell<T>
  ) => (
    cmd: Cell<any>,
    result?: Cell<R>
  ): Propagator => {
      // maybe it should take a step propagator instead of a step function
    // Step function as a cell effectful computation

    // Extractors for state and result
    const get_result = ce_map(
      (s: { state: T; result?: R }) => s.result ?? the_nothing
    ) as (s: Cell<{ state: T; result?: R }>) => Cell<R>;
  
    const get_state = ce_map(
      (s: { state: T; result?: R }) => s.state
    ) as (s: Cell<{ state: T; result?: R }>) => Cell<T>;
  
    // Compose the compound propagator
    return compound_propagator(
      [state, cmd],
      result ? [state, result] : [state],
      () => {
        // Apply the step and feedback the new state
        const stepped = step(state, cmd) as Cell<{ state: T; result?: R }>;
        p_feedback(get_state(stepped), state);
  
        // Optionally sync the result
        if (result) {
          p_sync(get_result(stepped), result);
        }
      },
      name
    );
  };


export const getter = (key: string, p_getter: (cell: Cell<any>) => Cell<any>) => construct_simple_generic_procedure(
    "get",
    2,
    (state: any, cmd: msg) => {
        if (cmd.op === "get" && cmd.value === key && cmd.reply_to !== undefined) {
            p_sync(
                p_getter(state), 
                cmd.reply_to
            )
        }
    }
)

export const create_object_propagator_b = (
    name: string,
    env: Cell<Map<string, any>>,
    dispatchers: ((critic: Cell<any>, env: Cell<Map<string, any>>, inputs: Cell<any>[], outputs: Cell<any>[]) => Propagator)[]
    //selector: (results: Cell<any[]>) -> Cell<amy>
) => {

    // env expose a reducer to multiple dispatcher

    const inner_network = (cmd: Cell<any>, inputs: Cell<any>[], outputs: Cell<any>[]) => compound_propagator([cmd, env], outputs, () => {
        // each dispatcher create a virual env of inputs and outputs
        for (const dispatcher of dispatchers) {
         
            dispatcher(cmd, env, inputs, outputs)
        }

    }, name)

    // built selector while wiring all the virual env outputs to the selector
    // selector ouput the final result to real outputs

    return (cmd: Cell<any>, inputs: Cell<any>[], outputs: Cell<any>[]) => inner_network(cmd, inputs, outputs)

}
    
export const create_env = (map: Map<string, any>) => {
    return r_constant(map)
}

export const lookup_env = (env: Cell<Map<string, any>>, key: Cell<string>) =>  function_to_primitive_propagator(
    "lookup_env",
    (env: Map<string, any>, key: string) =>{ 
        const value = env.get(key)
        if (value === undefined) {
            return no_compute
        } else {
            return value
        }
    }
)(env, key)

export const ce_lookup_env = make_ce_arithmetical(lookup_env)

export const make_pair = (key: Cell<string>, value: Cell<any>) => function_to_primitive_propagator(
    "make_pair",
    (key: string, value: any) => ({key, value})
)(key, value)

export const ce_pair = make_ce_arithmetical(make_pair)

export const set_env = (key: Cell<string>, value: Cell<any>, env: Cell<Map<string, any>>) => c_fold(
    (pair: {key: string, value: any}, env: Map<string, any>) => {
        const copy = new Map(env)
        copy.set(pair.key, pair.value)
        return copy 
    },
)(ce_pair(key, value), env)

export const ce_set_env = make_ce_arithmetical(set_env)

export const default_setter = (cmd: Cell<any>, env: Cell<Map<string, any>>, inputs: Cell<any>[], outputs: Cell<any>[]) => compound_propagator(
    [cmd, env],
    [env],
    () => {
        const new_env = make_temp_cell() as Cell<Map<string, any>>
       p_switch(
        ce_equal(cmd, r_constant("set")),
        ce_set_env(inputs[0], inputs[1]),
        new_env
       )
       p_feedback(new_env, env)
    },
    "default_setter"
)

export const default_getter = (cmd: Cell<any>, env: Cell<Map<string, any>>, inputs: Cell<any>[], outputs: Cell<any>[]) => compound_propagator(
    [cmd, env],
    outputs,
    () => {
        const getted = make_temp_cell() as Cell<any>
        p_switch(
            ce_equal(cmd, r_constant("get")),
            ce_lookup_env(env, inputs[0]),
            getted
        )
        p_sync(getted, outputs[0])
    },
    "default_getter"
)

export const c_increment = c_fold(
    (trigger: any, count: number) => count + 1 
)




export const increment = (pulse: Cell<boolean>) => (cmd: Cell<any>, env: Cell<Map<string, any>>, inputs: Cell<any>[], outputs: Cell<any>[]) => compound_propagator(
    [cmd, env],
    outputs,
    () => {
       const key = r_constant("count")
       const to_increment  = make_temp_cell() as Cell<number>
       c_increment(pulse, to_increment)
       

        default_getter(
        r_constant("get"),
        env,
        [key],
        [to_increment]
       )


       default_setter(
        r_constant("set"),
        env,
        [key, to_increment],
        [pulse]
       )

     
    },
    "increment"
)