import type { ReactElement } from 'react';
import { PageShell } from '@/components/page-shell/page-shell';
import { requirePermissions } from '@/lib/route-guards';

export default function AdminBillingPage(): ReactElement {
  return (
    <PageShell title="Admin · Billing">
      <p>
        Billing requires <code>billing:manage</code> — admin only.
      </p>
    </PageShell>
  );
}

AdminBillingPage.loader = requirePermissions('billing:manage');
