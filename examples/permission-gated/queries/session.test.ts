import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { sessionQuery } from './session';
import { login, logout } from '@/data/auth';

/**
 * Regression for the post-login redirect loop.
 *
 * The guard reads the session via `ensureQueryData(sessionQuery())`. If a visit
 * to a protected page while logged out populates that query with
 * `unauthenticated`, logging in must drop the cached entry — otherwise the next
 * guard reads the stale `unauthenticated` and bounces the user back to /login.
 *
 * The subtlety: `invalidateQueries` does NOT fix this for an inactive query (no
 * mounted observer), because `ensureQueryData` returns existing cached data
 * regardless of staleness. Only `removeQueries` forces a refetch. These tests
 * pin that distinction so the fix can't silently regress to `invalidate`.
 */
describe('session cache reset after login', () => {
  beforeEach(() => {
    logout();
  });

  async function seedLoggedOutCache(client: QueryClient): Promise<void> {
    // Simulates the pre-login visit to a protected page: the guard resolves the
    // session as unauthenticated and caches it.
    const seeded = await client.ensureQueryData(sessionQuery());
    assert.strictEqual(seeded.status, 'unauthenticated');
  }

  it('removeQueries (the fix) lets the next guard see the authenticated user', async () => {
    const client = new QueryClient();
    await seedLoggedOutCache(client);

    login('admin');
    client.removeQueries({ queryKey: sessionQuery().queryKey });

    const session = await client.ensureQueryData(sessionQuery());
    assert.strictEqual(session.status, 'authenticated');
  });

  it('invalidateQueries does NOT fix it for an inactive query (regression guard)', async () => {
    const client = new QueryClient();
    await seedLoggedOutCache(client);

    login('admin');
    // No mounted observer here, so invalidate marks stale but does not refetch;
    // ensureQueryData then returns the still-cached unauthenticated entry.
    await client.invalidateQueries({ queryKey: sessionQuery().queryKey });

    const session = await client.ensureQueryData(sessionQuery());
    assert.strictEqual(
      session.status,
      'unauthenticated',
      'if this is now "authenticated", invalidate started refetching inactive ' +
        'queries and removeQueries may no longer be required — revisit the fix',
    );
  });

  it('a fresh client with no seeded cache fetches the current session', async () => {
    const client = new QueryClient();
    login('viewer');

    const session = await client.ensureQueryData(sessionQuery());
    assert.strictEqual(session.status, 'authenticated');
  });
});
