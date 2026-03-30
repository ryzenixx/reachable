"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { subscriberSchema } from "@/schemas";
import type { PublicIncidentPayload, PublicStatusPayload } from "@/types/api";

export function usePublicStatus(page = 1) {
  return useQuery({
    queryKey: ["public-status", page],
    queryFn: async (): Promise<PublicStatusPayload> => {
      return api.publicStatus(page);
    },
  });
}

export function usePublicIncident(incidentId: string) {
  return useQuery({
    queryKey: ["public-incident", incidentId],
    queryFn: async (): Promise<PublicIncidentPayload> => {
      return api.publicIncident(incidentId);
    },
    enabled: incidentId.length > 0,
  });
}

export function useSubscribe() {
  return useMutation({
    mutationFn: async (email: string): Promise<{ message: string; subscriber_id: string }> => {
      const payload = subscriberSchema.parse({ email });
      return api.subscribe(payload.email);
    },
  });
}
