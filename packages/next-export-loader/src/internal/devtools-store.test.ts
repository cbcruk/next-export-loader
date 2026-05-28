import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { enableDevtools } from './devtools-store';

describe('DevtoolsStore', () => {
  const store = enableDevtools();

  it('enableDevtools returns a store', () => {
    assert.ok(store.getEntries() !== undefined);
  });

  it('startNavigation adds entry at the front', () => {
    store.startNavigation(100, '/items', 'ItemsPage');
    const entries = store.getEntries();
    const entry = entries.find((e) => e.id === 100);
    assert.ok(entry);
    assert.strictEqual(entry.url, '/items');
    assert.strictEqual(entry.componentName, 'ItemsPage');
    assert.strictEqual(entry.phase, 'loading');
    assert.strictEqual(entry.duration, null);
  });

  it('addRedirect appends to redirect chain', () => {
    store.startNavigation(200, '/items', 'ItemsPage');
    store.addRedirect(200, '/items?id=1');
    const entry = store.getEntries().find((e) => e.id === 200);
    assert.ok(entry);
    assert.deepStrictEqual(entry.redirectChain, ['/items?id=1']);
    assert.strictEqual(entry.finalUrl, '/items?id=1');
  });

  it('addRedirect accumulates multiple redirects', () => {
    store.startNavigation(201, '/a', 'Page');
    store.addRedirect(201, '/b');
    store.addRedirect(201, '/c');
    const entry = store.getEntries().find((e) => e.id === 201);
    assert.ok(entry);
    assert.deepStrictEqual(entry.redirectChain, ['/b', '/c']);
    assert.strictEqual(entry.finalUrl, '/c');
  });

  it('completeNavigation sets phase to ready with duration', () => {
    store.startNavigation(300, '/items', 'ItemsPage');
    store.completeNavigation(300, 'ready');
    const entry = store.getEntries().find((e) => e.id === 300);
    assert.ok(entry);
    assert.strictEqual(entry.phase, 'ready');
    assert.ok(typeof entry.duration === 'number');
    assert.strictEqual(entry.error, null);
  });

  it('completeNavigation sets error message on error phase', () => {
    store.startNavigation(400, '/fail', 'FailPage');
    store.completeNavigation(400, 'error', 'Something broke');
    const entry = store.getEntries().find((e) => e.id === 400);
    assert.ok(entry);
    assert.strictEqual(entry.phase, 'error');
    assert.strictEqual(entry.error, 'Something broke');
  });

  it('cancelNavigation sets phase to cancelled', () => {
    store.startNavigation(500, '/items', 'ItemsPage');
    store.cancelNavigation(500);
    const entry = store.getEntries().find((e) => e.id === 500);
    assert.ok(entry);
    assert.strictEqual(entry.phase, 'cancelled');
    assert.ok(typeof entry.duration === 'number');
  });

  it('cancelNavigation does not override completed entries', () => {
    store.startNavigation(600, '/items', 'ItemsPage');
    store.completeNavigation(600, 'ready');
    store.cancelNavigation(600);
    const entry = store.getEntries().find((e) => e.id === 600);
    assert.ok(entry);
    assert.strictEqual(entry.phase, 'ready');
  });

  it('subscribe notifies listeners on changes', () => {
    let notified = false;
    const unsubscribe = store.subscribe(() => {
      notified = true;
    });
    store.startNavigation(700, '/test', 'TestPage');
    assert.strictEqual(notified, true);
    unsubscribe();
  });

  it('unsubscribe stops notifications', () => {
    let count = 0;
    const unsubscribe = store.subscribe(() => {
      count++;
    });
    store.startNavigation(800, '/a', 'A');
    unsubscribe();
    store.startNavigation(801, '/b', 'B');
    assert.strictEqual(count, 1);
  });
});
