import type { PageScriptChannel } from 'devframe/in-page-channel';
import type { LoaderChannelProtocol } from './protocol.types';

/** Options for {@link mountLoaderPageScript}. */
export interface LoaderPageScriptOptions {
  /**
   * Milliseconds to coalesce store updates before publishing.
   *
   * A single navigation updates the store several times (start, redirects,
   * completion), and each publish copies every entry. Default `50`.
   */
  throttleMs?: number;
}

/** A mounted loader page script. */
export interface LoaderPageScriptHandle {
  /**
   * The underlying page-script endpoint, for custom transports such as
   * `addPanelPort` in tests.
   */
  channel: PageScriptChannel<LoaderChannelProtocol>;
  /** Stops publishing navigations and disconnects every panel. */
  close(): void;
}
