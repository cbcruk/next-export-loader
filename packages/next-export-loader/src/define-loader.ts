import type { ParsedUrlQuery } from 'querystring';
import type { LoaderFn } from './types';

export function defineLoader<TQuery extends ParsedUrlQuery = ParsedUrlQuery>(
  loader: LoaderFn<TQuery>,
): LoaderFn {
  return loader as LoaderFn;
}
