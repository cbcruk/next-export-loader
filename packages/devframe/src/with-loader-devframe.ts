import type { NextConfig } from 'next';
import { HUB_BASE } from './constants';

type Rewrites = Awaited<ReturnType<NonNullable<NextConfig['rewrites']>>>;
type Rewrite = Extract<Rewrites, unknown[]>[number];

const HUB_INDEX_REWRITES: Rewrite[] = [
  { source: HUB_BASE, destination: `${HUB_BASE}index.html` },
  { source: `${HUB_BASE}:id/`, destination: `${HUB_BASE}:id/index.html` },
];

function mergeRewrites(existing: Rewrites | undefined): Rewrites {
  if (existing === undefined) return HUB_INDEX_REWRITES;
  if (Array.isArray(existing)) return [...existing, ...HUB_INDEX_REWRITES];
  return {
    beforeFiles: existing.beforeFiles ?? [],
    afterFiles: [...(existing.afterFiles ?? []), ...HUB_INDEX_REWRITES],
    fallback: existing.fallback ?? [],
  };
}

/**
 * Wraps a Next config so `next dev` serves a hub baked into `public/__devframes/`.
 *
 * `next dev` serves `public/` files by exact path only, while the hub loads its
 * panels from directory URLs such as `/__devframes/next-export-loader/`. This
 * adds rewrites from those directory URLs to their `index.html`. Static hosts
 * resolve directory indexes themselves, so outside development the config is
 * returned unchanged and `output: 'export'` never sees the rewrites.
 *
 * Without `trailingSlash: true`, Next would redirect the hub's directory URLs
 * and break its relative asset paths, so development also sets
 * `skipTrailingSlashRedirect: true` in that case.
 *
 * @example
 * ```js
 * // next.config.js
 * const { withLoaderDevframe } = require('next-export-loader-devframe/next');
 *
 * module.exports = withLoaderDevframe({ output: 'export', trailingSlash: true });
 * ```
 */
export function withLoaderDevframe(nextConfig: NextConfig = {}): NextConfig {
  if (process.env.NODE_ENV !== 'development') return nextConfig;

  return {
    ...nextConfig,
    ...(nextConfig.trailingSlash ? {} : { skipTrailingSlashRedirect: true }),
    async rewrites() {
      return mergeRewrites(await nextConfig.rewrites?.());
    },
  };
}
