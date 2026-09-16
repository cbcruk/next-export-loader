import { createPageScriptChannel } from 'devframe/in-page-channel';
import { enableDevtools } from '../internal/devtools-store';
import { LOADER_CHANNEL } from './protocol';
import type { LoaderChannelProtocol } from './protocol.types';

export { LOADER_CHANNEL, LOADER_DEVFRAME_ID } from './protocol';
export type { LoaderChannelProtocol, LoaderDevframeState } from './protocol.types';

/** A mounted loader page script. */
export interface LoaderPageScriptHandle {
  /** Stops publishing navigations and disconnects every panel. */
  close(): void;
}

/**
 * Streams recorded loader navigations to devframe panels over the in-page channel.
 *
 * Experimental. It must run inside the app bundle so it shares the app's
 * devtools store instance.
 *
 * @example
 * ```ts
 * import { mountLoaderPageScript } from 'next-export-loader/devframe';
 *
 * await mountLoaderPageScript();
 * ```
 */
export async function mountLoaderPageScript(): Promise<LoaderPageScriptHandle> {
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
    const entries = store.getEntries();
    state.mutate((draft) => {
      draft.entries = [...entries];
    });
  };

  const unsubscribe = store.subscribe(() => {
    if (timer === null) timer = setTimeout(publish, 50);
  });

  return {
    close(): void {
      unsubscribe();
      if (timer !== null) clearTimeout(timer);
      channel.close();
    },
  };
}
