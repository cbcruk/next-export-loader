import { defineLoader, RedirectError, type LoaderFn } from 'next-export-loader';
import { checkAuthGuard } from '@/core/auth-guard';
import type { Permission } from '@/core/permissions';
import { isTokenExpired, logout, refreshToken } from '@/data/auth';
import { sessionQuery } from '@/queries/session';

/**
 * next-export-loader adapter for the router-agnostic core. Returns a loader that:
 *
 * 1. refreshes an expired token, logging out on failure (pattern #5),
 * 2. resolves the session (awaited — so the guard never sees `loading`),
 * 3. runs `checkAuthGuard`, and translates its result into a `RedirectError`.
 *
 * The `currentPath` is preserved into `?redirect=` so login can return the user
 * to where they were headed (pattern #2).
 *
 * `defineLoader` IS the adapter from the article's pattern #4 — the same core
 * `checkAuthGuard` would sit behind a TanStack `beforeLoad` or a React Router
 * `loader` unchanged; only this translation layer differs.
 */
export function requirePermissions(
  ...requiredPermissions: Permission[]
): LoaderFn {
  return defineLoader(async ({ queryClient }) => {
    if (isTokenExpired()) {
      try {
        await refreshToken();
      } catch {
        logout();
      }
    }

    // Resolve the session THROUGH the shared query, so a protected page reading
    // sessionQuery() via useSuspenseQuery gets a cache hit (invariant #4).
    const session = await queryClient.ensureQueryData(sessionQuery());

    const result = checkAuthGuard({
      session,
      requiredPermissions,
      // Loaders run client-side (inside LoaderRuntime's effect), so
      // window.location is the accurate current path to return to after login.
      // Strip the configured basePath (empty at the root, `/foo` when the app is
      // served from a sub-path, e.g. on GitHub Pages) so the returned path is
      // router-relative — otherwise next/router re-prepends basePath and the
      // post-login redirect double-prefixes.
      currentPath: currentRouterPath(),
    });

    if (result.type === 'redirect') {
      throw new RedirectError(withSearch(result.to, result.search));
    }
  });
}

/** Authentication only, no specific permission. */
export function requireAuth(): LoaderFn {
  return requirePermissions();
}

/**
 * The current path as next/router sees it — `window.location` minus the
 * configured basePath. Next inlines the basePath into
 * `process.env.__NEXT_ROUTER_BASEPATH` at build time (the same value its own
 * router uses to strip basePath off `window.location`), so this stays correct
 * whether the app is served from the root or a sub-path.
 */
function currentRouterPath(): string {
  const basePath = process.env.__NEXT_ROUTER_BASEPATH ?? '';
  const full = window.location.pathname + window.location.search;
  if (basePath && full.startsWith(basePath)) {
    return full.slice(basePath.length) || '/';
  }
  return full;
}

function withSearch(
  to: string,
  search: Record<string, string> | undefined,
): string {
  if (!search) return to;
  const qs = new URLSearchParams(search).toString();
  return qs ? `${to}?${qs}` : to;
}
