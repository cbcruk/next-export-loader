import {
  hasPermissions,
  type Permission,
  type User,
} from './permissions';

/**
 * Three-state session. Distinguishing `loading` from `unauthenticated` is what
 * prevents the "authenticated user briefly bounced to /login" flash that a
 * `User | null` model causes on first load.
 *
 * Note: under next-export-loader the loader awaits the session before the
 * component mounts, so a loader-based adapter never observes `loading` at guard
 * time — it resolves the session first. The state is still modeled in the core
 * because synchronous routers (plain React Router loaders, the article's
 * `beforeLoad`) read the session as-is and must handle `loading` explicitly.
 */
export type Session =
  | { status: 'loading' }
  | { status: 'authenticated'; user: User }
  | { status: 'unauthenticated' };

export interface AuthGuardConfig {
  session: Session;
  /** Permissions the destination requires. Empty = authentication only. */
  requiredPermissions?: ReadonlyArray<Permission>;
  /** Current location, preserved so the user returns here after login. */
  currentPath: string;
  loginPath?: string;
  unauthorizedPath?: string;
  redirectParam?: string;
}

export type GuardResult =
  | { type: 'allow' }
  | { type: 'pending' }
  | { type: 'redirect'; to: string; search?: Record<string, string> };

/**
 * Router-agnostic auth/permission decision. Pure function: no throwing, no
 * router imports — each router's adapter maps the result onto its own redirect
 * primitive. This is the reusable layer that survives a router swap.
 */
export function checkAuthGuard(config: AuthGuardConfig): GuardResult {
  const {
    session,
    requiredPermissions = [],
    currentPath,
    loginPath = '/login',
    unauthorizedPath = '/unauthorized',
    redirectParam = 'redirect',
  } = config;

  if (session.status === 'loading') {
    return { type: 'pending' };
  }

  if (session.status === 'unauthenticated') {
    return {
      type: 'redirect',
      to: loginPath,
      search: { [redirectParam]: currentPath },
    };
  }

  if (
    requiredPermissions.length > 0 &&
    !hasPermissions(session.user, requiredPermissions)
  ) {
    return { type: 'redirect', to: unauthorizedPath };
  }

  return { type: 'allow' };
}
