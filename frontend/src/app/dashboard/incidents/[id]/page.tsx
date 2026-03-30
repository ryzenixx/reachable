"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, PencilLine } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
import { ImpactBadge } from "@/components/status/impact-badge";
import { IncidentStatusBadge } from "@/components/status/incident-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddIncidentUpdate,
  useIncident,
  useUpdateIncident,
} from "@/hooks/use-dashboard";
import { formatRelative } from "@/lib/dates";
import { toastApiError } from "@/lib/errors";
import { incidentUpdateSchema, type IncidentUpdateValues } from "@/schemas";

function defaultUpdateValues(): IncidentUpdateValues {
  return {
    status: "monitoring",
    message: "",
  };
}

export default function IncidentDetailPage(): React.JSX.Element {
  const { openMobileSidebar } = useDashboardShell();
  const [preview, setPreview] = useState(false);
  const params = useParams<{ id: string }>();
  const incidentId = params.id ?? "";

  const incidentQuery = useIncident(incidentId);
  const addUpdateMutation = useAddIncidentUpdate();
  const updateIncidentMutation = useUpdateIncident();

  const form = useForm<IncidentUpdateValues>({
    resolver: zodResolver(incidentUpdateSchema),
    defaultValues: defaultUpdateValues(),
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
              <Button onClick={() => void resolveIncident()} variant="outline">
                <CheckCircle2 className="size-4" />
                Resolve incident
              </Button>
            ) : null}
            <Button asChild variant="ghost">
              <Link href="/dashboard/incidents">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
          </div>
        }
        description="Public timeline and internal updates for this incident."
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
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Incident not found.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Incident timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {incident.updates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No updates yet.</p>
                  ) : (
                    incident.updates
                      .slice()
                      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                      .map((update) => (
                        <article key={update.id} className="space-y-2 border-l-2 border-border pl-4">
                          <div className="flex items-center gap-2">
                            <IncidentStatusBadge status={update.status} />
                            <p className="text-xs text-muted-foreground">{formatRelative(update.created_at)}</p>
                          </div>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <Markdown remarkPlugins={[remarkGfm]}>{update.message}</Markdown>
                          </div>
                        </article>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add update</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form className="space-y-4" onSubmit={form.handleSubmit(addUpdate)}>
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="investigating">Investigating</SelectItem>
                                <SelectItem value="identified">Identified</SelectItem>
                                <SelectItem value="monitoring">Monitoring</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setPreview(false)}
                        size="sm"
                        type="button"
                        variant={!preview ? "default" : "outline"}
                      >
                        <PencilLine className="size-4" />
                        Write
                      </Button>
                      <Button
                        onClick={() => setPreview(true)}
                        size="sm"
                        type="button"
                        variant={preview ? "default" : "outline"}
                      >
                        <Eye className="size-4" />
                        Preview
                      </Button>
                    </div>

                    {preview ? (
                      <div className="prose prose-sm min-h-40 max-w-none rounded-md border p-3 dark:prose-invert">
                        <Markdown remarkPlugins={[remarkGfm]}>{updateMessagePreview || "Nothing to preview yet."}</Markdown>
                      </div>
                    ) : (
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                              <Textarea placeholder="We have identified the issue and are deploying a fix." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <Button disabled={addUpdateMutation.isPending} type="submit">
                      Publish update
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Incident details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <IncidentStatusBadge status={incident.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Impact</span>
                <ImpactBadge impact={incident.impact} />
              </div>
              <div>
                <p className="text-muted-foreground">Affected services</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {incident.services.length === 0
                    ? <span className="text-xs text-muted-foreground">None</span>
                    : incident.services.map((service) => (
                        <Badge key={service.id} className="bg-muted text-foreground">
                          {service.name}
                        </Badge>
                      ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
