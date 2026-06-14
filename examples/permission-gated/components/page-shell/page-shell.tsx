import type { ReactElement, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { logout } from '@/data/auth';
import { sessionQuery } from '@/queries/session';

interface PageShellProps {
  title: string;
  children: ReactNode;
}

/**
 * Layout for protected pages. Reads the session via useSuspenseQuery — a cache
 * hit guaranteed by the guard, so there is no loading/empty branch here.
 */
export function PageShell({ title, children }: PageShellProps): ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSuspenseQuery(sessionQuery());

  function handleLogout(): void {
    logout();
    // Drop the cached session (see login.tsx) so any later guard refetches.
    queryClient.removeQueries({ queryKey: sessionQuery().queryKey });
    void router.push('/');
  }

  return (
    <div style={{ padding: 32 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #eee',
          paddingBottom: 12,
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 18, margin: 0 }}>{title}</h1>
        {session.status === 'authenticated' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#666' }}>
              {session.user.name} · {session.user.role}
            </span>
            <button type="button" onClick={() => void handleLogout()}>
              Logout
            </button>
          </span>
        )}
      </header>
      {children}
      <p style={{ marginTop: 24 }}>
        <Link href="/">Back to Home</Link>
      </p>
    </div>
  );
}
