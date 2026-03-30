"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/app/empty-state";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { useDashboardShell } from "@/components/dashboard/shell-context";
import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import {
  useCreateSubscriber,
  useDeleteSubscriber,
  useExportSubscribers,
  useSubscribers,
} from "@/hooks/use-dashboard";
import { formatRelative } from "@/lib/dates";
import { toastApiError } from "@/lib/errors";
import { subscriberSchema, type SubscriberValues } from "@/schemas";
import type { Subscriber } from "@/types/api";

function defaultValues(): SubscriberValues {
  return {
    email: "",
  };
}

export default function SubscribersPage(): React.JSX.Element {
  const { openMobileSidebar } = useDashboardShell();

  const subscribersQuery = useSubscribers();

  const createSubscriberMutation = useCreateSubscriber();
  const deleteSubscriberMutation = useDeleteSubscriber();
  const exportSubscribersMutation = useExportSubscribers();

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const form = useForm<SubscriberValues>({
    resolver: zodResolver(subscriberSchema),
    defaultValues: defaultValues(),
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
      form.reset(defaultValues());
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
      <PageMeta
        description="Manage subscriber recipients and export notification lists as CSV."
        title="Subscribers | Reachable"
      />
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Confirmed</TableHead>
              <TableHead>Subscribed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.map((subscriber) => (
              <TableRow key={subscriber.id}>
                <TableCell className="text-sm font-medium">{subscriber.email}</TableCell>
                <TableCell>
                  <Badge className={subscriber.confirmed_at ? "bg-green-500/15 text-green-700 dark:text-green-300" : "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300"}>
                    {subscriber.confirmed_at ? "Confirmed" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatRelative(subscriber.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="size-4" />
                          Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove subscriber</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes {subscriber.email} from future notifications.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
                          <AlertDialogActionButton onClick={() => void deleteSubscriber(subscriber)}>
                            Remove subscriber
                          </AlertDialogActionButton>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
            <SheetTitle>Add subscriber</SheetTitle>
            <SheetDescription>Invite an email to receive status updates.</SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@company.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetFooter>
                <Button disabled={createSubscriberMutation.isPending} type="submit">
                  Add subscriber
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
