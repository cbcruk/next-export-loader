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
import { LoaderQueryContext } from './use-loader-query';
import type { ParsedUrlQuery } from 'querystring';
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
  /**
   * The `router.asPath` the loader last resolved for. Readiness is tracked per
   * navigation, not just per component: a same-component param change
   * (/items?id=1 → ?id=999) must re-run the loader before the page renders the
   * new param, or the page would render stale/invalid state — and crash, or
   * skip a redirect — before the loader settles.
   */
  readyPath: string | null;
  /**
   * The validated query the loader resolved for `readyPath` — the value
   * {@link useLoaderQuery} exposes to the page. Held across a subsequent
   * loading window (not cleared on reset) so it always reflects the last
   * validated navigation.
   */
  readyQuery: unknown;
}

/**
 * Drives the loader lifecycle for the active page in `_app`.
 *
 * Runs the page's `loader` on every navigation and only renders `children`
 * (the page) once it resolves, guaranteeing the component mounts with its data
 * already in cache. While the loader runs it shows `fallback`; on a non-redirect
 * error it shows `errorFallback`. Stale navigations are cancelled so only the
 * most recent one wins, and {@link RedirectError}s redirect before mount.
 *
 * @example
 * ```tsx
 * export default function App({ Component, pageProps }: AppProps) {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <LoaderRuntime
 *         Component={Component}
 *         fallback={<Spinner />}
 *         errorFallback={<ErrorPage />}
 *       >
 *         <Component {...pageProps} />
 *       </LoaderRuntime>
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 */
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
  const redirectCountRef = useRef(0);
  const readyComponentRef = useRef<
    (React.ComponentType & PageWithLoader) | null
  >(null);

  const [state, setState] = useState<LoaderState>({
    phase: 'loading',
    error: null,
    readyComponent: null,
    readyPath: null,
    readyQuery: {},
  });

  // In `instant` mode, hold the last validated render across a same-component
  // param change instead of flashing the fallback: the page reads its param via
  // useLoaderQuery (the held `readyQuery`), so it keeps showing the previous,
  // already-validated view until the loader settles the new one — no loading
  // frame, and an invalid param never reaches the page (the loader redirects
  // first). Cross-component changes still reset; a different page can't be held.
  const isSameComponentParamChange =
    state.readyComponent === Component && state.readyPath !== router.asPath;
  const holdForInstant =
    Component.loaderMode === 'instant' &&
    state.phase === 'ready' &&
    isSameComponentParamChange;

  // Synchronously fall back to loading when the navigation target changes —
  // either a different component OR a same-component param change. Doing this
  // during render (not in the effect) keeps the page from rendering the new
  // param for even one commit before the loader has validated it.
  if (
    state.readyComponent !== null &&
    (state.readyComponent !== Component || state.readyPath !== router.asPath) &&
    !holdForInstant
  ) {
    setState({
      phase: 'loading',
      error: null,
      readyComponent: null,
      readyPath: null,
      readyQuery: state.readyQuery,
    });
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

    let cancelled = false;
    const abortController = new AbortController();
    const navId = createNavigationId();

    const loader = Component.loader;
    if (!loader) {
      redirectCountRef.current = 0;
      readyComponentRef.current = Component;
      setState({
        phase: 'ready',
        error: null,
        readyComponent: Component,
        readyPath: router.asPath,
        readyQuery: parseUrl(router.asPath),
      });
      setPhase('ready');
      return;
    }

    let settled = false;
    const commitLoading = (): void => {
      setState((prev) => ({ ...prev, phase: 'loading', error: null }));
      setPhase('loading');
    };

    devtools?.startNavigation(navId, router.asPath, componentName);

    // `instant` same-component switch: defer the loading commit by a macrotask
    // and skip it if the loader settled first. A cache hit resolves within
    // microtasks — before the macrotask — so no loading frame is committed; a
    // genuinely slow load still falls back once the macrotask fires. Any other
    // navigation commits loading immediately (the standard block behavior).
    let loadingTimer: ReturnType<typeof setTimeout> | undefined;
    const isInstantHold =
      Component.loaderMode === 'instant' &&
      readyComponentRef.current === Component;
    if (isInstantHold) {
      loadingTimer = setTimeout(() => {
        if (cancelled || settled || !isLatestNavigation(navId)) return;
        commitLoading();
      }, 0);
    } else {
      commitLoading();
    }

    const run = async (): Promise<void> => {
      let query: ParsedUrlQuery = {};
      try {
        const raw = parseUrl(router.asPath);
        query = loader.validate ? loader.validate(raw) : raw;
        const ctx = {
          query,
          queryClient: queryClientRef.current,
          signal: abortController.signal,
        };
        // Guard/redirect phase first, before any data fetching: an unauthorized
        // navigation redirects without ever triggering the loader.
        if (loader.beforeLoad) await loader.beforeLoad(ctx);
        await loader(ctx);
      } catch (error: unknown) {
        if (!isLatestNavigation(navId) || cancelled) return;
        settled = true;

        if (isRedirectError(error)) {
          redirectCountRef.current += 1;
          if (redirectCountRef.current > MAX_REDIRECTS) {
            redirectCountRef.current = 0;
            devtools?.completeNavigation(navId, 'error', 'Too many redirects');
            setState((prev) => ({
              phase: 'error',
              error: new Error('Too many redirects'),
              readyComponent: null,
              readyPath: null,
              readyQuery: prev.readyQuery,
            }));
            setPhase('error');
            return;
          }
          devtools?.addRedirect(navId, error.destination);
          if (error.replace) {
            void routerRef.current.replace(error.destination);
          } else {
            void routerRef.current.push(error.destination);
          }
          return;
        }

        const message =
          error instanceof Error ? error.message : String(error);
        devtools?.completeNavigation(navId, 'error', message);
        setState((prev) => ({
          phase: 'error',
          error,
          readyComponent: null,
          readyPath: null,
          readyQuery: prev.readyQuery,
        }));
        setPhase('error');
        return;
      }

      if (!isLatestNavigation(navId) || cancelled) return;
      settled = true;

      redirectCountRef.current = 0;
      readyComponentRef.current = Component;
      devtools?.completeNavigation(navId, 'ready');
      setState({
        phase: 'ready',
        error: null,
        readyComponent: Component,
        readyPath: router.asPath,
        readyQuery: query,
      });
      setPhase('ready');
    };

    void run();

    return () => {
      cancelled = true;
      if (loadingTimer !== undefined) clearTimeout(loadingTimer);
      abortController.abort();
      devtools?.cancelNavigation(navId);
    };
  }, [Component, router.asPath, setPhase]);

  const isReady =
    state.phase === 'ready' &&
    state.readyComponent === Component &&
    (state.readyPath === router.asPath || holdForInstant);

  return (
    <LoaderPhaseContext.Provider value={store}>
      <LoaderQueryContext.Provider value={state.readyQuery}>
        {isReady
          ? children
          : state.phase === 'error'
            ? errorFallback
            : fallback}
      </LoaderQueryContext.Provider>
    </LoaderPhaseContext.Provider>
  );
}
