"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, setApiToken } from "@/lib/api";
import { writeAuthToken } from "@/lib/auth";
import { onboardingSchema, type OnboardingValues } from "@/schemas";
import type { AuthUser, OnboardingState } from "@/types/api";

export function useOnboardingState(enabled = true) {
  return useQuery({
    queryKey: ["onboarding", "state"],
    queryFn: async (): Promise<OnboardingState> => {
      return api.onboardingState();
    },
    enabled,
  });
}

export function useBootstrapOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: OnboardingValues): Promise<{ token: string; user: AuthUser }> => {
      const parsed = onboardingSchema.parse(values);
      const { confirm_password, ...payload } = parsed;
      void confirm_password;

      const result = await api.bootstrapOnboarding(payload);

      writeAuthToken(result.token);
      setApiToken(result.token);

      return result;
    },
    onSuccess: async (result) => {
      queryClient.setQueryData<AuthUser | null>(["auth", "me"], result.user);
      queryClient.setQueryData<OnboardingState>(["onboarding", "state"], { initialized: true });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      await queryClient.invalidateQueries({ queryKey: ["onboarding", "state"] });
    },
  });
}
