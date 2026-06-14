import { useState, type ReactElement } from 'react';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoaderRuntime } from 'next-export-loader';

function PageSkeleton(): ReactElement {
  return <div style={{ padding: 32, color: '#888' }}>Loading...</div>;
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
        defaultOptions: { queries: { staleTime: 1000 * 60 } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
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
