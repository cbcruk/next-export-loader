import type { QueryClient } from '@tanstack/react-query';
import type { ParsedUrlQuery } from 'querystring';

/**
 * Lifecycle phase of a page's loader for the current navigation.
 *
 * - `loading` — the loader is running; the page component is not yet mounted.
 * - `ready` — the loader resolved; the page component is mounted with its data.
 * - `error` — the loader threw a non-redirect error; the error fallback is shown.
 *
 * @see {@link useLoaderPhase} to read this from within a page.
 */
export type LoaderPhase = 'loading' | 'ready' | 'error';

/**
 * Arguments passed to a {@link LoaderFn} for a single navigation.
 *
 * @typeParam TQuery - Shape of the parsed URL query for this route.
 */
export interface LoaderContext<TQuery extends ParsedUrlQuery = ParsedUrlQuery> {
  /** Parsed query string of the URL being navigated to. */
  query: TQuery;
  /** The active TanStack Query client; use `ensureQueryData` to prefetch. */
  queryClient: QueryClient;
  /**
   * Aborted when this navigation is superseded by a newer one. Forward it to
   * `fetch`/`ensureQueryData` so stale work is cancelled.
   */
  signal: AbortSignal;
}

/**
 * A page loader: runs before the page component mounts and prepares its data.
 *
 * Resolve to commit the navigation, throw a {@link RedirectError} to redirect,
 * or throw any other error to surface the error fallback. The returned data is
 * read back in the component via `useSuspenseQuery` as a cache hit.
 *
 * @typeParam TQuery - Shape of the parsed URL query for this route.
 * @see {@link defineLoader} for the type-safe way to author one.
 */
export type LoaderFn<TQuery extends ParsedUrlQuery = ParsedUrlQuery> = (
  ctx: LoaderContext<TQuery>,
) => Promise<void>;
