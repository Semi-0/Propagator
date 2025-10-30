type DisposableLike = { dispose: () => unknown } | undefined | null;

/**
 * Best-effort disposal helper. If the target exposes a `dispose` method it will
 * be invoked exactly once. Otherwise, the function is a no-op.
 */
export const dispose = (target: DisposableLike): void => {
  if (target && typeof target.dispose === "function") {
    target.dispose();
  }
};

