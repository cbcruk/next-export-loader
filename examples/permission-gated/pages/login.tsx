import type { ReactElement } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import type { Role } from '@/core/permissions';
import { login } from '@/data/auth';
import { sessionQuery } from '@/queries/session';

const ROLES: ReadonlyArray<{ role: Role; blurb: string }> = [
  { role: 'viewer', blurb: 'posts:read, users:read' },
  { role: 'editor', blurb: '+ posts:write' },
  { role: 'admin', blurb: '+ users:manage, billing:manage' },
];

export default function LoginPage(): ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const redirectTo =
    typeof router.query.redirect === 'string' ? router.query.redirect : '/';

  function handleLogin(role: Role): void {
    login(role);
    // Pattern #5: drop the cached session so the next route's guard refetches
    // and sees the authenticated user. removeQueries (not invalidate) because
    // the session query is inactive here — no mounted observer to trigger an
    // invalidate refetch — and ensureQueryData would otherwise read the stale
    // pre-login entry, bouncing the user straight back to /login.
    queryClient.removeQueries({ queryKey: sessionQuery().queryKey });
    // Pattern #2: return the user to where they were headed. This is a user
    // action (event handler), so post-mount navigation is expected here.
    void router.push(redirectTo);
  }

  return (
    <div style={{ padding: 32 }}>
      <h1>Login</h1>
      <p style={{ color: '#666' }}>
        Pick a role to sign in.
        {redirectTo !== '/' && (
          <>
            {' '}
            You&apos;ll return to <code>{redirectTo}</code>.
          </>
        )}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
        {ROLES.map(({ role, blurb }) => (
          <button
            key={role}
            type="button"
            onClick={() => handleLogin(role)}
            style={{ padding: '8px 12px', textAlign: 'left' }}
          >
            <strong>{role}</strong>{' '}
            <span style={{ color: '#888' }}>— {blurb}</span>
          </button>
        ))}
      </div>
      <p style={{ marginTop: 16 }}>
        <Link href="/">Back to Home</Link>
      </p>
    </div>
  );
}
