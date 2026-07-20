import Router from 'next/router';
import { markShallowNavigation } from './internal/shallow-nav';

/** Options for {@link shallowPush}. */
export interface ShallowPushOptions {
  /** Use `history.replaceState` semantics instead of `pushState`. */
  replace?: boolean;
}

/**
 * Navigates **without running the page's loader** — a view-only URL change over
 * data the loader has already loaded (a URL-backed sort, filter, tab, or
 * selection). The URL updates and `useLoaderQuery` re-reads the new param
 * (`validate` still runs, so it stays typed), but there is no fetch, no loading
 * fallback, and **no `beforeLoad` guard**. It is the analog of the SPA guide's
 * shallow routing: reflect client-owned view state in the URL without a data
 * round-trip.
 *
 * Use it only when the new param is valid **by construction** — chosen from
 * already-loaded, already-authorized state. A param that could fail validation
 * or trigger a redirect must use an ordinary navigation so the loader can guard
 * it. The target page must read its params via {@link useLoaderQuery} (not
 * `useRouter().query`); the runtime withholds the new param until it has run
 * `validate`, which it can only do for its own owned query.
 *
 * Requires a loader-backed page already `ready` on the same component — a
 * mismatch (a cross-page URL, or a page whose loader hasn't run yet) falls back
 * to a full navigation, so misuse degrades safely rather than skipping a guard.
 *
 * @param url - Router-relative destination, e.g. `/list?sort=price`.
 * @param options - {@link ShallowPushOptions}.
 * @returns The router's navigation promise (resolves `true` on success).
 *
 * @example
 * ```tsx
 * import { shallowPush, useLoaderQuery } from 'next-export-loader';
 *
 * const { sort } = useLoaderQuery<{ sort: 'name' | 'price' }>();
 * <button onClick={() => shallowPush(`/list?sort=price`)}>Sort by price</button>
 * ```
 */
export function shallowPush(
  url: string,
  options?: ShallowPushOptions,
): Promise<boolean> {
  markShallowNavigation(url);
  return options?.replace
    ? Router.replace(url, undefined, { shallow: true })
    : Router.push(url, undefined, { shallow: true });
}
