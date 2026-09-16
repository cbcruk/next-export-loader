import type { NavigationEntry } from '../internal/devtools-store';

/** The navigation log the page script owns and every panel mirrors. */
export interface LoaderDevframeState {
  /** Recorded navigations, newest first, capped at the store's buffer size. */
  entries: NavigationEntry[];
}

/** The in-page channel contract between the loader page script and its panels. */
export interface LoaderChannelProtocol {
  functions: {
    pageScript: Record<string, never>;
  };
  sharedStates: {
    state: LoaderDevframeState;
  };
}
