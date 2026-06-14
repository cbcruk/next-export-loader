import type { ReactElement } from 'react';
import { PageShell } from '@/components/page-shell/page-shell';
import { requirePermissions } from '@/lib/route-guards';

export default function AdminUsersPage(): ReactElement {
  return (
    <PageShell title="Admin · Users">
      <p>
        Managing users requires both <code>users:read</code> and{' '}
        <code>users:manage</code> — admin only.
      </p>
    </PageShell>
  );
}

AdminUsersPage.loader = requirePermissions('users:read', 'users:manage');
