import type { Node } from "./MiniReactor/MrType";
import { construct_node } from "./MiniReactor/MrPrimitive";
import {
  connect as mrConnect,
  disconnect as mrDisconnect,
  stepper as mrStepper,
  dispose as mrDispose
} from "./MiniReactor/MrPrimitiveCombinators";
import {
  map as mrMap,
  filter as mrFilter,
  tap as mrTap,
  subscribe as mrCombinatorSubscribe,
  combine_latest as mrCombineLatest
} from "./MiniReactor/MrCombinators";

/** A read-only reactive stream of T */
export type ReadOnly<T> = Node<T>;

/** A stateful reactive stream we can push to, peek, and dispose */
export interface ReactiveState<T> {
  /** the underlying node to drive or subscribe to */
  node: ReadOnly<T>;
  /** push a new value */
  next(v: T): void;
  /** read the last pushed value */
  get_value(): T;
  /** remove the node and its descendants */
  dispose(): void;
  /** subscribe to value updates */
  subscribe(f: (v: T) => void): ReadOnly<T>;
}

/** The reactive engine interface */
export interface IReactive {
  constructStateful<T>(initial: T): ReactiveState<T>;
  constructReadOnly<T>(linked: ReactiveState<T>): ReadOnly<T>;
  map<A, B>(f: (a: A) => B): (src: ReadOnly<A>) => ReadOnly<B>;
  filter<A>(f: (a: A) => boolean): (src: ReadOnly<A>) => ReadOnly<A>;
  tap<A>(f: (a: A) => void): (src: ReadOnly<A>) => ReadOnly<A>;
  combineLatest<A>(...src: ReadOnly<A>[]): ReadOnly<A>;
  pipe<A>(
    src: ReadOnly<A>,
    ...ops: ((node: ReadOnly<A>) => ReadOnly<A>)[]
  ): ReadOnly<A>;
  connect<A, B>(
    parent: ReadOnly<A>,
    child: ReadOnly<B>,
    fn: (notify: (v: B) => void, v: A) => void
  ): void;
  disconnect<A, B>(parent: ReadOnly<A>, child: ReadOnly<B>): void;
  subscribe<A>(f: (v: A) => void): (src: ReadOnly<A>) => ReadOnly<A>;
  dispose<T>(state: ReactiveState<T>): void;
}

/** Adapter implementation over MiniReactor */
export class MiniReactorAdapter implements IReactive {
  constructStateful<T>(initial: T): ReactiveState<T> {
    const root = construct_node<T>();
    const step = mrStepper(initial)(root);
    return {
      node: step.node,
      next: root.receive,
      get_value: () => step.get_value(),
      dispose: () => mrDispose(root),
      subscribe: (f: (v: T) => void) => {
        // Send initial value
        f(step.get_value());
        // Subscribe to subsequent updates
        return mrCombinatorSubscribe(f)(step.node);
      },
    };
  }

  constructReadOnly<T>(linked: ReactiveState<T>): ReadOnly<T> {
    return linked.node;
  }

  map = <A, B>(f: (a: A) => B) => mrMap(f);
  filter = <A>(f: (a: A) => boolean) => mrFilter(f);
  tap = <A>(f: (a: A) => void) => mrTap(f);
  combineLatest = <A>(...src: ReadOnly<A>[]) => mrCombineLatest(...src);
  pipe = <A>(
    src: ReadOnly<A>,
    ...ops: ((node: ReadOnly<A>) => ReadOnly<A>)[]
  ) => ops.reduce((acc, op) => op(acc), src);
  connect = <A, B>(
    parent: ReadOnly<A>,
    child: ReadOnly<B>,
    fn: (notify: (v: B) => void, v: A) => void
  ) => {
    mrConnect(parent as any, child as any, fn);
  };
  disconnect = <A, B>(parent: ReadOnly<A>, child: ReadOnly<B>) => {
    mrDisconnect(parent as any, child as any);
  };
  subscribe = <A>(f: (v: A) => void) => (src: ReadOnly<A>) =>
    mrCombinatorSubscribe(f)(src);
  dispose = <T>(state: ReactiveState<T>) => state.dispose();
}

/** Export a singleton engine instance */
export const Reactive: IReactive = new MiniReactorAdapter(); 