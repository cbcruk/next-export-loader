/**
 * Docks next-export-loader navigations into a devframe hub: the panel's
 * devframe definition and a static hub build for `output: 'export'` apps.
 *
 * Pair it with `mountLoaderPageScript` from `next-export-loader/devframe` in
 * the app, and `withLoaderDevframe` from `next-export-loader-devframe/next` in
 * `next.config.js`.
 *
 * @example
 * ```ts
 * import { buildLoaderHub } from 'next-export-loader-devframe';
 *
 * await buildLoaderHub();
 * ```
 *
 * @module
 */
export { buildLoaderHub, cleanLoaderHub } from './build-loader-hub';
export type {
  BuildLoaderHubOptions,
  CleanLoaderHubOptions,
} from './build-loader-hub.types';
export { createLoaderDevframe } from './create-loader-devframe';
