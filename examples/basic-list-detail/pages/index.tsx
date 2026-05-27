import type { ReactElement } from 'react';
import Link from 'next/link';

export default function HomePage(): ReactElement {
  return (
    <div style={{ padding: 32 }}>
      <h1>next-export-loader example</h1>
      <p>
        <Link href="/items">Go to Items</Link>
      </p>
    </div>
  );
}
