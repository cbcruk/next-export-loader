import { ROLE_PERMISSIONS, type Role, type User } from '@/core/permissions';
import type { Session } from '@/core/auth-guard';

/**
 * In-memory auth store standing in for a real session backend. A demo login
 * picks a role; permissions are derived from the role bundle. A short token
 * expiry models pattern #5 (refresh on access) without a real token.
 */
const TOKEN_TTL_MS = 1000 * 60;

interface StoredSession {
  user: User;
  expiresAt: number;
}

let current: StoredSession | null = null;

function makeUser(role: Role): User {
  return {
    id: `user-${role}`,
    name: role.charAt(0).toUpperCase() + role.slice(1),
    role,
    permissions: ROLE_PERMISSIONS[role],
  };
}

export function login(role: Role): void {
  current = { user: makeUser(role), expiresAt: Date.now() + TOKEN_TTL_MS };
}

export function logout(): void {
  current = null;
}

export function isTokenExpired(): boolean {
  return current !== null && Date.now() >= current.expiresAt;
}

/** Pretend to refresh the token against a backend; extends the expiry. */
export async function refreshToken(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  if (current) current.expiresAt = Date.now() + TOKEN_TTL_MS;
}

/**
 * Resolves the current session. Awaits any in-flight auth check (here, a short
 * delay) so callers get a settled `authenticated`/`unauthenticated` — never
 * `loading`. A loader awaits this before the component mounts.
 */
export async function getSession(): Promise<Session> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  if (!current) return { status: 'unauthenticated' };
  return { status: 'authenticated', user: current.user };
}
