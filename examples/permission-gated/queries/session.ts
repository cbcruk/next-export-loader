import { queryOptions } from '@tanstack/react-query';
import { getSession } from '@/data/auth';

/**
 * Shared session query. The guard awaits it via getSession(); protected pages
 * read it back through useSuspenseQuery as a cache hit.
 */
export const sessionQuery = () =>
  queryOptions({
    queryKey: ['session'],
    queryFn: getSession,
    staleTime: 1000 * 30,
  });
