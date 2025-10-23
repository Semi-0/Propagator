import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { construct_simple_object_propagator } from "../ObjectSystem/object_propagator";
import { construct_cell, cell_strongest_base_value, type Cell } from "../Cell/Cell";
import { the_nothing } from "..";
import { tell } from "../Helper/UI";
import { update } from "../AdvanceReactivity/interface";
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler";
import { set_global_state, PublicStateCommand } from "../Shared/PublicState";
import { reactive_scheduler } from "../Shared/Scheduler/ReactiveScheduler";
import { set_merge } from "../Cell/Merge";
import { reactive_merge } from "../AdvanceReactivity/traced_timestamp/genericPatch";
import { ce_map } from "../Propagator/BuiltInProps";
import { r_constant } from "../AdvanceReactivity/interface";

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP);
  set_global_state(PublicStateCommand.SET_SCHEDULER, reactive_scheduler());
  set_merge(reactive_merge);
});

afterEach(async () => {
  await execute_all_tasks_sequential(() => {});
});

describe("construct_simple_object_propagator", () => {
  describe("Basic State Management", () => {
    test("should update state based on command", async () => {
      // Create a simple counter object propagator
      const step = (state: Cell<number>, cmd: Cell<string>): Cell<{ state: number; result?: any }> => {
        const increment = ce_map((cmd: string) => 
          cmd === "increment" ? 1 : 0
        )(cmd);
        
        return ce_map((state: number, increment: number) => ({
          state: state + increment
        }))(state, increment) as Cell<{ state: number; result?: any }>;
      };

      const state = construct_cell<number>("counter");
      const cmd = construct_cell<string>("cmd");
      
      // Initialize state with a value
      update(state, 0);
      
      const propagator = construct_simple_object_propagator(
        "counter",
        step,
        state
      )(cmd);

      // Send increment command
      update(cmd, "increment");
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(1);

      // Send another increment command
      update(cmd, "increment");
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(2);

      // Send unknown command (should not change state)
      update(cmd, "unknown");
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(2);
    });

    test("should handle complex state transitions", async () => {
      // Create a state machine with multiple states
      type State = "idle" | "loading" | "success" | "error";
      
      const step = (state: Cell<State>, cmd: Cell<string>): Cell<{ state: State; result?: any }> => {
        return ce_map((state: State, cmd: string) => {
          switch (cmd) {
            case "start":
              return { state: "loading" as State };
            case "success":
              return { state: "success" as State };
            case "error":
              return { state: "error" as State };
            case "reset":
              return { state: "idle" as State };
            default:
              return { state };
          }
        })(state, cmd) as Cell<{ state: State; result?: any }>;
      };

      const state = construct_cell<State>("state");
      const cmd = construct_cell<string>("cmd");
      
      // Initialize state
      update(state, "idle");
      
      const propagator = construct_simple_object_propagator(
        "stateMachine",
        step,
        state
      )(cmd);

      // Test state transitions
      update(cmd, "start");
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe("loading");

      update(cmd, "success");
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe("success");

      update(cmd, "reset");
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe("idle");
    });
  });

  describe("Result Handling", () => {
    test("should sync result when result cell is provided", async () => {
      // Create a calculator that returns results
      const step = (state: Cell<number>, cmd: Cell<{ op: string; value: number }>): Cell<{ state: number; result?: number }> => {
        return ce_map((state: number, cmd: { op: string; value: number }) => {
          let newState = state;
          let result: number | undefined = undefined;

          switch (cmd.op) {
            case "add":
              newState = state + cmd.value;
              result = newState;
              break;
            case "multiply":
              newState = state * cmd.value;
              result = newState;
              break;
            case "get":
              result = state;
              break;
          }

          return { state: newState, result };
        })(state, cmd) as Cell<{ state: number; result?: number }>;
      };

      const state = construct_cell<number>("calculator");
      const cmd = construct_cell<{ op: string; value: number }>("cmd");
      const result = construct_cell<number>("result");
      
      // Initialize state
      update(state, 0);
      
      const propagator = construct_simple_object_propagator(
        "calculator",
        step,
        state
      )(cmd, result);

      // Test with result cell
      update(cmd, { op: "add", value: 5 });
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(5);
      expect(cell_strongest_base_value(result)).toBe(5);

      update(cmd, { op: "multiply", value: 3 });
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(15);
      expect(cell_strongest_base_value(result)).toBe(15);

      update(cmd, { op: "get", value: 0 });
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(15);
      expect(cell_strongest_base_value(result)).toBe(15);
    });

    test("should handle undefined results gracefully", async () => {
      // Create a step function that sometimes returns undefined results
      const step = (state: Cell<number>, cmd: Cell<string>) => {
        return ce_map((state: number, cmd: string) => {
          if (cmd === "increment") {
            return { state: state + 1, result: state + 1 };
          } else if (cmd === "silent") {
            return { state: state + 1 }; // No result
          } else {
            return { state }; // No change, no result
          }
        })(state, cmd);
      };

      const state = construct_cell<number>("state");
      const cmd = construct_cell<string>("cmd");
      const result = construct_cell<number>("result");
      
      // Initialize state
      update(state, 0);
      
      const propagator = construct_simple_object_propagator(
        "silentCounter",
        step,
        state
      )(cmd, result);

      // Test with defined result
      update(cmd, "increment");
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(1);
      expect(cell_strongest_base_value(result)).toBe(1);

      // Test with undefined result (should use the_nothing)
      update(cmd, "silent");
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(2);
      expect(cell_strongest_base_value(result)).toBe(the_nothing);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("should handle empty commands gracefully", async () => {
      const step = (state: Cell<number>, cmd: Cell<any>) => {
        return ce_map((state: number, cmd: any) => {
          // Always return the same state if command is empty/null/undefined
          return { state };
        })(state, cmd);
      };

      const state = construct_cell<number>("state");
      const cmd = construct_cell<any>("cmd");
      
      // Initialize state
      update(state, 42);
      
      const propagator = construct_simple_object_propagator(
        "robustCounter",
        step,
        state
      )(cmd);

      // Test with various empty values
      update(cmd, null);
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(42);

      update(cmd, undefined);
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(42);

      update(cmd, "");
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(42);
    });

    test("should work without result cell", async () => {
      const step = (state: Cell<number>, cmd: Cell<number>) => {
        return ce_map((state: number, cmd: number) => ({
          state: state + cmd,
          result: state + cmd
        }))(state, cmd);
      };

      const state = construct_cell<number>("state");
      const cmd = construct_cell<number>("cmd");
      
      // Initialize state
      update(state, 0);
      
      // Create propagator without result cell
      const propagator = construct_simple_object_propagator(
        "noResultCounter",
        step,
        state
      )(cmd);

      // Should still update state correctly
      update(cmd, 5);
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(5);

      update(cmd, 3);
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(8);
    });

    test("should handle complex object states", async () => {
      type UserState = {
        name: string;
        age: number;
        active: boolean;
      };

      const step = (state: Cell<UserState>, cmd: Cell<Partial<UserState>>) => {
        return ce_map((state: UserState, cmd: Partial<UserState>) => ({
          state: { ...state, ...cmd },
          result: { ...state, ...cmd }
        }))(state, cmd);
      };

      const initialState: UserState = {
        name: "John",
        age: 30,
        active: true
      };

      const state = construct_cell<UserState>("user");
      const cmd = construct_cell<Partial<UserState>>("cmd");
      const result = construct_cell<UserState>("result");
      
      // Initialize state
      update(state, initialState);
      
      const propagator = construct_simple_object_propagator(
        "userManager",
        step,
        state
      )(cmd, result);

      // Test partial updates
      update(cmd, { age: 31 });
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toEqual({
        name: "John",
        age: 31,
        active: true
      });
      expect(cell_strongest_base_value(result)).toEqual({
        name: "John",
        age: 31,
        active: true
      });

      update(cmd, { name: "Jane", active: false });
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toEqual({
        name: "Jane",
        age: 31,
        active: false
      });
    });
  });

  describe("Reactive Behavior", () => {
    test("should react to state changes", async () => {
      const step = (state: Cell<number>, cmd: Cell<number>) => {
        return ce_map((state: number, cmd: number) => ({
          state: state + cmd
        }))(state, cmd);
      };

      const state = construct_cell<number>("state");
      const cmd = construct_cell<number>("cmd");
      
      // Initialize state
      update(state, 0);
      
      const propagator = construct_simple_object_propagator(
        "reactiveCounter",
        step,
        state
      )(cmd);

      // Test multiple rapid updates
      update(cmd, 1);
      update(cmd, 2);
      update(cmd, 3);
      
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(6);
    });

    test("should maintain consistency with multiple propagators", async () => {
      const step = (state: Cell<number>, cmd: Cell<number>) => {
        return ce_map((state: number, cmd: number) => ({
          state: state + cmd
        }))(state, cmd);
      };

      const state = construct_cell<number>("sharedState");
      const cmd1 = construct_cell<number>("cmd1");
      const cmd2 = construct_cell<number>("cmd2");
      
      // Initialize state
      update(state, 0);
      
      // Create two propagators sharing the same state
      const propagator1 = construct_simple_object_propagator(
        "counter1",
        step,
        state
      )(cmd1);

      const propagator2 = construct_simple_object_propagator(
        "counter2",
        step,
        state
      )(cmd2);

      // Test that both propagators can update the shared state
      update(cmd1, 5);
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(5);

      update(cmd2, 3);
      await execute_all_tasks_sequential(() => {});
      expect(cell_strongest_base_value(state)).toBe(8);
    });
  });
});
