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

// THIS CLASS NEEDS SERIOUS REFACTORING
// THIS IS SO STUPIDLY WRONG!!!!


/** A read-only reactive stream of T */
export type ReadOnly<T> = {
  next: (v: T) => void;
  dispose: () => void;
  subscribe: (f: (v: T) => void) => void;
}
// this had some serious issues if we use readOnly as a output type

/** A stateful reactive stream we can push to, peek, and dispose */
export interface ReactiveState<T> extends ReadOnly<T>{
  /** the underlying node to drive or subscribe to */
  get_value(): T;
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


const MiniReactorToReadOnly = (node: Node<any>): ReadOnly<any> => {
  return {
    next: node.receive,
    dispose: () => mrDispose(node),
    subscribe: (f: (v: any) => void) => mrCombinatorSubscribe(f)(node)
  }
}

/** Adapter implementation over MiniReactor */
export class MiniReactorAdapter implements IReactive {
  constructStateful<T>(initial: T): ReactiveState<T> {
    const root = construct_node<T>();
    const step = mrStepper(initial)(root);
    return {
      next: root.receive,
      get_value: () => step.get_value(),
      dispose: () => mrDispose(root),
      subscribe: (f: (v: T) => void) => {
        // Send initial value
        f(step.get_value());
        // Subscribe to subsequent updates
        mrCombinatorSubscribe(f)(step.node as Node<T>);
      },
    };
  }

  constructReadOnly<T>(linked: ReactiveState<T>): ReadOnly<T> {
    return {
      next: linked.next,
      dispose: linked.dispose,
      subscribe: linked.subscribe
    }
  }

  map = <A, B>(f: (a: A) => B) => (src: ReadOnly<A>) => MiniReactorToReadOnly(mrMap(f)(src as any));
  filter = <A>(f: (a: A) => boolean) => (src: ReadOnly<A>) => MiniReactorToReadOnly(mrFilter(f)(src as any));
  tap = <A>(f: (a: A) => void) => (src: ReadOnly<A>) => MiniReactorToReadOnly(mrTap(f)(src as any));
  combineLatest = <A>(...src: ReadOnly<A>[]) => MiniReactorToReadOnly(mrCombineLatest(...src));
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
  subscribe = <A>(f: (v: A) => void) => (src: ReadOnly<A>) => {
    mrCombinatorSubscribe(f)(src as any);
    return src;
  }
  dispose = <T>(state: ReactiveState<T>) => state.dispose();
}

/** Export a singleton engine instance */
export const Reactive: IReactive = new MiniReactorAdapter(); 