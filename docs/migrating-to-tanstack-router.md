# Migrating to TanStack Router

`next-export-loader` is designed as a stepping stone. When your project outgrows Pages Router or needs stronger type safety, TanStack Router is the natural graduation path. This guide maps every `next-export-loader` concept to its TanStack Router equivalent.

## When to migrate

- You need file-system routing to be fully type-safe (params, search params, loaders).
- You want collocated route trees instead of `pages/` convention.
- You need nested layouts with independent loaders.
- Your app no longer requires Next.js (you can run a plain Vite SPA).

If you still need `next/image`, `next/head`, or other Next.js-specific features, stay on Pages Router with this library.

## Concept mapping

| next-export-loader | TanStack Router | Notes |
|---|---|---|
| `defineLoader(fn)` | `loader` option in `createRoute` | TanStack infers return type and exposes it via `useLoaderData()` |
| `RedirectError` | `redirect({ to })` | Thrown from loader, same semantics |
| `queryClient.ensureQueryData()` | `queryClient.ensureQueryData()` | Identical — TanStack Router integrates with TanStack Query the same way |
| `useSuspenseQuery(opts)` | `useSuspenseQuery(opts)` | Unchanged |
| `<PrefetchLink>` | `<Link preload="intent">` | Built-in, no wrapper needed |
| `useLoaderPhase()` | `router.state.status` | `'idle' | 'pending'` |
| `defineLoader({ validate })` | `validateSearch` | 둘 다 raw query → typed/coerced shape |
| `defineLoader({ beforeLoad })` | `beforeLoad` | 데이터 페칭 전 redirect·가드 phase (return void, cache로 공유) |
| `useLoaderQuery<T>()` | `Route.useSearch()` | runtime-owned typed query; `T`는 이 라이브러리에선 수동 명시 |
| `Page.loaderMode = 'instant'` | `defaultPendingMs` (pending 지연) | 둘 다 cache hit이 pending/fallback을 깜빡이지 않게 함 — TanStack은 pending 컴포넌트 표시를 지연, 이 라이브러리는 loading commit을 defer |
| `<LoaderRuntime>` | `<RouterProvider>` | The router itself manages the lifecycle |
| `<LoaderDevtools>` | `<TanStackRouterDevtools>` | Built-in devtools |

## Step-by-step migration

### 1. Install TanStack Router

```bash
pnpm add @tanstack/react-router
pnpm add -D @tanstack/router-plugin  # for file-based routing (optional)
```

### 2. Convert page loaders

**Before** (`pages/items.tsx`):

```tsx
import { defineLoader, RedirectError } from 'next-export-loader';
import { itemsQuery } from '@/queries/items';

export default function ItemsPage() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  // ...
}

ItemsPage.loader = defineLoader<{ id?: string }>(async ({ query, queryClient }) => {
  const items = await queryClient.ensureQueryData(itemsQuery());
  if (!query.id) throw new RedirectError(`/items?id=${items[0].id}`);
});
```

**After** (`routes/items.tsx`):

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router';
import { itemsQuery } from '@/queries/items';

export const Route = createFileRoute('/items')({
  validateSearch: (search) => ({
    id: (search.id as string) || undefined,
  }),
  loader: async ({ context: { queryClient }, search }) => {
    const items = await queryClient.ensureQueryData(itemsQuery());
    if (!search.id) throw redirect({ to: '/items', search: { id: items[0].id } });
  },
  component: ItemsPage,
});

function ItemsPage() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  const { id } = Route.useSearch();
  // ...
}
```

Key differences:
- `validateSearch` replaces the manual `query.id as string` cast — fully type-safe.
- `redirect()` replaces `throw new RedirectError()` — same throw semantics, typed destination.
- `Route.useSearch()` replaces `useRouter().query` — type-inferred from `validateSearch`.

### 3. Replace PrefetchLink

**Before:**

```tsx
import { PrefetchLink } from 'next-export-loader';

<PrefetchLink href="/items" prefetch={[itemsQuery()]}>Items</PrefetchLink>
```

**After:**

```tsx
import { Link } from '@tanstack/react-router';

<Link to="/items" preload="intent">Items</Link>
```

TanStack Router's `<Link preload="intent">` runs the route's loader on hover/focus automatically. No need to manually specify which queries to prefetch.

### 4. Remove LoaderRuntime from \_app

**Before** (`_app.tsx`):

```tsx
<QueryClientProvider client={queryClient}>
  <LoaderRuntime Component={Component} fallback={<Skeleton />} errorFallback={<Error />}>
    <Component {...pageProps} />
  </LoaderRuntime>
</QueryClientProvider>
```

**After** (`main.tsx`):

```tsx
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPendingComponent: () => <Skeleton />,
  defaultErrorComponent: ({ error }) => <Error error={error} />,
});

<QueryClientProvider client={queryClient}>
  <RouterProvider router={router} />
</QueryClientProvider>
```

### 5. Incremental migration

You don't have to migrate everything at once. A practical approach:

1. Set up TanStack Router alongside Next.js Pages Router using a catch-all route.
2. Migrate one page at a time, starting with the simplest.
3. Move query definitions (`queryOptions`) as-is — they work identically in both systems.
4. Remove `next-export-loader` once all pages are migrated.

## What you gain

- **Full type safety**: search params, path params, loader data — all inferred.
- **Nested layouts**: independent loaders per layout segment, parallel data loading.
- **Built-in devtools**: route matching, cache state, pending navigations.
- **No Next.js dependency**: deploy as a plain Vite SPA if you want.

## What you lose

- **Next.js ecosystem**: `next/image`, `next/head`, ISR, middleware.
- **File-system convention**: TanStack Router has its own file-based routing (optional), but it's different from `pages/`.
- **Zero-config deployment**: platforms like Vercel optimize for Next.js specifically.

Evaluate these trade-offs for your project before migrating.
