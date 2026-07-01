import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  QueryClient as RealQueryClient,
  queryOptions,
  type QueryClient,
} from '@tanstack/react-query';
import {
  prefetchQueries,
  runLoaderForPrefetch,
  type PrefetchableQuery,
} from './prefetch-link';
import { defineLoader } from './define-loader';
import { RedirectError } from './redirect-error';

const tick = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

interface FakeClient {
  client: QueryClient;
  calls: ReadonlyArray<unknown>[];
}

function fakeQueryClient(): FakeClient {
  const calls: ReadonlyArray<unknown>[] = [];
  const client = {
    prefetchQuery: (opts: { queryKey: ReadonlyArray<unknown> }) => {
      calls.push(opts.queryKey);
      return Promise.resolve();
    },
  } as unknown as QueryClient;
  return { client, calls };
}

describe('prefetchQueries', () => {
  it('prefetches each query once, in order', () => {
    const { client, calls } = fakeQueryClient();
    const queries: PrefetchableQuery[] = [
      { queryKey: ['items'] },
      { queryKey: ['post', '1'] },
    ];

    prefetchQueries(client, queries);

    assert.deepStrictEqual(calls, [['items'], ['post', '1']]);
  });

  it('is a no-op for undefined', () => {
    const { client, calls } = fakeQueryClient();
    prefetchQueries(client, undefined);
    assert.strictEqual(calls.length, 0);
  });

  it('is a no-op for an empty list', () => {
    const { client, calls } = fakeQueryClient();
    prefetchQueries(client, []);
    assert.strictEqual(calls.length, 0);
  });

  it('does not await prefetch (fire-and-forget)', () => {
    let resolved = false;
    const client = {
      prefetchQuery: () =>
        new Promise<void>((resolve) =>
          setTimeout(() => {
            resolved = true;
            resolve();
          }, 0),
        ),
    } as unknown as QueryClient;

    prefetchQueries(client, [{ queryKey: ['x'] }]);
    // Returns synchronously, before the prefetch settles.
    assert.strictEqual(resolved, false);
  });
});

describe('runLoaderForPrefetch', () => {
  it('warms the cache by running the loader body', async () => {
    let fetchCount = 0;
    const itemsQuery = () =>
      queryOptions({
        queryKey: ['items'] as const,
        queryFn: async () => {
          fetchCount += 1;
          return ['a', 'b'];
        },
        staleTime: Infinity,
      });
    const queryClient = new RealQueryClient();
    const loader = defineLoader(async ({ queryClient: qc }) => {
      await qc.ensureQueryData(itemsQuery());
    });

    runLoaderForPrefetch(queryClient, loader, '/items');
    await tick();

    assert.strictEqual(fetchCount, 1);
    assert.deepStrictEqual(
      queryClient.getQueryData(itemsQuery().queryKey),
      ['a', 'b'],
    );
  });

  it('swallows a RedirectError thrown by the loader', async () => {
    const queryClient = new RealQueryClient();
    const loader = defineLoader(async () => {
      throw new RedirectError('/elsewhere');
    });

    // Must not throw or reject — prefetch is best-effort.
    runLoaderForPrefetch(queryClient, loader, '/items');
    await tick();
    assert.ok(true);
  });

  it('applies validate to the href query before running the loader', async () => {
    const captured: { query: { id: string } | null } = { query: null };
    const queryClient = new RealQueryClient();
    const loader = defineLoader<{ id: string }>({
      validate: (raw) => ({ id: String(raw.id) }),
      load: async ({ query }) => {
        captured.query = query;
      },
    });

    runLoaderForPrefetch(queryClient, loader, '/items?id=7');
    await tick();

    assert.deepStrictEqual(captured.query, { id: '7' });
  });

  it('does not run beforeLoad (guard phase is not a prefetch concern)', async () => {
    let beforeLoadRan = false;
    const queryClient = new RealQueryClient();
    const loader = defineLoader({
      beforeLoad: () => {
        beforeLoadRan = true;
      },
      load: async () => {},
    });

    runLoaderForPrefetch(queryClient, loader, '/items');
    await tick();

    assert.strictEqual(beforeLoadRan, false);
  });
});
