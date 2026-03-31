"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/empty-state";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { INCIDENT_DEFAULT_VALUES } from "@/features/incidents/constants";
import { IncidentFormSheet } from "@/features/incidents/incident-form-sheet";
import { IncidentsTable } from "@/features/incidents/incidents-table";
import { useCreateIncident, useIncidents, useServices, useUpdateIncident } from "@/hooks/use-dashboard";
import { toastApiError } from "@/lib/errors";
import { incidentSchema, type IncidentValues } from "@/schemas";

export default function IncidentsPage(): React.JSX.Element {
  const { openMobileSidebar } = useDashboardShell();

  const incidentsQuery = useIncidents();
  const servicesQuery = useServices();

  const createIncidentMutation = useCreateIncident();
  const updateIncidentMutation = useUpdateIncident();

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const form = useForm<IncidentValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: INCIDENT_DEFAULT_VALUES,
  });

  const services = servicesQuery.data ?? [];
  const incidents = incidentsQuery.data ?? [];

  async function submit(values: IncidentValues): Promise<void> {
    try {
      await createIncidentMutation.mutateAsync(values);
      toast.success("Incident created.");
      setIsSheetOpen(false);
      form.reset(INCIDENT_DEFAULT_VALUES);
    } catch (error) {
      toastApiError(error, "Unable to create incident.");
    }
  }

  async function resolveIncident(incidentId: string): Promise<void> {
    try {
      await updateIncidentMutation.mutateAsync({
        incidentId,
        values: {
          status: "resolved",
        },
      });
      toast.success("Incident resolved.");
    } catch (error) {
      toastApiError(error, "Unable to resolve incident.");
    }
  }

  return (
    <div>
      <PageMeta
        description="Create and manage incidents, impact, affected services, and resolution progress."
        title="Incidents | Reachable"
      />
      <DashboardPageHeader
        action={
          <Button onClick={() => setIsSheetOpen(true)} size="sm">
            <Plus className="size-3.5" />
            Create incident
          </Button>
        }
        description="Track incidents, affected services, and updates."
        onOpenMobileSidebar={openMobileSidebar}
        title="Incidents"
      />

      {incidentsQuery.isPending || servicesQuery.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : incidents.length === 0 ? (
        <EmptyState
          actionLabel="Create your first incident"
          description="Incidents appear here with status, impact, and affected services."
          icon={Plus}
          onAction={() => setIsSheetOpen(true)}
          title="No incidents yet"
        />
      ) : (
        <IncidentsTable incidents={incidents} onResolve={resolveIncident} />
      )}

      <IncidentFormSheet
        form={form}
        isOpen={isSheetOpen}
        isSubmitting={createIncidentMutation.isPending}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            form.reset(INCIDENT_DEFAULT_VALUES);
          }
        }}
        onSubmit={submit}
        services={services}
      />
    </div>
  );
}
