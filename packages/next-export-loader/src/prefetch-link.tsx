import { useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import {
  useQueryClient,
  type FetchQueryOptions,
  type QueryClient,
} from '@tanstack/react-query';
import { parseUrl } from './internal/parse-url';
import type { ParsedUrlQuery } from 'querystring';
import type { LoaderFn } from './types';

type NextLinkProps = React.ComponentProps<typeof Link>;

/**
 * Minimal shape a query must satisfy to be prefetched by {@link PrefetchLink}.
 * Any object returned by `queryOptions()` is assignable.
 */
export interface PrefetchableQuery {
  readonly queryKey: readonly unknown[];
}

/**
 * Warms the cache for each query via `queryClient.prefetchQuery`. Extracted as a
 * pure function so the dispatch logic is unit-testable without rendering; the
 * component just wires it to hover/focus. A nullish/empty list is a no-op.
 */
export function prefetchQueries(
  queryClient: QueryClient,
  queries: ReadonlyArray<PrefetchableQuery> | undefined,
): void {
  if (!queries) return;
  for (const opts of queries) {
    // queryOptions() output is a superset of FetchQueryOptions at runtime;
    // generic variance prevents direct assignability at the type level
    void queryClient.prefetchQuery(opts as FetchQueryOptions);
  }
}

/**
 * Warms the destination's data by running its loader on intent, best-effort.
 *
 * Runs only the loader body (applying its `validate` first) — not `beforeLoad`,
 * which is the guard/redirect phase — and swallows any throw, including a
 * {@link RedirectError}: a prefetch must never navigate or surface an error, it
 * only fills the cache. `ensureQueryData` inside the loader respects `staleTime`,
 * so a warm cache is a no-op. Fire-and-forget.
 *
 * This is the zero-drift alternative to a manual `prefetch` list: the loader is
 * the single source of what the page needs, so the two can never disagree. The
 * cost is that referencing the loader eagerly imports it (no lazy chunk split for
 * that code), so prefer it for same-page param links or when the coupling is
 * acceptable; use `prefetch` when you want to stay decoupled.
 */
export function runLoaderForPrefetch<TQuery = ParsedUrlQuery>(
  queryClient: QueryClient,
  loader: LoaderFn<TQuery>,
  href: string,
): void {
  const raw = parseUrl(href);
  // Without a validator, the raw query stands in for TQuery — the same
  // (intentional) gap the runtime has when a loader declares no `validate`.
  const query = (loader.validate ? loader.validate(raw) : raw) as TQuery;
  void (async () => {
    try {
      await loader({
        query,
        queryClient,
        signal: new AbortController().signal,
      });
    } catch {
      // Best-effort: redirects/errors are irrelevant to warming the cache.
    }
  })();
}

/**
 * Props for {@link PrefetchLink}: all `next/link` props except `prefetch`, which
 * is replaced with what to warm on intent. Provide `prefetch` (a query list),
 * `loader` (the destination's loader), or both.
 */
export interface PrefetchLinkProps<TQuery = ParsedUrlQuery>
  extends Omit<NextLinkProps, 'prefetch'> {
  /**
   * Queries to prefetch on hover/focus, so the destination's loader resolves
   * from cache. Pass the same `queryOptions()` objects the loader uses. Simple
   * and decoupled, but can drift from the loader's actual query set — see
   * `loader` for the zero-drift alternative.
   */
  prefetch?: ReadonlyArray<PrefetchableQuery>;
  /**
   * The destination page's loader, run on hover/focus so it warms exactly what
   * the page needs (single source of truth, no drift). Only runs when `href` is
   * a string. See {@link runLoaderForPrefetch} for the trade-off.
   */
  loader?: LoaderFn<TQuery>;
}

/**
 * A `next/link` that warms the destination's data on hover or focus.
 *
 * For each query in `prefetch`, calls `queryClient.prefetchQuery` on intent, so
 * the target page's loader hits cache and mounts instantly. All other props are
 * forwarded to `next/link`; existing `onMouseEnter`/`onFocus` handlers still run.
 *
 * @example
 * ```tsx
 * // Decoupled: an explicit query list.
 * <PrefetchLink href="/items" prefetch={[itemsQuery()]}>Items</PrefetchLink>
 *
 * // Zero-drift: run the destination's loader.
 * <PrefetchLink href="/items?id=2" loader={itemsLoader}>Item 2</PrefetchLink>
 * ```
 */
export function PrefetchLink<TQuery = ParsedUrlQuery>({
  prefetch,
  loader,
  href,
  onMouseEnter,
  onFocus,
  ...linkProps
}: PrefetchLinkProps<TQuery>): ReactNode {
  const queryClient = useQueryClient();

  const handlePrefetch = useCallback(() => {
    prefetchQueries(queryClient, prefetch);
    if (loader && typeof href === 'string') {
      runLoaderForPrefetch(queryClient, loader, href);
    }
  }, [prefetch, loader, href, queryClient]);

  return (
    <Link
      {...linkProps}
      href={href}
      onMouseEnter={(e) => {
        handlePrefetch();
        if (typeof onMouseEnter === 'function') onMouseEnter(e);
      }}
      onFocus={(e) => {
        handlePrefetch();
        if (typeof onFocus === 'function') onFocus(e);
      }}
    />
  );
}
