import type { ReactElement } from 'react';
import Link from 'next/link';

export default function HomePage(): ReactElement {
  return (
    <div style={{ padding: 32 }}>
      <h1>Auth Gated Example</h1>
      <nav style={{ display: 'flex', gap: 16 }}>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/login">Login</Link>
      </nav>
    </div>
  );
}
