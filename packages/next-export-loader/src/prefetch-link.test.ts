import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { QueryClient } from '@tanstack/react-query';
import { prefetchQueries, type PrefetchableQuery } from './prefetch-link';

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
