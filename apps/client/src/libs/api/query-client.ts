import { QueryClient } from '@tanstack/react-query'

const staleTime: number = 30_000
const gcTime: number = 5 * 60_000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime,
      gcTime,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => !(error instanceof Error && /sign in|session is invalid/i.test(error.message)) && failureCount < 2,
    },
    mutations: { retry: 0 },
  },
})


