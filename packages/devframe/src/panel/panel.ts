import type { LoaderDevframeState, NavigationEntry } from 'next-export-loader/devframe';
import type { PanelConnection } from './panel.types';
import {
  SLOW_DURATION_MS,
  describeEmpty,
  formatDuration,
  formatStatus,
} from './panel.utils';

function el(
  tag: string,
  className: string,
  text?: string,
): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderEntry(entry: NavigationEntry): HTMLElement {
  const row = el('div', 'row');
  const line = el('div', 'line');
  const duration = el('span', 'meta', formatDuration(entry.duration));
  if (entry.duration !== null && entry.duration > SLOW_DURATION_MS) {
    duration.classList.add('slow');
  }
  const url = el('span', 'url', entry.url);
  url.title = entry.url;
  line.append(
    el('span', `phase phase-${entry.phase}`, entry.phase),
    url,
    el('span', 'meta', entry.componentName),
    duration,
  );
  row.append(line);

  if (entry.redirectChain.length > 0) {
    row.append(
      el('div', 'detail redirect', `↳ ${entry.redirectChain.join(' → ')}`),
    );
  }
  if (entry.error !== null) {
    row.append(el('div', 'detail error', entry.error));
  }
  return row;
}

/** Renders the navigation log and header into `root`, replacing its content. */
export function renderPanel(
  root: HTMLElement,
  state: LoaderDevframeState,
  connection: PanelConnection,
): void {
  const header = el('header', 'header');
  header.append(
    el('strong', 'title', 'Loader navigations'),
    el('span', 'status', formatStatus(connection, state.entries.length)),
  );

  const list = el('main', 'list');
  if (state.entries.length === 0) {
    list.append(el('p', 'empty', describeEmpty(connection)));
  } else {
    list.append(...state.entries.map(renderEntry));
  }

  root.replaceChildren(header, list);
}
