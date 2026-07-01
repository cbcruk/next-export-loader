import type { LoaderFn, LoaderMode } from '../types';

export interface PageWithLoader {
  loader?: LoaderFn;
  loaderMode?: LoaderMode;
}
