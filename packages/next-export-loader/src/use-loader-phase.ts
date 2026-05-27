import { createContext, useContext, useSyncExternalStore } from 'react';
import type { LoaderPhase } from './internal/types';

export interface LoaderPhaseStore {
  getPhase(): LoaderPhase;
  subscribe(listener: () => void): () => void;
}

export const LoaderPhaseContext = createContext<LoaderPhaseStore | null>(null);

export function useLoaderPhase(): LoaderPhase {
  const store = useContext(LoaderPhaseContext);
  if (!store) {
    throw new Error('useLoaderPhase must be used within <LoaderRuntime>');
  }
  return useSyncExternalStore(store.subscribe, store.getPhase, store.getPhase);
}
