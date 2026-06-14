import type { ReactElement } from 'react';
import { PageShell } from '@/components/page-shell/page-shell';
import { requirePermissions } from '@/lib/route-guards';

export default function PostsPage(): ReactElement {
  return (
    <PageShell title="Posts">
      <p>You can read posts because you have <code>posts:read</code>.</p>
      <ul>
        <li>Hello World</li>
        <li>Getting Started</li>
        <li>Understanding Guards</li>
      </ul>
    </PageShell>
  );
}

// Any authenticated user with posts:read (viewer and up).
PostsPage.loader = requirePermissions('posts:read');
