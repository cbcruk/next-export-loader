import type { QueryClient } from '@tanstack/react-query';
import type { ParsedUrlQuery } from 'querystring';

export type LoaderPhase = 'loading' | 'ready' | 'error';

export interface LoaderContext<TQuery extends ParsedUrlQuery = ParsedUrlQuery> {
  query: TQuery;
  queryClient: QueryClient;
  signal: AbortSignal;
}

export type LoaderFn<TQuery extends ParsedUrlQuery = ParsedUrlQuery> = (
  ctx: LoaderContext<TQuery>,
) => Promise<void>;
