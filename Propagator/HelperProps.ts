import { type Cell, cell_strongest, construct_cell } from "../Cell/Cell";
import { any_unusable_values, type the_nothing_type, the_nothing, is_nothing } from "../Cell/CellValue";
import { is_equal } from "generic-handler/built_in_generics/generic_arithmetic";
import { make_layered_procedure } from "sando-layer/Basic/LayeredProcedure";
import { construct_propagator, type Propagator } from "./Propagator";
import type { LayeredObject } from "sando-layer/Basic/LayeredObject";
import { is_layered_object } from "sando-layer/Basic/LayeredObject";
import { get_base_value } from "sando-layer/Basic/Layer";

/**
 * Create a simple pass-through propagator that forwards each input to the corresponding output
 * (by index) when activated.
 *
 * Notes:
 * - Inputs and outputs are paired by index: `inputs[i] -> outputs[i]` if present.
 * - This propagator subscribes to no cell events by default (empty interested_in),
 *   so it only runs when manually activated.
 *
 * Caveat:
 * - The update semantics depend on your configured merge function. Ensure your merge
 *   accepts the forwarded increment type for your use case.
 */
export const forward = (inputs: Cell<any>[], outputs: Cell<any>[]) => construct_propagator(
  inputs,
  outputs,
  () => {
    for (const [index, input] of inputs.entries()) {
      const output = outputs[index];
      if (output) {
        output.update(cell_strongest(input) as any);
      }
    }
  },
  "forward",
  null,
  []
);

/**
 * Apply a propagator constructor to a list of input and output cells.
 *
 * @param constructor A function that accepts `...cells` (inputs followed by outputs)
 *                    and returns a `Propagator`.
 * @param inputs The input cells.
 * @param outputs The output cells.
 * @returns The constructed propagator.
 */
export const apply_propagator = (
  constructor: (...cells: Cell<any>[]) => Propagator,
  inputs: Cell<any>[],
  outputs: Cell<any>[] = []
) => {
  const args = outputs.length > 0 ? [...inputs, ...outputs] : [...inputs];
  const propagator = constructor(...args);
  return propagator;
};

/**
 * Layered version of {@link apply_propagator}. This allows layered objects to
 * participate in the same protocol via the Sando layered-procedure mechanism.
 *
 * Arity: 2 (constructor, cells[])
 */
export const l_apply_propagator = make_layered_procedure(
  "apply_propagator",
  3,
  apply_propagator
);

/**
 * Dynamically apply a subnet (a propagator constructor stored in a cell) to inputs/outputs.
 *
 * Behavior:
 * - Reads the strongest value from `subnet` each activation. If it's unusable, do nothing.
 * - If the constructor hasn't changed since the last activation, only forwards inputs.
 * - If it changed and there was a previous subnet instance, dispose it, then apply the new one.
 * - Inputs are forwarded through a lightweight `forward` propagator into a simulated inputs array.
 *
 * NOTE: This helper is experimental and its exact semantics may evolve.
 */
const dispose_propagator_like = (value: Propagator | LayeredObject<Propagator> | the_nothing_type) => {
  if (is_nothing(value)) {
    return;
  }

  const maybeLayered = value as unknown;
  if (is_layered_object(maybeLayered)) {
    const base = get_base_value(maybeLayered as LayeredObject<Propagator>);
    if (base && typeof (base as Propagator).dispose === "function") {
      (base as Propagator).dispose();
    }
    return;
  }

  const maybeProp = value as Propagator;
  if (maybeProp && typeof maybeProp.dispose === "function") {
    maybeProp.dispose();
  }
};

export function apply_subnet(
  subnet: Cell<(...cells: Cell<any>[]) => Propagator>,
  inputs: Cell<any>[],
  outputs: Cell<any>[]
) {

  var subnet_propagator: Propagator | LayeredObject<Propagator> | the_nothing_type = the_nothing;
  var last_subnet: Propagator | the_nothing_type = the_nothing;
  var sim_inputs: Cell<any>[] = inputs.map((_, i) => construct_cell<any>(`sim_input_${i}`));
  const f = forward(inputs, sim_inputs);

  return construct_propagator(
    [
      ...inputs, subnet
    ],
    outputs,
    () => {
      const perhaps_subnet = cell_strongest(subnet);
      const args = [perhaps_subnet, ...inputs];
      if (any_unusable_values(args)) {
        return;
      } 
      else {
        if (is_equal(perhaps_subnet, last_subnet)) {
          f.activate();
        } else {
          // @ts-ignore
          last_subnet = perhaps_subnet;
          if (is_nothing(subnet_propagator)) {
            subnet_propagator = l_apply_propagator(perhaps_subnet as any, sim_inputs, outputs);
            f.activate();
          } 
          else {
            dispose_propagator_like(subnet_propagator);
            subnet_propagator = l_apply_propagator(perhaps_subnet as any, sim_inputs, outputs);
            f.activate();
          }
        }
      }
    },
    "apply_subnet"
  );
}


