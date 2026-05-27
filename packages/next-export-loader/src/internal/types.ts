import type { QueryClient } from '@tanstack/react-query';
import type { ParsedUrlQuery } from 'querystring';

export type LoaderPhase = 'loading' | 'ready' | 'error';

export interface LoaderContext {
  query: ParsedUrlQuery;
  queryClient: QueryClient;
  signal: AbortSignal;
}

export type LoaderFn = (ctx: LoaderContext) => Promise<void>;

export interface PageWithLoader {
  loader?: LoaderFn;
}
