"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
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
  });
}
