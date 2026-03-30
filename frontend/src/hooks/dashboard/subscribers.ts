"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { subscriberSchema } from "@/schemas";
import type { Subscriber } from "@/types/api";
import { dashboardKeys } from "./query-keys";

export function useSubscribers() {
  return useQuery({
    queryKey: dashboardKeys.subscribers,
    queryFn: async (): Promise<Subscriber[]> => {
      return api.subscribers();
    },
  });
}

export function useCreateSubscriber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string): Promise<Subscriber> => {
      const payload = subscriberSchema.parse({ email });
      return api.createSubscriber(payload.email);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.subscribers });
    },
  });
}

export function useDeleteSubscriber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriberId: string): Promise<void> => {
      await api.deleteSubscriber(subscriberId);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.subscribers });
    },
  });
}

export function useExportSubscribers() {
  return useMutation({
    mutationFn: async (): Promise<Blob> => {
      return api.exportSubscribersCsv();
    },
  });
}
