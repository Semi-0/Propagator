import type { Node } from "./MiniReactor/MrType";
import { construct_node } from "./MiniReactor/MrPrimitive";
import { connect as mrConnect, disconnect as mrDisconnect, stepper as mrStepper, combine as mrPrimitiveCombine, dispose as mrPrimitiveDispose } from "./MiniReactor/MrPrimitiveCombinators";
import { map as mrMap, filter as mrFilter, tap as mrTap, subscribe as mrSubscribe, combine_latest as mrCombineLatest } from "./MiniReactor/MrCombinators";

export type ReadOnlyReactor<T> = Node<T>;

export interface StandardReactor<T> extends Node<T> {
  next: (v: T) => void;
}

export interface StatefulReactor<T> extends StandardReactor<T> {
  get_value: () => T;
  dispose: () => void;
}

/**
 * Construct a stateful reactor with an initial value.
 */
export function construct_stateful_reactor<T>(initial: T): StatefulReactor<T> {
  const root = construct_node<T>();
  // stepper wraps root and captures value updates
  const step = mrStepper(initial)(root);
  const reactor = step.node as any as StatefulReactor<T>;
  reactor.next = root.receive;
  reactor.get_value = () => step.get_value();
  reactor.dispose = () => {
    mrPrimitiveDispose(root as any);
  };
  return reactor;
}

/**
 * Wrap an existing stateful reactor as read-only.
 */
export function construct_readonly_reactor<T>(linked: StatefulReactor<T>): ReadOnlyReactor<T> {
  return linked as ReadOnlyReactor<T>;
}

// Combinators
export const map = mrMap;
export const filter = mrFilter;
export const tap = mrTap;
export const combine_latest = mrCombineLatest;
export const subscribe = (f: (v: any) => void) => (src: Node<any>) => mrSubscribe(f)(src);
export const dispose = mrPrimitiveDispose;
export const connect = mrConnect;
export const disconnect = mrDisconnect;

/**
 * Pipe an initial reactor through a sequence of combinators.
 */
export function pipe<T>(source: Node<T>, ...ops: ((node: Node<T>) => Node<T>)[]): Node<T> {
  return ops.reduce((acc, op) => op(acc), source);
} 