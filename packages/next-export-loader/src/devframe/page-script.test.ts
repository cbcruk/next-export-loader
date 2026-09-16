import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { connectPanelChannel } from 'devframe/in-page-channel';
import { enableDevtools } from '../internal/devtools-store';
import { mountLoaderPageScript } from './page-script';
import { LOADER_CHANNEL } from './protocol';
import type { LoaderChannelProtocol, LoaderDevframeState } from './protocol.types';

function waitFor(
  predicate: () => boolean,
  timeoutMs = 2000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = (): void => {
      if (predicate()) return resolve();
      if (Date.now() > deadline) return reject(new Error('waitFor timed out'));
      setTimeout(tick, 10);
    };
    tick();
  });
}

describe('mountLoaderPageScript', () => {
  it('seeds a panel with recorded navigations and streams updates', async () => {
    const store = enableDevtools();
    store.startNavigation(9001, '/before-mount', 'BeforeMountPage');

    const pageScript = await mountLoaderPageScript({ throttleMs: 0 });
    const { port1, port2 } = new MessageChannel();
    pageScript.channel.addPanelPort(port1);
    const panel = connectPanelChannel<LoaderChannelProtocol>({
      name: LOADER_CHANNEL,
      transport: port2,
      functions: {},
      events: {},
    });

    try {
      const shared = await panel.sharedState.get('state');
      let latest = shared.value() as LoaderDevframeState;
      shared.on('updated', (full) => {
        latest = full as LoaderDevframeState;
      });

      assert.ok(latest.entries.some((entry) => entry.id === 9001));

      store.startNavigation(9002, '/items', 'ItemsPage');
      store.completeNavigation(9002, 'ready');

      await waitFor(() =>
        latest.entries.some((entry) => entry.id === 9002 && entry.phase === 'ready'),
      );
      assert.equal(latest.entries[0]?.url, '/items');
    } finally {
      panel.close();
      pageScript.close();
      port1.close();
      port2.close();
    }
  });
});
