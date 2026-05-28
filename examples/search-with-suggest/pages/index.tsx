import type { ReactElement } from 'react';
import Link from 'next/link';

export default function HomePage(): ReactElement {
  return (
    <div style={{ padding: 32 }}>
      <h1>search-with-suggest example</h1>
      <p>
        <Link href="/search">Go to Search</Link>
      </p>
    </div>
  );
}
