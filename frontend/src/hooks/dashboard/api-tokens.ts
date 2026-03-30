"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { apiTokenSchema, type ApiTokenValues } from "@/schemas";
import type { ApiTokenSummary, CreateApiTokenResponse } from "@/types/api";
import { dashboardKeys } from "./query-keys";

export function useApiTokens() {
  return useQuery({
    queryKey: dashboardKeys.apiTokens,
    queryFn: async (): Promise<ApiTokenSummary[]> => {
      return api.apiTokens();
    },
  });
}

export function useCreateApiToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ApiTokenValues): Promise<CreateApiTokenResponse> => {
      const payload = apiTokenSchema.parse(values);
      return api.createApiToken(payload);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.apiTokens });
    },
  });
}

export function useDeleteApiToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tokenId: number): Promise<void> => {
      await api.deleteApiToken(tokenId);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.apiTokens });
    },
  });
}
