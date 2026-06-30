# next-export-loader

> A server-like loader lifecycle for the Next.js Pages Router under `output: 'export'`.

`next-export-loader` is a thin client runtime that brings one server-side guarantee to a fully static site: **a page component does not mount until its data is ready.** No mount-then-`useEffect`-then-spinner waterfall, no layout shift, no stale-response races.

## Why

With `output: 'export'` you lose `getServerSideProps`, API routes, and server-side prefetching — only build-time `getStaticProps` remains. The usual fallback is fetching in `useEffect` after mount, which means:

- **Loading waterfalls** — mount → effect → fetch → spinner → data. The user stares at an empty shell.
- **Layout shift** — the page jumps as data lands.
- **Navigation races** — a slow fetch from the previous page resolves late and overwrites the new one.
- **Redirect flicker** — an auth check that redirects *after* mount flashes the protected page first.

This library moves data loading *before* mount, the way a server would.

## How it works

A **loader** is an async function attached to a page. `<LoaderRuntime>` runs it on every navigation and renders the page only once it resolves. Four invariants hold:

1. **The loader is awaited before the component mounts** — the component always renders with its data in cache.
2. **The latest navigation wins** — an in-flight loader superseded by a newer navigation is discarded.
3. **Redirects are decided before mount** — a `RedirectError` thrown from a loader navigates without ever mounting the page.
4. **Data is a cache hit** — the loader prefetches with `ensureQueryData`; the component reads the same `queryOptions` via `useSuspenseQuery`, with no refetch.

Data fetching is built on [TanStack Query](https://tanstack.com/query).

## Install

```bash
pnpm add next-export-loader
```

Peer dependencies:

| Package | Version |
| --- | --- |
| `next` | `>= 13` (Pages Router) |
| `react` / `react-dom` | `>= 18` |
| `@tanstack/react-query` | `>= 5` |

## Quick start

**1. Wrap your app** in `_app.tsx`:

```tsx
import { useState } from 'react';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoaderRuntime } from 'next-export-loader';

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <LoaderRuntime
        Component={Component}
        fallback={<div>Loading…</div>}
        errorFallback={<div>Something went wrong.</div>}
      >
        <Component {...pageProps} />
      </LoaderRuntime>
    </QueryClientProvider>
  );
}
```

**2. Define a query** with `queryOptions` so the loader and component share it:

```ts
// queries/items.ts
import { queryOptions } from '@tanstack/react-query';
import { fetchItems } from '@/data/items';

export const itemsQuery = () =>
  queryOptions({ queryKey: ['items'], queryFn: fetchItems });
```

**3. Attach a loader** to the page and read the data with `useSuspenseQuery`:

```tsx
// pages/items.tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { defineLoader } from 'next-export-loader';
import { itemsQuery } from '@/queries/items';

export default function ItemsPage() {
  const { data: items } = useSuspenseQuery(itemsQuery());
  return <ItemList items={items} />;
}

ItemsPage.loader = defineLoader(async ({ queryClient }) => {
  await queryClient.ensureQueryData(itemsQuery());
});
```

The component never renders a loading state of its own — by the time it mounts, `itemsQuery()` is a cache hit.

## API

| Export | Description |
| --- | --- |
| `defineLoader(fn)` | Defines a page loader with full query-param type inference. Attach the result to `Page.loader`. |
| `<LoaderRuntime>` | Drives the loader lifecycle in `_app`. Props: `Component`, `fallback`, `errorFallback`, `children`. |
| `RedirectError` / `isRedirectError` | Throw `new RedirectError('/path', { replace? })` from a loader to redirect before mount. |
| `useLoaderPhase()` | Reads the current phase (`'loading' \| 'ready' \| 'error'`) — for progress bars in your app shell. |
| `<PrefetchLink>` | A `next/link` that warms the destination's queries on hover/focus. |
| `<LoaderDevtools>` | A floating dev panel logging recent navigations (phase, duration, redirects, errors). |

Exported types: `LoaderContext`, `LoaderFn`, `LoaderPhase`, `NavigationEntry`, `PrefetchableQuery`, `PrefetchLinkProps`, `RedirectOptions`.

### Redirects

```tsx
DashboardPage.loader = defineLoader(async ({ queryClient }) => {
  const user = await queryClient.ensureQueryData(userQuery());
  if (!user) throw new RedirectError('/login');
});
```

The loader restarts at the destination URL; the dashboard component never mounts.

### Prefetching on intent

```tsx
import { PrefetchLink } from 'next-export-loader';

<PrefetchLink href="/items" prefetch={[itemsQuery()]}>
  Items
</PrefetchLink>;
```

On hover or focus, the listed queries are warmed so the destination's loader resolves from cache.

## Data-fetching rules

These keep the cache-hit invariant intact:

- **Define every query with `queryOptions`** — the loader and component import the same object; never inline a `queryKey`.
- **Loaders use `ensureQueryData`** — it respects `staleTime` and skips the fetch on a cache hit (`fetchQuery` always refetches).
- **Components use `useSuspenseQuery`** — not `useQuery`. The data is guaranteed, so there is no optional/empty state to handle.
- **`select` belongs in the component** — loaders prefetch raw data; each component transforms it.

The bundled [ESLint plugin](docs/eslint-plugin.md) enforces the `useSuspenseQuery` rule (`no-use-query`).

## Examples

Runnable apps in [`examples/`](examples/):

| Example | Demonstrates |
| --- | --- |
| [`basic-list-detail`](examples/basic-list-detail) | Loader basics, cache hits, navigation race, progress bar, devtools |
| [`auth-gated`](examples/auth-gated) | Redirect-before-mount auth gating |
| [`permission-gated`](examples/permission-gated) | Permission-based guards over a router-agnostic core: guard factory, redirect-return, 3-state session, token refresh |
| [`dynamic-routes`](examples/dynamic-routes) | Query-param routes, `errorFallback` on a failed loader |
| [`search-with-suggest`](examples/search-with-suggest) | Per-query keys and search-driven navigation races |

## Documentation

- [ESLint plugin](docs/eslint-plugin.md) — install and configure `no-use-query`.
- [Migrating to TanStack Router](docs/migrating-to-tanstack-router.md) — when you outgrow static export.
- [Instant navigation & the same-component loading gap](docs/instant-navigation.md) — a design note on a known same-component navigation bug and the proposed fix.

## Status

Pre-1.0 (`0.x`) — the API may change between minor versions until `1.0`. Built for the Pages Router; `getStaticProps`/`getStaticPaths` compose orthogonally, while `getServerSideProps` is out of scope (unavailable under `output: 'export'`).

## Development

```bash
pnpm build          # build the library (tsup, ESM + CJS)
pnpm typecheck      # type-check the library
pnpm typecheck:e2e  # type-check the e2e suite
pnpm test           # unit tests (node:test)
pnpm test:e2e       # Playwright e2e against the static export
```

## License

MIT
