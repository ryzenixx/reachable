"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/empty-state";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SUBSCRIBER_DEFAULT_VALUES } from "@/features/subscribers/constants";
import { SubscriberFormSheet } from "@/features/subscribers/subscriber-form-sheet";
import { SubscribersTable } from "@/features/subscribers/subscribers-table";
import { useCreateSubscriber, useDeleteSubscriber, useExportSubscribers, useSubscribers } from "@/hooks/use-dashboard";
import { toastApiError } from "@/lib/errors";
import { subscriberSchema, type SubscriberValues } from "@/schemas";
import type { Subscriber } from "@/types/api";

export default function SubscribersPage(): React.JSX.Element {
  const { openMobileSidebar } = useDashboardShell();

  const subscribersQuery = useSubscribers();

  const createSubscriberMutation = useCreateSubscriber();
  const deleteSubscriberMutation = useDeleteSubscriber();
  const exportSubscribersMutation = useExportSubscribers();

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const form = useForm<SubscriberValues>({
    resolver: zodResolver(subscriberSchema),
    defaultValues: SUBSCRIBER_DEFAULT_VALUES,
  });

  const subscribers = subscribersQuery.data ?? [];

  async function exportCsv(): Promise<void> {
    try {
      const blob = await exportSubscribersMutation.mutateAsync();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "subscribers.csv";

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("CSV exported.");
    } catch (error) {
      toastApiError(error, "Unable to export CSV.");
    }
  }

  async function submit(values: SubscriberValues): Promise<void> {
    try {
      await createSubscriberMutation.mutateAsync(values.email);
      toast.success("Subscriber added.");
      setIsSheetOpen(false);
      form.reset(SUBSCRIBER_DEFAULT_VALUES);
    } catch (error) {
      toastApiError(error, "Unable to add subscriber.");
    }
  }

  async function deleteSubscriber(subscriber: Subscriber): Promise<void> {
    try {
      await deleteSubscriberMutation.mutateAsync(subscriber.id);
      toast.success("Subscriber removed.");
    } catch (error) {
      toastApiError(error, "Unable to remove subscriber.");
    }
  }

  return (
    <div>
      <PageMeta description="Manage subscriber recipients and export notification lists as CSV." title="Subscribers | Reachable" />
      <DashboardPageHeader
        action={
          <div className="flex items-center gap-2">
            <Button onClick={exportCsv} variant="outline">
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button onClick={() => setIsSheetOpen(true)}>
              <Plus className="size-4" />
              Add subscriber
            </Button>
          </div>
        }
        description="Manage subscribers and export your confirmed recipients."
        onOpenMobileSidebar={openMobileSidebar}
        title="Subscribers"
      />

      {subscribersQuery.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : subscribers.length === 0 ? (
        <EmptyState
          actionLabel="Add your first subscriber"
          description="Subscribers receive incident and maintenance emails after confirmation."
          icon={Plus}
          onAction={() => setIsSheetOpen(true)}
          title="No subscribers yet"
        />
      ) : (
        <SubscribersTable onDeleteSubscriber={deleteSubscriber} subscribers={subscribers} />
      )}

      <SubscriberFormSheet
        form={form}
        isOpen={isSheetOpen}
        isSubmitting={createSubscriberMutation.isPending}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            form.reset(SUBSCRIBER_DEFAULT_VALUES);
          }
        }}
        onSubmit={submit}
      />
    </div>
  );
}
