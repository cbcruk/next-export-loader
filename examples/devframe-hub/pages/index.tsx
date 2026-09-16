import type { ReactElement } from 'react';
import { PrefetchLink } from 'next-export-loader';
import { itemsQuery } from '@/queries/items';

export default function HomePage(): ReactElement {
  return (
    <div style={{ padding: 32 }}>
      <h1>next-export-loader example</h1>
      <p>
        <PrefetchLink href="/items" prefetch={[itemsQuery()]}>
          Go to Items
        </PrefetchLink>
      </p>
    </div>
  );
}
