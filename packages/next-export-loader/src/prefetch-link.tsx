import { useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import {
  useQueryClient,
  type FetchQueryOptions,
} from '@tanstack/react-query';

type NextLinkProps = React.ComponentProps<typeof Link>;

export interface PrefetchableQuery {
  readonly queryKey: readonly unknown[];
}

export interface PrefetchLinkProps
  extends Omit<NextLinkProps, 'prefetch'> {
  prefetch?: ReadonlyArray<PrefetchableQuery>;
}

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
