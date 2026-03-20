/**
 * init_propagator_system
 *
 * Installs global generic-procedure handlers (e.g. `get_id`, `get_children`) via
 * `install_generics_package()` and guards against double-install.
 *
 * We intentionally use a dynamic import to avoid TDZ/circular-import ordering
 * problems when the test runner executes multiple files with failures.
 */
let _initPromise: Promise<void> | null = null;

export function init_propagator_system(): Promise<void> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const g = globalThis as any;
    const key = "__ppropogator_generics_installed__";
    if (g[key] === true) return;

    const mod = await import("./Shared/Generics");
    mod.install_generics_package();
    g[key] = true;
  })();

  return _initPromise;
}

