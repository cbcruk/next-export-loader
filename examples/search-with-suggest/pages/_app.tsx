import { useState, type ReactElement } from 'react';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoaderRuntime, useLoaderPhase } from 'next-export-loader';

function ProgressBar(): ReactElement | null {
  const phase = useLoaderPhase();
  if (phase !== 'loading') return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: '#0070f3',
        animation: 'progress 1.5s ease-in-out infinite',
        zIndex: 9999,
      }}
    />
  );
}

function PageSkeleton(): ReactElement {
  return (
    <>
      <ProgressBar />
      <div style={{ padding: 32, color: '#888' }}>Loading...</div>
    </>
  );
}

function ErrorView(): ReactElement {
  return (
    <div style={{ padding: 32, color: '#c00' }}>
      Something went wrong. Please refresh.
    </div>
  );
}

export default function App({ Component, pageProps }: AppProps): ReactElement {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 1000 * 60 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <style jsx global>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      <LoaderRuntime
        Component={Component}
        fallback={<PageSkeleton />}
        errorFallback={<ErrorView />}
      >
        <Component {...pageProps} />
      </LoaderRuntime>
    </QueryClientProvider>
  );
}
