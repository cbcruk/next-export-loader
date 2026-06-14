import type { ReactElement } from 'react';
import Link from 'next/link';

export default function UnauthorizedPage(): ReactElement {
  return (
    <div style={{ padding: 32 }}>
      <h1>403 — Not authorized</h1>
      <p style={{ color: '#666' }}>
        You are signed in but lack the permission this page requires. Try logging
        in as a different role.
      </p>
      <nav style={{ display: 'flex', gap: 16 }}>
        <Link href="/login">Switch role</Link>
        <Link href="/">Back to Home</Link>
      </nav>
    </div>
  );
}
