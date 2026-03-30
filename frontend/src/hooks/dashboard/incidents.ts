"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { incidentSchema, incidentUpdateSchema, type IncidentUpdateValues, type IncidentValues } from "@/schemas";
import type { Incident, IncidentUpdate } from "@/types/api";
import { dashboardKeys, publicStatusKey } from "./query-keys";
import { tempId } from "./utils";

export function useIncidents() {
  return useQuery({
    queryKey: dashboardKeys.incidents,
    queryFn: async (): Promise<Incident[]> => {
      return api.incidents();
    },
  });
}

export function useIncident(incidentId: string) {
  return useQuery({
    queryKey: dashboardKeys.incident(incidentId),
    queryFn: async (): Promise<Incident> => {
      return api.incident(incidentId);
    },
    enabled: incidentId.length > 0,
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: IncidentValues): Promise<Incident> => {
      const payload = incidentSchema.parse(values);
      return api.createIncident(payload);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.incidents });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.services });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.status });
      await queryClient.invalidateQueries({ queryKey: publicStatusKey });
    },
  });
}

export function useUpdateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      incidentId,
      values,
    }: {
      incidentId: string;
      values: Partial<IncidentValues>;
    }): Promise<Incident> => {
      const payload = incidentSchema.partial().parse(values);
      return api.updateIncident(incidentId, payload);
    },
    onSettled: async (_data, _error, variables) => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.incidents });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.incident(variables.incidentId) });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.services });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.status });
      await queryClient.invalidateQueries({ queryKey: publicStatusKey });
    },
  });
}

export function useAddIncidentUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      incidentId: string;
      values: IncidentUpdateValues;
    }): Promise<IncidentUpdate> => {
      const payload = incidentUpdateSchema.parse(input.values);
      return api.createIncidentUpdate(input.incidentId, payload);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.incident(input.incidentId) });
      const previous = queryClient.getQueryData<Incident>(dashboardKeys.incident(input.incidentId));

      if (previous) {
        const optimisticUpdate: IncidentUpdate = {
          id: tempId("incident_update"),
          incident_id: input.incidentId,
          status: input.values.status,
          message: input.values.message,
          created_at: new Date().toISOString(),
        };

        queryClient.setQueryData<Incident>(dashboardKeys.incident(input.incidentId), {
          ...previous,
          status: input.values.status,
          updates: [...previous.updates, optimisticUpdate],
        });
      }

      return { previous, incidentId: input.incidentId };
    },
    onError: (_error, _variables, context) => {
      if (!context?.previous) {
        return;
      }

      queryClient.setQueryData(dashboardKeys.incident(context.incidentId), context.previous);
    },
    onSettled: async (_data, _error, variables) => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.incidents });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.incident(variables.incidentId) });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.services });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.status });
      await queryClient.invalidateQueries({ queryKey: publicStatusKey });
    },
  });
}

export function useDeleteIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incidentId: string): Promise<void> => {
      await api.deleteIncident(incidentId);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.incidents });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.services });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.status });
      await queryClient.invalidateQueries({ queryKey: publicStatusKey });
    },
  });
}
