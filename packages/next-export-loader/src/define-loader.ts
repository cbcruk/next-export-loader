import type { LoaderFn } from './internal/types';

export function defineLoader(loader: LoaderFn): LoaderFn {
  return loader;
}
