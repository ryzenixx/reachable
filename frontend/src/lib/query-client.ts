import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status === 404) {
            return false;
          }

          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
