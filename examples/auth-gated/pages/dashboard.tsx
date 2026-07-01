import type { ReactElement } from 'react';
import { useRouter } from 'next/router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { defineLoader, RedirectError } from 'next-export-loader';
import Link from 'next/link';
import { isAuthenticated, logout } from '@/data/auth';
import { profileQuery } from '@/queries/profile';

export default function DashboardPage(): ReactElement {
  const router = useRouter();
  const { data: profile } = useSuspenseQuery(profileQuery());

  function handleLogout(): void {
    logout();
    router.push('/');
  }

  return (
    <div style={{ padding: 32 }}>
      <h1>Dashboard</h1>
      <dl>
        <dt>Name</dt>
        <dd>{profile.name}</dd>
        <dt>Email</dt>
        <dd>{profile.email}</dd>
        <dt>Role</dt>
        <dd>{profile.role}</dd>
      </dl>
      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
        <Link href="/">Back to Home</Link>
      </div>
    </div>
  );
}

DashboardPage.loader = defineLoader({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw new RedirectError('/login');
    }
  },
  load: async ({ queryClient }) => {
    await queryClient.ensureQueryData(profileQuery());
  },
});
