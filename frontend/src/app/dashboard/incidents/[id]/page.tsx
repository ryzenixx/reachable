"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IncidentDetailsCard } from "@/features/incidents/incident-details-card";
import { INCIDENT_UPDATE_DEFAULT_VALUES } from "@/features/incidents/detail-constants";
import { IncidentTimelineCard } from "@/features/incidents/incident-timeline-card";
import { IncidentUpdateFormCard } from "@/features/incidents/incident-update-form-card";
import { useAddIncidentUpdate, useIncident, useUpdateIncident } from "@/hooks/use-dashboard";
import { toastApiError } from "@/lib/errors";
import { incidentUpdateSchema, type IncidentUpdateValues } from "@/schemas";

export default function IncidentDetailPage(): React.JSX.Element {
  const { openMobileSidebar } = useDashboardShell();
  const params = useParams<{ id: string }>();
  const incidentId = params.id ?? "";

  const incidentQuery = useIncident(incidentId);
  const addUpdateMutation = useAddIncidentUpdate();
  const updateIncidentMutation = useUpdateIncident();

  const [preview, setPreview] = useState(false);

  const form = useForm<IncidentUpdateValues>({
    resolver: zodResolver(incidentUpdateSchema),
    defaultValues: INCIDENT_UPDATE_DEFAULT_VALUES,
  });

  const updateMessagePreview = useWatch({
    control: form.control,
    name: "message",
  });

  const incident = incidentQuery.data;

  async function addUpdate(values: IncidentUpdateValues): Promise<void> {
    if (!incidentId) {
      return;
    }

    try {
      await addUpdateMutation.mutateAsync({
        incidentId,
        values,
      });
      toast.success("Incident update posted.");
      form.reset({
        status: values.status,
        message: "",
      });
      setPreview(false);
    } catch (error) {
      toastApiError(error, "Unable to post incident update.");
    }
  }

  async function resolveIncident(): Promise<void> {
    if (!incidentId) {
      return;
    }

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
        description="Review incident timeline updates, markdown communication, and affected services."
        title={`${incident?.title ?? "Incident"} | Reachable`}
      />
      <DashboardPageHeader
        action={
          <div className="flex items-center gap-2">
            {incident?.status !== "resolved" ? (
              <Button className="text-[13px]" onClick={() => void resolveIncident()} size="sm" variant="outline">
                <CheckCircle2 className="size-3.5" />
                Resolve
              </Button>
            ) : null}
            <Button asChild className="text-[13px] text-neutral-500" size="sm" variant="ghost">
              <Link href="/dashboard/incidents">
                <ArrowLeft className="size-3.5" />
                Back
              </Link>
            </Button>
          </div>
        }
        description="Timeline and updates."
        onOpenMobileSidebar={openMobileSidebar}
        title={incident?.title ?? "Incident"}
      />

      {incidentQuery.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : !incident ? (
        <p className="py-8 text-[13px] text-neutral-400">Incident not found.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
          <div className="space-y-4">
            <IncidentTimelineCard incident={incident} />
            <IncidentUpdateFormCard
              form={form}
              isPreview={preview}
              isSubmitting={addUpdateMutation.isPending}
              onPreviewChange={setPreview}
              onSubmit={addUpdate}
              previewMessage={updateMessagePreview || ""}
            />
          </div>

          <IncidentDetailsCard incident={incident} />
        </div>
      )}
    </div>
  );
}
