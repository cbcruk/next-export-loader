import { useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import {
  useQueryClient,
  type FetchQueryOptions,
} from '@tanstack/react-query';

type NextLinkProps = React.ComponentProps<typeof Link>;

/**
 * Minimal shape a query must satisfy to be prefetched by {@link PrefetchLink}.
 * Any object returned by `queryOptions()` is assignable.
 */
export interface PrefetchableQuery {
  readonly queryKey: readonly unknown[];
}

/**
 * Props for {@link PrefetchLink}: all `next/link` props except `prefetch`,
 * which is replaced with a list of queries to warm.
 */
export interface PrefetchLinkProps
  extends Omit<NextLinkProps, 'prefetch'> {
  /**
   * Queries to prefetch on hover/focus, so the destination's loader resolves
   * from cache. Pass the same `queryOptions()` objects the loader uses.
   */
  prefetch?: ReadonlyArray<PrefetchableQuery>;
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
 * <PrefetchLink href="/items" prefetch={[itemsQuery()]}>
 *   Items
 * </PrefetchLink>
 * ```
 */
export function PrefetchLink({
  prefetch,
  onMouseEnter,
  onFocus,
  ...linkProps
}: PrefetchLinkProps): ReactNode {
  const queryClient = useQueryClient();

  const handlePrefetch = useCallback(() => {
    if (!prefetch) return;
    for (const opts of prefetch) {
      // queryOptions() output is a superset of FetchQueryOptions at runtime;
      // generic variance prevents direct assignability at the type level
      void queryClient.prefetchQuery(opts as FetchQueryOptions);
    }
  }, [prefetch, queryClient]);

  return (
    <Link
      {...linkProps}
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
