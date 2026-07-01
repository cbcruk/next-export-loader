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
 * How `<LoaderRuntime>` renders a page while its loader re-runs on a
 * same-component param change (e.g. `/items?id=1` → `?id=2`).
 *
 * - `block` (default) — show the `fallback` until the loader settles for the new
 *   param. Safe for any page; a same-component cache-hit switch flashes the
 *   fallback for one commit.
 * - `instant` — keep showing the last validated render (the page reading the
 *   previous {@link useLoaderQuery} value) until the loader settles, so a
 *   cache-hit switch commits with no loading frame. **Only for pages that read
 *   their params via {@link useLoaderQuery}, never `useRouter().query`** — the
 *   runtime withholds the new param until the loader validates it, which it can
 *   only do for its own owned query. A stray `useRouter().query` read in an
 *   `instant` page re-opens the invalid-param crash.
 *
 * Set it on the page component: `ItemsPage.loaderMode = 'instant'`.
 */
export type LoaderMode = 'block' | 'instant';

/**
 * Validates and shapes the raw URL query for a route.
 *
 * The input is always the raw {@link ParsedUrlQuery} (string values). The output
 * is the typed, validated `TQuery` the loader and component work with — it may
 * hold numbers, enums, or any shape, mirroring TanStack Router's `validateSearch`.
 * Coerce invalid params to valid defaults here instead of throwing, when you want
 * a lighter alternative to redirect-on-invalid.
 *
 * @typeParam TQuery - Validated query shape produced from the raw query.
 */
export type ValidateQuery<TQuery = ParsedUrlQuery> = (
  raw: ParsedUrlQuery,
) => TQuery;

/**
 * Arguments passed to a {@link LoaderFn} for a single navigation.
 *
 * @typeParam TQuery - Shape of the query for this route. Defaults to the raw
 *   {@link ParsedUrlQuery}; a loader with a {@link ValidateQuery} narrows it.
 */
export interface LoaderContext<TQuery = ParsedUrlQuery> {
  /**
   * The query for the URL being navigated to. Raw parsed strings by default, or
   * the validated shape when the loader defines a `validate`.
   */
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
 * A guard/redirect phase that runs *before* the data loader for a navigation.
 *
 * Mirrors TanStack Router's `beforeLoad`: the place to decide redirects and
 * access guards, so those decisions are structurally separated from data
 * fetching and always run first. Throw a {@link RedirectError} to redirect
 * before any data is fetched (an unauthorized user never triggers the loader),
 * or throw any other error to surface the error fallback. Share data with the
 * loader through the query cache (`queryClient`), not a return value.
 *
 * @typeParam TQuery - Shape of the (validated) query for this route.
 */
export type BeforeLoadFn<TQuery = ParsedUrlQuery> = (
  ctx: LoaderContext<TQuery>,
) => void | Promise<void>;

/**
 * A page loader: runs before the page component mounts and prepares its data.
 *
 * Resolve to commit the navigation, throw a {@link RedirectError} to redirect,
 * or throw any other error to surface the error fallback. The returned data is
 * read back in the component via `useSuspenseQuery` as a cache hit.
 *
 * May carry two optional hooks that `<LoaderRuntime>` runs, in order, before the
 * loader body — {@link defineLoader}'s object form attaches them:
 * - `validate` — shapes the raw query, so `ctx.query` is the validated form.
 * - `beforeLoad` — the guard/redirect phase, run before any data fetching.
 *
 * @typeParam TQuery - Shape of the query for this route.
 * @see {@link defineLoader} for the type-safe way to author one.
 */
export interface LoaderFn<TQuery = ParsedUrlQuery> {
  (ctx: LoaderContext<TQuery>): Promise<void>;
  /** Optional validator applied to the raw query before the loader runs. */
  validate?: ValidateQuery<TQuery>;
  /** Optional guard/redirect phase, run before the loader body. */
  beforeLoad?: BeforeLoadFn<TQuery>;
}
