import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createNavigationId, isLatestNavigation } from './navigation-id';

describe('navigation-id', () => {
  it('createNavigationId returns incrementing ids', () => {
    const first = createNavigationId();
    const second = createNavigationId();
    assert.ok(second > first);
  });

  it('isLatestNavigation returns true for most recent id', () => {
    const id = createNavigationId();
    assert.strictEqual(isLatestNavigation(id), true);
  });

  it('isLatestNavigation returns false for stale id', () => {
    const stale = createNavigationId();
    createNavigationId();
    assert.strictEqual(isLatestNavigation(stale), false);
  });

  it('only the latest id is considered current', () => {
    const a = createNavigationId();
    const b = createNavigationId();
    const c = createNavigationId();
    assert.strictEqual(isLatestNavigation(a), false);
    assert.strictEqual(isLatestNavigation(b), false);
    assert.strictEqual(isLatestNavigation(c), true);
  });
});
