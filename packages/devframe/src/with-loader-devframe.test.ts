import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withLoaderDevframe } from './with-loader-devframe';

const HUB_REWRITES = [
  { source: '/__devframes/', destination: '/__devframes/index.html' },
  { source: '/__devframes/:id/', destination: '/__devframes/:id/index.html' },
];

describe('withLoaderDevframe', () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;

  beforeEach(() => {
    env.NODE_ENV = 'development';
  });

  afterEach(() => {
    env.NODE_ENV = originalNodeEnv;
  });

  it('returns the config untouched outside development', () => {
    env.NODE_ENV = 'production';
    const config = { output: 'export' as const };
    assert.strictEqual(withLoaderDevframe(config), config);
  });

  it('adds hub index rewrites in development', async () => {
    const config = withLoaderDevframe({ trailingSlash: true });
    assert.deepStrictEqual(await config.rewrites?.(), HUB_REWRITES);
    assert.strictEqual(config.skipTrailingSlashRedirect, undefined);
  });

  it('appends to existing array rewrites', async () => {
    const own = { source: '/a', destination: '/b' };
    const config = withLoaderDevframe({
      trailingSlash: true,
      rewrites: async () => [own],
    });
    assert.deepStrictEqual(await config.rewrites?.(), [own, ...HUB_REWRITES]);
  });

  it('appends to afterFiles of phased rewrites', async () => {
    const own = { source: '/a', destination: '/b' };
    const config = withLoaderDevframe({
      trailingSlash: true,
      rewrites: async () => ({ beforeFiles: [own], afterFiles: [], fallback: [] }),
    });
    assert.deepStrictEqual(await config.rewrites?.(), {
      beforeFiles: [own],
      afterFiles: HUB_REWRITES,
      fallback: [],
    });
  });

  it('skips trailing-slash redirects when trailingSlash is off', () => {
    const config = withLoaderDevframe({});
    assert.strictEqual(config.skipTrailingSlashRedirect, true);
  });
});
