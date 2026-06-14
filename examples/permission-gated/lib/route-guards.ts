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
      currentPath: window.location.pathname + window.location.search,
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

function withSearch(
  to: string,
  search: Record<string, string> | undefined,
): string {
  if (!search) return to;
  const qs = new URLSearchParams(search).toString();
  return qs ? `${to}?${qs}` : to;
}
