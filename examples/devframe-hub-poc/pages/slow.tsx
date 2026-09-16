import type { ReactElement } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { defineLoader } from 'next-export-loader';
import { itemsQuery } from '@/queries/items';

export default function SlowPage(): ReactElement {
  const { data: items } = useSuspenseQuery(itemsQuery());

  return (
    <div style={{ padding: 32 }}>
      <h1>Slow page loaded</h1>
      <p>{items.length} items were ready before this mounted.</p>
    </div>
  );
}

SlowPage.loader = defineLoader(async ({ queryClient }) => {
  // Deliberately slow and NOT abort-aware: the delay runs to completion even
  // when a newer navigation aborts this one, so its result always arrives last.
  // The runtime must still discard it (it's no longer the latest navigation).
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await queryClient.ensureQueryData(itemsQuery());
});
