"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/empty-state";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
import { ImpactBadge } from "@/components/status/impact-badge";
import { IncidentStatusBadge } from "@/components/status/incident-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCreateIncident, useIncidents, useServices, useUpdateIncident } from "@/hooks/use-dashboard";
import { formatRelative } from "@/lib/dates";
import { toastApiError } from "@/lib/errors";
import { incidentSchema, type IncidentValues } from "@/schemas";

function defaultValues(): IncidentValues {
  return {
    title: "",
    status: "investigating",
    impact: "major",
    message: "",
    service_ids: [],
  };
}

export default function IncidentsPage(): React.JSX.Element {
  const { openMobileSidebar } = useDashboardShell();

  const incidentsQuery = useIncidents();
  const servicesQuery = useServices();

  const createIncidentMutation = useCreateIncident();
  const updateIncidentMutation = useUpdateIncident();

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const form = useForm<IncidentValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: defaultValues(),
  });

  const services = servicesQuery.data ?? [];
  const incidents = incidentsQuery.data ?? [];

  async function submit(values: IncidentValues): Promise<void> {
    try {
      await createIncidentMutation.mutateAsync(values);
      toast.success("Incident created.");
      setIsSheetOpen(false);
      form.reset(defaultValues());
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
          <Button onClick={() => setIsSheetOpen(true)}>
            <Plus className="size-4" />
            Create incident
          </Button>
        }
        description="Track incident lifecycle, affected services, and public updates."
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Impact</TableHead>
              <TableHead>Affected services</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Resolved</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((incident) => (
              <TableRow key={incident.id}>
                <TableCell>
                  <Link className="font-medium hover:underline" href={`/dashboard/incidents/${incident.id}`}>
                    {incident.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <IncidentStatusBadge status={incident.status} />
                </TableCell>
                <TableCell>
                  <ImpactBadge impact={incident.impact} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {incident.services.length === 0
                      ? <span className="text-xs text-muted-foreground">None</span>
                      : incident.services.map((service) => (
                          <Badge key={service.id} className="bg-muted text-foreground">
                            {service.name}
                          </Badge>
                        ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatRelative(incident.created_at)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {incident.resolved_at ? formatRelative(incident.resolved_at) : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {incident.status !== "resolved" ? (
                      <Button onClick={() => void resolveIncident(incident.id)} size="sm" variant="outline">
                        Resolve
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/dashboard/incidents/${incident.id}`}>View</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Sheet
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            form.reset(defaultValues());
          }
        }}
        open={isSheetOpen}
      >
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Create incident</SheetTitle>
            <SheetDescription>Publish a new incident and link impacted services.</SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="API latency spike in eu-west" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
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

                <FormField
                  control={form.control}
                  name="impact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impact</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Impact" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="minor">Minor</SelectItem>
                            <SelectItem value="major">Major</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial update (markdown supported)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="We are currently investigating elevated error rates..." {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Affected services</FormLabel>
                    <div className="space-y-2 rounded-md border p-3">
                      {services.map((service) => {
                        const checked = field.value.includes(service.id);

                        return (
                          <label key={service.id} className="flex items-center gap-2 text-sm">
                            <input
                              checked={checked}
                              className="size-4 rounded border"
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...field.value, service.id]
                                  : field.value.filter((id) => id !== service.id);

                                field.onChange(next);
                              }}
                              type="checkbox"
                            />
                            <span>{service.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter>
                <Button disabled={createIncidentMutation.isPending} type="submit">
                  Create incident
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
