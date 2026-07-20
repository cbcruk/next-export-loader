import type { CSSProperties, ReactElement } from 'react';
import Link from 'next/link';
import { useSuspenseQuery } from '@tanstack/react-query';
import { defineLoader, shallowPush, useLoaderQuery } from 'next-export-loader';
import { productsQuery } from '@/queries/products';
import { loaderRuns } from '@/data/loader-runs';
import type { Product } from '@/data/products';

type Sort = 'name' | 'price';
type Category = 'all' | Product['category'];

interface ListQuery {
  sort: Sort;
  category: Category;
}

const SORTS: Sort[] = ['name', 'price'];
const CATEGORIES: Category[] = ['all', 'fruit', 'veg', 'grain'];

const listLoader = defineLoader<ListQuery>({
  // Coerce to valid defaults — the view params never need a redirect.
  validate: (raw) => ({
    sort: raw.sort === 'price' ? 'price' : 'name',
    category: CATEGORIES.includes(raw.category as Category)
      ? (raw.category as Category)
      : 'all',
  }),
  load: async ({ queryClient }) => {
    // Bumped on every real loader run. A shallowPush below never gets here.
    loaderRuns.count += 1;
    await queryClient.ensureQueryData(productsQuery());
  },
});

function listUrl(sort: Sort, category: Category): string {
  return `/list?sort=${sort}&category=${category}`;
}

function deriveView(
  products: Product[],
  sort: Sort,
  category: Category,
): Product[] {
  const filtered =
    category === 'all'
      ? products
      : products.filter((p) => p.category === category);
  return [...filtered].sort((a, b) =>
    sort === 'price' ? a.price - b.price : a.name.localeCompare(b.name),
  );
}

export default function ListPage(): ReactElement {
  const { data: products } = useSuspenseQuery(productsQuery());
  const { sort, category } = useLoaderQuery<ListQuery>();
  const view = deriveView(products, sort, category);

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <h1>Products</h1>

      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        <Control label="Sort">
          {SORTS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === sort}
              onClick={() => shallowPush(listUrl(s, category))}
              style={pillStyle(s === sort)}
            >
              {s}
            </button>
          ))}
        </Control>
        <Control label="Category">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === category}
              onClick={() => shallowPush(listUrl(sort, c))}
              style={pillStyle(c === category)}
            >
              {c}
            </button>
          ))}
        </Control>
      </div>

      <ol data-testid="products">
        {view.map((p) => (
          <li key={p.id} data-testid="product">
            {p.name} · {p.category} · ${p.price}
          </li>
        ))}
      </ol>

      <hr style={{ margin: '24px 0', border: 0, borderTop: '1px solid #eee' }} />

      <p style={{ color: '#555' }}>
        Loader runs: <strong data-testid="loader-runs">{loaderRuns.count}</strong>{' '}
        — sort/category changes above use <code>shallowPush</code>, so this stays
        put. An ordinary navigation runs the loader again:
      </p>
      <p>
        <Link href="/list" data-testid="full-nav-reset">
          Reset filters (full navigation) →
        </Link>
      </p>
    </div>
  );
}

// Read params via useLoaderQuery (never useRouter().query): the runtime withholds
// the new param until it has run `validate`, which shallowPush relies on.
ListPage.loaderMode = 'instant';
ListPage.loader = listLoader;

function Control({
  label,
  children,
}: {
  label: string;
  children: ReactElement[];
}): ReactElement {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6 }}>{children}</div>
    </div>
  );
}

function pillStyle(active: boolean): CSSProperties {
  return {
    padding: '4px 10px',
    borderRadius: 999,
    border: '1px solid',
    borderColor: active ? '#0070f3' : '#ccc',
    background: active ? '#0070f3' : 'transparent',
    color: active ? '#fff' : 'inherit',
    cursor: 'pointer',
    textTransform: 'capitalize',
  };
}
