import type { ReactElement } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  defineLoader,
  PrefetchLink,
  RedirectError,
  useLoaderQuery,
} from 'next-export-loader';
import { itemsQuery } from '@/queries/items';

interface ItemsQuery {
  id?: string;
}

export default function ItemsPage(): ReactElement {
  const { data: items } = useSuspenseQuery(itemsQuery());
  const { id: selectedId } = useLoaderQuery<ItemsQuery>();
  const selected = items.find((i) => i.id === selectedId)!;

  return (
    <div style={{ display: 'flex', gap: 32, padding: 32 }}>
      <nav>
        <h2>Items</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {items.map((item) => (
            <li key={item.id} style={{ marginBottom: 8 }}>
              <PrefetchLink
                href={`/items?id=${item.id}`}
                prefetch={[itemsQuery()]}
                style={{
                  fontWeight: item.id === selectedId ? 'bold' : 'normal',
                  cursor: 'pointer',
                }}
              >
                {item.title}
              </PrefetchLink>
            </li>
          ))}
        </ul>
      </nav>
      <main>
        <h2>{selected.title}</h2>
        <p>{selected.description}</p>
      </main>
    </div>
  );
}

ItemsPage.loaderMode = 'instant';
ItemsPage.loader = defineLoader<ItemsQuery>({
  validate: (raw) => ({
    id: typeof raw.id === 'string' ? raw.id : undefined,
  }),
  load: async ({ query, queryClient }) => {
    const items = await queryClient.ensureQueryData(itemsQuery());

    if (!query.id && items.length > 0) {
      throw new RedirectError(`/items?id=${items[0]!.id}`);
    }
    if (query.id && !items.some((i) => i.id === query.id)) {
      throw new RedirectError(`/items?id=${items[0]!.id}`);
    }
  },
});
