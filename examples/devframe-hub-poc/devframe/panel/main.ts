import { connectPanelChannel } from 'devframe/in-page-channel';
import {
  LOADER_CHANNEL,
  type LoaderChannelProtocol,
  type LoaderDevframeState,
} from 'next-export-loader/devframe';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('#app mount node missing');

type Connection = 'connecting' | 'connected' | 'missing';

let state: LoaderDevframeState = { entries: [] };
let connection: Connection = 'connecting';

function render(target: HTMLElement): void {
  const header = document.createElement('header');
  header.innerHTML = `<strong>Loader navigations</strong><span class="muted" data-testid="status">${connection} · ${state.entries.length}</span>`;
  const rows = state.entries.map((entry) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.dataset.testid = 'navigation';
    row.innerHTML = `<span class="${entry.phase}">${entry.phase}</span><span class="url"></span><span class="muted">${entry.componentName}</span><span class="muted">${entry.duration ?? '…'}ms</span>`;
    const url = row.querySelector('.url');
    if (url) url.textContent = entry.url;
    return row;
  });
  target.replaceChildren(header, ...rows);
}

const channel = connectPanelChannel<LoaderChannelProtocol>({
  name: LOADER_CHANNEL,
  functions: {},
  events: {},
});

channel.events.on('status:updated', (status) => {
  connection = status === 'connected' ? 'connected' : 'connecting';
  render(root);
});

channel.whenConnected(3000).catch(() => {
  if (channel.status !== 'connected') {
    connection = 'missing';
    render(root);
  }
});

void channel.sharedState.get('state').then((shared) => {
  state = shared.value() as LoaderDevframeState;
  render(root);
  shared.on('updated', (full) => {
    state = full as LoaderDevframeState;
    render(root);
  });
});

render(root);
