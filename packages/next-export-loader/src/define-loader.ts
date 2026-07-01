import type { ParsedUrlQuery } from 'querystring';
import type { LoaderFn, ValidateQuery } from './types';

/**
 * Object form of a loader: a data-fetching {@link LoaderFn} plus a
 * {@link ValidateQuery} that shapes the raw URL query before it runs.
 *
 * @typeParam TQuery - Validated query shape shared by `validate` and `load`.
 */
export interface LoaderDefinition<TQuery = ParsedUrlQuery> {
  /** Validates/coerces the raw query into `TQuery` before `load` runs. */
  validate?: ValidateQuery<TQuery>;
  /** The loader; receives the validated `TQuery` as `ctx.query`. */
  load: LoaderFn<TQuery>;
}

/**
 * Defines a page loader with full type inference for its query parameters.
 *
 * Attach the result to a page component's `loader` property. `<LoaderRuntime>`
 * runs it before mounting the page, so the component can read prefetched data
 * via `useSuspenseQuery` without a loading state of its own.
 *
 * Two forms:
 * - A bare async function — returned unchanged; `ctx.query` is the raw
 *   {@link ParsedUrlQuery}.
 * - An object `{ validate, load }` — the runtime runs `validate` against the raw
 *   query first, so `ctx.query` in `load` is the typed, validated shape (numbers,
 *   enums, coerced defaults), mirroring TanStack Router's `validateSearch`.
 *
 * @typeParam TQuery - Shape of the query, inferred from the argument.
 * @param loaderOrDefinition - A loader function, or a `{ validate, load }` object.
 * @returns A loader typed for attachment to a page component.
 *
 * @example
 * ```ts
 * // Bare form — raw query.
 * Page.loader = defineLoader(async ({ queryClient }) => {
 *   await queryClient.ensureQueryData(itemsQuery());
 * });
 *
 * // Object form — validated query.
 * Page.loader = defineLoader({
 *   validate: (raw) => ({ page: Number(raw.page ?? 1) }),
 *   load: async ({ query }) => {
 *     query.page; // number, validated
 *   },
 * });
 * ```
 */
export function defineLoader<TQuery = ParsedUrlQuery>(
  loader: LoaderFn<TQuery>,
): LoaderFn<TQuery>;
export function defineLoader<TQuery = ParsedUrlQuery>(
  definition: LoaderDefinition<TQuery>,
): LoaderFn<TQuery>;
export function defineLoader<TQuery = ParsedUrlQuery>(
  loaderOrDefinition: LoaderFn<TQuery> | LoaderDefinition<TQuery>,
): LoaderFn<TQuery> {
  if (typeof loaderOrDefinition === 'function') {
    return loaderOrDefinition;
  }
  const { validate, load } = loaderOrDefinition;
  const loader: LoaderFn<TQuery> = (ctx) => load(ctx);
  loader.validate = validate;
  return loader;
}
