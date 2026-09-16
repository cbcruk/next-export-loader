import type { NavigationEntry } from '../internal/devtools-store';

/** The view the page script owns and every panel mirrors. */
export interface LoaderDevframeState {
  /** Recorded navigations, newest first. */
  entries: NavigationEntry[];
}

/** The contract between the loader page script and its panels. */
export interface LoaderChannelProtocol {
  functions: {
    pageScript: Record<string, never>;
  };
  sharedStates: {
    state: LoaderDevframeState;
  };
}
