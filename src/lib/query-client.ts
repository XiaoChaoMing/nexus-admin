import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/lib/api-error'

/** Errors a retry cannot fix: permission, validation, missing data, state conflicts, throttling. */
function retryable(err: unknown) {
  return !isApiError(err) || err.status === 0 || err.status >= 500
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (failureCount, err) => failureCount < 1 && retryable(err),
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
