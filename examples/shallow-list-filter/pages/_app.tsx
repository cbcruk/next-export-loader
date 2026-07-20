import { useState, type ReactElement } from 'react';
import type { AppProps } from 'next/app';
import Link from 'next/link';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoaderRuntime, useLoaderPhase } from 'next-export-loader';

function ProgressBar(): ReactElement | null {
  const phase = useLoaderPhase();
  if (phase !== 'loading') return null;
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: '#0070f3',
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

function AppNav(): ReactElement {
  return (
    <nav
      style={{
        display: 'flex',
        gap: 16,
        padding: '12px 32px',
        borderBottom: '1px solid #eee',
      }}
    >
      <Link href="/">Home</Link>
      <Link href="/list">List</Link>
    </nav>
  );
}

export default function App({ Component, pageProps }: AppProps): ReactElement {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 1000 * 60 } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppNav />
      <LoaderRuntime
        Component={Component}
        fallback={<PageSkeleton />}
        errorFallback={<div style={{ padding: 32 }}>Something went wrong.</div>}
      >
        <Component {...pageProps} />
      </LoaderRuntime>
    </QueryClientProvider>
  );
}
