import type { LoaderPhase } from '../types';

/**
 * A single recorded navigation, as surfaced by {@link LoaderDevtools}.
 */
export interface NavigationEntry {
  /** Monotonic navigation id; newer navigations have larger ids. */
  id: number;
  /** URL the navigation started at. */
  url: string;
  /** URL after following any redirects (equals `url` when none occurred). */
  finalUrl: string;
  /** Timestamp (ms) when the loader began. */
  startedAt: number;
  /** Loader duration in ms, or `null` while still loading. */
  duration: number | null;
  /** Outcome phase, plus `cancelled` for navigations superseded mid-flight. */
  phase: LoaderPhase | 'cancelled';
  /** Ordered list of redirect destinations the loader threw. */
  redirectChain: string[];
  /** Error message if the loader failed, otherwise `null`. */
  error: string | null;
  /** Display name of the page component for this navigation. */
  componentName: string;
}

type Listener = () => void;

const MAX_ENTRIES = 50;

class DevtoolsStore {
  private entries: NavigationEntry[] = [];
  private listeners = new Set<Listener>();

  getEntries(): readonly NavigationEntry[] {
    return this.entries;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  startNavigation(
    id: number,
    url: string,
    componentName: string,
  ): void {
    this.entries = [
      {
        id,
        url,
        finalUrl: url,
        startedAt: Date.now(),
        duration: null,
        phase: 'loading' as const,
        redirectChain: [] as string[],
        error: null,
        componentName,
      },
      ...this.entries,
    ].slice(0, MAX_ENTRIES);
    this.notify();
  }

  addRedirect(id: number, destination: string): void {
    this.updateEntry(id, (entry) => ({
      ...entry,
      redirectChain: [...entry.redirectChain, destination],
      finalUrl: destination,
    }));
  }

  completeNavigation(
    id: number,
    phase: 'ready' | 'error',
    error?: string,
  ): void {
    this.updateEntry(id, (entry) => ({
      ...entry,
      phase,
      duration: Date.now() - entry.startedAt,
      error: error ?? null,
    }));
  }

  cancelNavigation(id: number): void {
    this.updateEntry(id, (entry) => {
      if (entry.phase !== 'loading') return entry;
      return {
        ...entry,
        phase: 'cancelled',
        duration: Date.now() - entry.startedAt,
      };
    });
  }

  private updateEntry(
    id: number,
    updater: (entry: NavigationEntry) => NavigationEntry,
  ): void {
    this.entries = this.entries.map((e) =>
      e.id === id ? updater(e) : e,
    );
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

let store: DevtoolsStore | null = null;

export function enableDevtools(): DevtoolsStore {
  if (!store) store = new DevtoolsStore();
  return store;
}

export function getDevtoolsStore(): DevtoolsStore | null {
  return store;
}
