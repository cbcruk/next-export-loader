import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  QueryClient,
  queryOptions,
} from '@tanstack/react-query';
import { defineLoader } from './define-loader';
import type { LoaderContext } from './types';

describe('defineLoader', () => {
  it('returns the same loader function', () => {
    const fn = async (): Promise<void> => {};
    assert.strictEqual(defineLoader(fn), fn);
  });

  it('does not invoke the loader eagerly', async () => {
    let called = false;
    defineLoader(async () => {
      called = true;
    });
    assert.strictEqual(called, false);
  });

  it('passes the loader context through on invocation', async () => {
    const captured: { ctx: LoaderContext | null } = { ctx: null };
    const loader = defineLoader(async (ctx) => {
      captured.ctx = ctx;
    });

    const queryClient = new QueryClient();
    const controller = new AbortController();
    await loader({
      query: { id: '1' },
      queryClient,
      signal: controller.signal,
    });

    assert.ok(captured.ctx);
    assert.deepStrictEqual(captured.ctx.query, { id: '1' });
    assert.strictEqual(captured.ctx.queryClient, queryClient);
    assert.strictEqual(captured.ctx.signal, controller.signal);
  });
});

describe('defineLoader object form (validate)', () => {
  it('bare-function form still returns the same function', () => {
    const fn = async (): Promise<void> => {};
    assert.strictEqual(defineLoader(fn), fn);
  });

  it('attaches validate from the definition object', () => {
    const validate = (raw: { page?: string | string[] }): { page: number } => ({
      page: Number(raw.page ?? 1),
    });
    const loader = defineLoader({
      validate,
      load: async () => {},
    });
    assert.strictEqual(loader.validate, validate);
  });

  it('leaves validate undefined when the object omits it', () => {
    const loader = defineLoader({ load: async () => {} });
    assert.strictEqual(loader.validate, undefined);
  });

  it('load receives whatever query the caller passes as ctx.query', async () => {
    const captured: { query: { page: number } | null } = { query: null };
    const loader = defineLoader<{ page: number }>({
      validate: (raw) => ({ page: Number(raw.page ?? 1) }),
      load: async ({ query }) => {
        captured.query = query;
      },
    });

    await loader({
      query: { page: 2 },
      queryClient: new QueryClient(),
      signal: new AbortController().signal,
    });

    assert.deepStrictEqual(captured.query, { page: 2 });
  });

  it('validate coerces the raw query to the typed shape', () => {
    const loader = defineLoader<{ page: number }>({
      validate: (raw) => ({ page: Number(raw.page ?? 1) }),
      load: async () => {},
    });

    assert.ok(loader.validate);
    assert.deepStrictEqual(loader.validate({ page: '5' }), { page: 5 });
    assert.deepStrictEqual(loader.validate({}), { page: 1 });
  });

  it('attaches beforeLoad from the definition object', () => {
    const beforeLoad = (): void => {};
    const loader = defineLoader({ beforeLoad, load: async () => {} });
    assert.strictEqual(loader.beforeLoad, beforeLoad);
  });

  it('leaves beforeLoad undefined when the object omits it', () => {
    const loader = defineLoader({ load: async () => {} });
    assert.strictEqual(loader.beforeLoad, undefined);
  });
});

describe('loader query cache invariant', () => {
  it('component reads loader-prefetched data as a cache hit (no refetch)', async () => {
    let fetchCount = 0;
    const itemsQuery = () =>
      queryOptions({
        queryKey: ['items'] as const,
        queryFn: async () => {
          fetchCount += 1;
          return ['a', 'b', 'c'];
        },
        staleTime: Infinity,
      });

    const queryClient = new QueryClient();

    const loader = defineLoader(async ({ queryClient: qc }) => {
      await qc.ensureQueryData(itemsQuery());
    });

    await loader({
      query: {},
      queryClient,
      signal: new AbortController().signal,
    });
    assert.strictEqual(fetchCount, 1);

    // Component side: reading the same queryOptions hits the cache synchronously,
    // which is exactly what useSuspenseQuery does — no second fetch.
    const cached = queryClient.getQueryData(itemsQuery().queryKey);
    assert.deepStrictEqual(cached, ['a', 'b', 'c']);

    await queryClient.ensureQueryData(itemsQuery());
    assert.strictEqual(fetchCount, 1);
  });

  it('refetches only when the cache is empty', async () => {
    let fetchCount = 0;
    const itemsQuery = () =>
      queryOptions({
        queryKey: ['items'] as const,
        queryFn: async () => {
          fetchCount += 1;
          return 42;
        },
      });

    const queryClient = new QueryClient();
    await queryClient.ensureQueryData(itemsQuery());
    assert.strictEqual(fetchCount, 1);

    queryClient.removeQueries({ queryKey: itemsQuery().queryKey });
    await queryClient.ensureQueryData(itemsQuery());
    assert.strictEqual(fetchCount, 2);
  });
});
