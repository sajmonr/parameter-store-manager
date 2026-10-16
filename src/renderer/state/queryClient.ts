import { QueryClient } from '@tanstack/react-query';

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Data only changes through the app or an explicit refresh.
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        // The AWS SDK in the main process already retries with backoff, and a
        // failed load stays failed until the user retries.
        retry: false,
        retryOnMount: false,
        // Requests go through IPC, so the browser's online state is irrelevant.
        networkMode: 'always'
      },
      mutations: { networkMode: 'always' }
    }
  });
