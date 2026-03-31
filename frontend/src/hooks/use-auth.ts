"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { loginSchema, type LoginValues } from "@/schemas";
import type { AuthUser } from "@/types/api";

export function useBootstrapAuth(): boolean {
  return true;
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: LoginValues): Promise<{ token: string; user: AuthUser }> => {
      const payload = loginSchema.parse(values);
      return api.login(payload);
    },
    onSuccess: async (result) => {
      queryClient.setQueryData<AuthUser | null>(["auth", "me"], result.user);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async (): Promise<AuthUser | null> => {
      return api.me();
    },
    enabled,
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await queryClient.cancelQueries({ queryKey: ["auth", "me"] });
      queryClient.setQueryData<AuthUser | null>(["auth", "me"], null);
      void api.logout().catch(() => undefined);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"], refetchType: "none" });
    },
  });
}
