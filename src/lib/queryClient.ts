import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds — data considered fresh
      gcTime: 5 * 60_000, // 5 minutes — garbage collect unused cache
      retry: 2, // retry failed requests twice
      refetchOnWindowFocus: false, // avoid over-fetching on mobile tab switches
      refetchOnReconnect: true, // refetch when network comes back
    },
    mutations: {
      retry: 1,
    },
  },
});
