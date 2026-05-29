import { createContext, useContext, useSyncExternalStore } from 'react';
import type { LoaderPhase } from './types';

export interface LoaderPhaseStore {
  getPhase(): LoaderPhase;
  subscribe(listener: () => void): () => void;
}

export const LoaderPhaseContext = createContext<LoaderPhaseStore | null>(null);

/**
 * Reads the current loader {@link LoaderPhase} of the enclosing page.
 *
 * Useful for rendering navigation progress indicators. Because the page
 * component only mounts once its loader is `ready`, calling this from inside
 * the page itself will observe `ready`; phase transitions are visible from
 * surrounding chrome (layouts, progress bars) that stay mounted across
 * navigations.
 *
 * @returns The active loader phase.
 * @throws If called outside of a `<LoaderRuntime>`.
 */
export function useLoaderPhase(): LoaderPhase {
  const store = useContext(LoaderPhaseContext);
  if (!store) {
    throw new Error('useLoaderPhase must be used within <LoaderRuntime>');
  }
  return useSyncExternalStore(store.subscribe, store.getPhase, store.getPhase);
}
