import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  enableDevtools,
  type NavigationEntry,
} from './internal/devtools-store';
import { useLoaderPhase } from './use-loader-phase';

const PHASE_COLORS = {
  loading: '#eab308',
  ready: '#22c55e',
  error: '#ef4444',
  cancelled: '#6c7086',
} as const;

function NavigationRow({
  entry,
}: {
  entry: NavigationEntry;
}): ReactNode {
  const color = PHASE_COLORS[entry.phase];
  const hasRedirects = entry.redirectChain.length > 0;

  return (
    <div
      style={{
        padding: '6px 0',
        borderBottom: '1px solid #313244',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            color: '#89b4fa',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {entry.url}
        </span>
        <span
          style={{
            color: '#a6adc8',
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          {entry.componentName}
        </span>
        {entry.duration !== null && (
          <span
            style={{
              color: entry.duration > 500 ? '#fab387' : '#6c7086',
              fontSize: 11,
              flexShrink: 0,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {entry.duration}ms
          </span>
        )}
      </div>
      {hasRedirects && (
        <div
          style={{
            marginLeft: 14,
            marginTop: 3,
            fontSize: 11,
            color: '#f9e2af',
          }}
        >
          ↳ {entry.redirectChain.join(' → ')}
        </div>
      )}
      {entry.error !== null && (
        <div
          style={{
            marginLeft: 14,
            marginTop: 3,
            fontSize: 11,
            color: '#f38ba8',
          }}
        >
          {entry.error}
        </div>
      )}
    </div>
  );
}

/**
 * Floating dev panel that logs loader navigations for debugging.
 *
 * Render it once inside `<LoaderRuntime>` (typically gated to development). It
 * shows a phase-colored toggle button and a panel listing recent navigations
 * with their URL, component, duration, redirect chain, and any error. Mounting
 * it enables the underlying devtools store; omit it in production builds.
 */
export function LoaderDevtools(): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const store = useMemo(() => enableDevtools(), []);
  const phase = useLoaderPhase();

  const subscribe = useMemo(
    () => store.subscribe.bind(store),
    [store],
  );
  const getEntries = useMemo(
    () => store.getEntries.bind(store),
    [store],
  );
  const entries = useSyncExternalStore(
    subscribe,
    getEntries,
    getEntries,
  );

  const toggleOpen = useCallback(
    () => setIsOpen((prev) => !prev),
    [],
  );

  const phaseColor = PHASE_COLORS[phase];
  const panelHeight = 280;

  return (
    <>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: panelHeight,
            zIndex: 99998,
            background: '#1e1e2e',
            color: '#cdd6f4',
            borderTop: '2px solid #45475a',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 12,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              borderBottom: '1px solid #313244',
              flexShrink: 0,
            }}
          >
            <strong style={{ fontSize: 13 }}>
              Loader Devtools
            </strong>
            <span style={{ color: '#6c7086', fontSize: 11 }}>
              {entries.length} navigation
              {entries.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 12px' }}>
            {entries.length === 0 ? (
              <div
                style={{
                  color: '#6c7086',
                  padding: '16px 0',
                  textAlign: 'center',
                }}
              >
                No navigations recorded yet.
              </div>
            ) : (
              entries.map((entry) => (
                <NavigationRow key={entry.id} entry={entry} />
              ))
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={toggleOpen}
        style={{
          position: 'fixed',
          bottom: isOpen ? panelHeight : 0,
          right: 16,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px',
          background: '#1e1e2e',
          color: '#cdd6f4',
          border: '1px solid #45475a',
          borderBottom: 'none',
          borderRadius: '6px 6px 0 0',
          cursor: 'pointer',
          fontSize: 12,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          transition: 'bottom 0.15s ease',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: phaseColor,
            display: 'inline-block',
          }}
        />
        Loader
      </button>
    </>
  );
}
