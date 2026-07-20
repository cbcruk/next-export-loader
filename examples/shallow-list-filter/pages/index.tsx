import type { ReactElement } from 'react';
import { PrefetchLink } from 'next-export-loader';
import { productsQuery } from '@/queries/products';

export default function HomePage(): ReactElement {
  return (
    <div style={{ padding: 32, maxWidth: 640 }}>
      <h1>Shallow list / filter</h1>
      <p>
        A URL-backed sort &amp; filter list. The loader loads the products once;
        changing sort or category updates the URL via <code>shallowPush</code>{' '}
        without re-running the loader — the analog of the Next.js SPA guide&apos;s
        shallow-routing pattern.
      </p>
      <p>
        <PrefetchLink href="/list" prefetch={[productsQuery()]}>
          Open the list →
        </PrefetchLink>
      </p>
    </div>
  );
}
