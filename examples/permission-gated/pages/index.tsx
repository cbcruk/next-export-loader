import type { ReactElement } from 'react';
import Link from 'next/link';

export default function HomePage(): ReactElement {
  return (
    <div style={{ padding: 32 }}>
      <h1>permission-gated example</h1>
      <p style={{ color: '#666' }}>
        Permission-based route guards over a router-agnostic core.
      </p>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link href="/login">Login</Link>
        <Link href="/posts">Posts (requires posts:read)</Link>
        <Link href="/admin/users">Admin · Users (requires users:manage)</Link>
        <Link href="/admin/billing">
          Admin · Billing (requires billing:manage)
        </Link>
      </nav>
    </div>
  );
}
