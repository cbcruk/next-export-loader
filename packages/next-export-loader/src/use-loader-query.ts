import { createContext, useContext } from 'react';
import type { ParsedUrlQuery } from 'querystring';

/**
 * Sentinel distinguishing "read outside a `<LoaderRuntime>`" from a legitimately
 * empty query. A raw context default of `{}` would silently mask the missing
 * provider; this makes it throw instead.
 */
const NO_PROVIDER = Symbol('next-export-loader/no-loader-query-provider');

export const LoaderQueryContext = createContext<unknown>(NO_PROVIDER);

/**
 * Reads the runtime-owned query for the current page.
 *
 * This is the validated query the page's loader ran with: if the loader defines a
 * `validate`, the returned value is its typed, coerced output; otherwise it is the
 * raw {@link ParsedUrlQuery}. Because `<LoaderRuntime>` only mounts the page once
 * its loader is `ready`, the value is always the one the loader validated for the
 * current URL — the page never observes an unvalidated param.
 *
 * Prefer this over `useRouter().query` inside a loader-backed page: it is typed to
 * the loader's `validate` and owned by the runtime, mirroring TanStack Router's
 * `Route.useSearch()`.
 *
 * @typeParam TQuery - The validated query shape; match the loader's `validate`.
 * @returns The validated query for the active navigation.
 * @throws If called outside of a `<LoaderRuntime>`.
 *
 * @example
 * ```tsx
 * ItemsPage.loader = defineLoader<{ id: string }>({
 *   validate: (raw) => ({ id: (raw.id as string) ?? '' }),
 *   load: async ({ query, queryClient }) => {
 *     await queryClient.ensureQueryData(itemsQuery());
 *   },
 * });
 *
 * export default function ItemsPage() {
 *   const { id } = useLoaderQuery<{ id: string }>(); // typed, loader-validated
 *   const { data: items } = useSuspenseQuery(itemsQuery());
 *   const selected = items.find((i) => i.id === id)!;
 * }
 * ```
 */
export function useLoaderQuery<TQuery = ParsedUrlQuery>(): TQuery {
  const value = useContext(LoaderQueryContext);
  if (value === NO_PROVIDER) {
    throw new Error('useLoaderQuery must be used within <LoaderRuntime>');
  }
  return value as TQuery;
}
