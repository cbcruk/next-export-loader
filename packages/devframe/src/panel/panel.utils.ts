import type { NavigationEntry } from 'next-export-loader/devframe';
import type { PanelConnection } from './panel.types';

/** Loader durations above this many milliseconds are highlighted. */
export const SLOW_DURATION_MS = 500;

/** Formats a loader duration, or an ellipsis while the loader still runs. */
export function formatDuration(duration: NavigationEntry['duration']): string {
  return duration === null ? '…' : `${duration}ms`;
}

/** Describes the connection state and entry count for the panel header. */
export function formatStatus(
  connection: PanelConnection,
  count: number,
): string {
  if (connection === 'missing') return 'page script not found';
  if (connection === 'connecting') return 'connecting…';
  return `${count} navigation${count === 1 ? '' : 's'}`;
}

/** Text shown when there are no entries to list. */
export function describeEmpty(connection: PanelConnection): string {
  if (connection === 'missing') {
    return 'Call mountLoaderPageScript() from next-export-loader/devframe in your app.';
  }
  if (connection === 'connecting') return 'Waiting for the page script…';
  return 'No navigations recorded yet.';
}
