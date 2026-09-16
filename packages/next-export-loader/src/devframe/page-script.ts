/**
 * Devframe integration for next-export-loader: streams loader navigations to
 * a devframe hub dock panel over the in-page channel.
 *
 * Requires the optional peer `devframe`. The panel and hub build live in
 * `next-export-loader-devframe`.
 *
 * @module
 */

import { createPageScriptChannel } from 'devframe/in-page-channel';
import { enableDevtools } from '../internal/devtools-store';
import { LOADER_CHANNEL } from './protocol';
import type {
  LoaderPageScriptHandle,
  LoaderPageScriptOptions,
} from './page-script.types';
import type { LoaderChannelProtocol } from './protocol.types';

export { LOADER_CHANNEL, LOADER_DEVFRAME_ID } from './protocol';
export type { NavigationEntry } from '../internal/devtools-store';
export type {
  LoaderPageScriptHandle,
  LoaderPageScriptOptions,
} from './page-script.types';
export type {
  LoaderChannelProtocol,
  LoaderDevframeState,
} from './protocol.types';

/**
 * Streams recorded loader navigations to devframe panels over the in-page channel.
 *
 * Call it from the app bundle (for example at the top of `_app.tsx`) so it
 * reads the same devtools store `<LoaderRuntime>` writes to. Loading it as a
 * hub client script instead would observe an empty store.
 *
 * Panels find it through a same-origin `postMessage` handshake, so no server is
 * involved and it behaves the same under `next dev` and a static export. The
 * page script owns the state: a panel that opens late, or reloads, is seeded
 * with the navigations recorded so far. In development the store records from
 * the first navigation, so a lazily imported page script still reports the
 * initial page load.
 *
 * @example Development-only mount
 * ```ts
 * if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
 *   void import('next-export-loader/devframe').then((devframe) =>
 *     devframe.mountLoaderPageScript(),
 *   );
 * }
 * ```
 */
export async function mountLoaderPageScript(
  options: LoaderPageScriptOptions = {},
): Promise<LoaderPageScriptHandle> {
  const throttleMs = options.throttleMs ?? 50;
  const store = enableDevtools();
  const channel = createPageScriptChannel<LoaderChannelProtocol>({
    name: LOADER_CHANNEL,
    functions: {},
    events: {},
  });

  const state = await channel.sharedState.get('state', {
    initialValue: { entries: [...store.getEntries()] },
  });

  let timer: ReturnType<typeof setTimeout> | null = null;

  const publish = (): void => {
    timer = null;
    const entries = [...store.getEntries()];
    state.mutate((draft) => {
      draft.entries = entries;
    });
  };

  const unsubscribe = store.subscribe(() => {
    if (timer === null) timer = setTimeout(publish, throttleMs);
  });

  return {
    channel,
    close(): void {
      unsubscribe();
      if (timer !== null) clearTimeout(timer);
      channel.close();
    },
  };
}
