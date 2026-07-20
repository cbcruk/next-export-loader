/**
 * Registry for the one bit `shallowPush` needs to hand the runtime: "the next
 * navigation to this path is shallow — a view-only URL change over already-loaded
 * data, so don't run the loader." Navigation is a singleton concern (like
 * {@link ./navigation-id}), so this is module state rather than React context.
 *
 * The pending target is matched by value (not consumed on read) so a StrictMode
 * double-invoked effect re-commits the same shallow result idempotently instead
 * of falling through to a full loader run on its second pass. It is released only
 * when navigation actually moves to a different path.
 */
let pendingShallowPath: string | null = null;

/**
 * Normalizes a router-relative path for comparison: drops a single trailing
 * slash on the pathname (so `trailingSlash: true` exports still match) and keeps
 * the query verbatim. `shallowPush('/list?sort=x')` and the resulting
 * `router.asPath` of `/list/?sort=x` normalize to the same string.
 */
function normalizePath(path: string): string {
  const queryIndex = path.indexOf('?');
  const pathname = queryIndex === -1 ? path : path.slice(0, queryIndex);
  const search = queryIndex === -1 ? '' : path.slice(queryIndex);
  const trimmed =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
  return trimmed + search;
}

/** Arms the next navigation to `path` as shallow. Called by `shallowPush`. */
export function markShallowNavigation(path: string): void {
  pendingShallowPath = normalizePath(path);
}

/** True while `asPath` is the armed shallow target. Pure read — never clears. */
export function isShallowNavigation(asPath: string): boolean {
  return (
    pendingShallowPath !== null && pendingShallowPath === normalizePath(asPath)
  );
}

/**
 * Voids a stale shallow intent once navigation has moved to a *different* path.
 * A real navigation elsewhere means the armed shallow target will never be hit,
 * so it must not linger and shallow-skip a later navigation that happens to land
 * on the same path.
 */
export function releaseShallowNavigation(asPath: string): void {
  if (
    pendingShallowPath !== null &&
    pendingShallowPath !== normalizePath(asPath)
  ) {
    pendingShallowPath = null;
  }
}

/** Test-only reset so specs don't leak the module-level pending target. */
export function resetShallowNavigation(): void {
  pendingShallowPath = null;
}
