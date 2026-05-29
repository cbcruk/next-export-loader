import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import { isRedirectError } from './redirect-error';
import { getDevtoolsStore } from './internal/devtools-store';
import { createNavigationId, isLatestNavigation } from './internal/navigation-id';
import { parseUrl } from './internal/parse-url';
import type { LoaderPhase } from './types';
import type { PageWithLoader } from './internal/types';
import { LoaderPhaseContext, type LoaderPhaseStore } from './use-loader-phase';

const MAX_REDIRECTS = 10;

interface LoaderRuntimeProps {
  Component: React.ComponentType & PageWithLoader;
  fallback: ReactNode;
  errorFallback: ReactNode;
  children: ReactNode;
}

interface LoaderState {
  phase: LoaderPhase;
  error: unknown;
  readyComponent: (React.ComponentType & PageWithLoader) | null;
}

export function LoaderRuntime({
  Component,
  fallback,
  errorFallback,
  children,
}: LoaderRuntimeProps): ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();
  const routerRef = useRef(router);
  routerRef.current = router;
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;
  const redirectedToRef = useRef<string | null>(null);
  const redirectNavIdRef = useRef<number | null>(null);

  const [state, setState] = useState<LoaderState>({
    phase: 'loading',
    error: null,
    readyComponent: null,
  });

  if (
    state.readyComponent !== null &&
    state.readyComponent !== Component
  ) {
    setState({ phase: 'loading', error: null, readyComponent: null });
  }

  const listenersRef = useRef(new Set<() => void>());
  const phaseRef = useRef<LoaderPhase>(state.phase);

  const setPhase = useCallback((phase: LoaderPhase) => {
    phaseRef.current = phase;
    listenersRef.current.forEach((listener) => listener());
  }, []);

  const store = useMemo<LoaderPhaseStore>(
    () => ({
      getPhase: () => phaseRef.current,
      subscribe: (listener) => {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [],
  );

  useEffect(() => {
    const devtools = getDevtoolsStore();
    const componentName =
      Component.displayName ?? Component.name ?? 'Unknown';

    if (redirectedToRef.current === router.asPath) {
      redirectedToRef.current = null;
      if (redirectNavIdRef.current !== null) {
        devtools?.completeNavigation(redirectNavIdRef.current, 'ready');
        redirectNavIdRef.current = null;
      }
      setState({ phase: 'ready', error: null, readyComponent: Component });
      setPhase('ready');
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();
    const navId = createNavigationId();

    const loader = Component.loader;
    if (!loader) {
      setState({ phase: 'ready', error: null, readyComponent: Component });
      setPhase('ready');
      return;
    }

    devtools?.startNavigation(navId, router.asPath, componentName);
    setState((prev) => ({ ...prev, phase: 'loading', error: null }));
    setPhase('loading');

    const run = async (): Promise<void> => {
      let currentUrl = router.asPath;
      let redirectCount = 0;

      while (redirectCount < MAX_REDIRECTS) {
        try {
          const query = parseUrl(currentUrl);
          await loader({
            query,
            queryClient: queryClientRef.current,
            signal: abortController.signal,
          });

          if (!isLatestNavigation(navId) || cancelled) return;
          break;
        } catch (error: unknown) {
          if (!isLatestNavigation(navId) || cancelled) return;

          if (isRedirectError(error)) {
            devtools?.addRedirect(navId, error.destination);
            currentUrl = error.destination;
            redirectCount++;
            continue;
          }

          const message =
            error instanceof Error ? error.message : String(error);
          devtools?.completeNavigation(navId, 'error', message);
          setState({ phase: 'error', error, readyComponent: null });
          setPhase('error');
          return;
        }
      }

      if (redirectCount >= MAX_REDIRECTS) {
        devtools?.completeNavigation(navId, 'error', 'Too many redirects');
        setState({
          phase: 'error',
          error: new Error('Too many redirects'),
          readyComponent: null,
        });
        setPhase('error');
        return;
      }

      if (currentUrl !== router.asPath) {
        redirectedToRef.current = currentUrl;
        redirectNavIdRef.current = navId;
        void routerRef.current.replace(currentUrl);
        return;
      }

      devtools?.completeNavigation(navId, 'ready');
      setState({ phase: 'ready', error: null, readyComponent: Component });
      setPhase('ready');
    };

    void run();

    return () => {
      cancelled = true;
      abortController.abort();
      devtools?.cancelNavigation(navId);
    };
  }, [Component, router.asPath, setPhase]);

  const isReady = state.phase === 'ready' && state.readyComponent === Component;

  return (
    <LoaderPhaseContext.Provider value={store}>
      {isReady
        ? children
        : state.phase === 'error'
          ? errorFallback
          : fallback}
    </LoaderPhaseContext.Provider>
  );
}
