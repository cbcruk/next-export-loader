import type { ParsedUrlQuery } from 'querystring';
import type { LoaderFn } from './types';

/**
 * Defines a page loader with full type inference for its query parameters.
 *
 * Attach the result to a page component's `loader` property. `<LoaderRuntime>`
 * runs it before mounting the page, so the component can read prefetched data
 * via `useSuspenseQuery` without a loading state of its own.
 *
 * @typeParam TQuery - Shape of the parsed URL query, inferred from `loader`.
 * @param loader - The async function that prefetches data for the route.
 * @returns The same loader, typed for attachment to a page component.
 *
 * @example
 * ```ts
 * Page.loader = defineLoader(async ({ queryClient }) => {
 *   await queryClient.ensureQueryData(itemsQuery());
 * });
 * ```
 */
export function defineLoader<TQuery extends ParsedUrlQuery = ParsedUrlQuery>(
  loader: LoaderFn<TQuery>,
): LoaderFn {
  return loader as LoaderFn;
}
