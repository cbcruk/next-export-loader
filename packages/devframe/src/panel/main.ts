import { connectPanelChannel } from 'devframe/in-page-channel';
import {
  LOADER_CHANNEL,
  type LoaderChannelProtocol,
  type LoaderDevframeState,
} from 'next-export-loader/devframe';
import { renderPanel } from './panel';
import type { PanelConnection } from './panel.types';

const PAGE_SCRIPT_TIMEOUT_MS = 3000;

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('#app mount node missing from index.html');
const mount = root;

let state: LoaderDevframeState = { entries: [] };
let connection: PanelConnection = 'connecting';

const render = (): void => renderPanel(mount, state, connection);

const channel = connectPanelChannel<LoaderChannelProtocol>({
  name: LOADER_CHANNEL,
  functions: {},
  events: {},
});

channel.events.on('status:updated', (status) => {
  connection = status === 'connected' ? 'connected' : 'connecting';
  render();
});

channel.whenConnected(PAGE_SCRIPT_TIMEOUT_MS).catch(() => {
  if (channel.status !== 'connected') {
    connection = 'missing';
    render();
  }
});

void channel.sharedState.get('state').then((shared) => {
  state = shared.value() as LoaderDevframeState;
  connection = 'connected';
  render();
  shared.on('updated', (full) => {
    state = full as LoaderDevframeState;
    render();
  });
});

render();
