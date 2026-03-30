import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { MaintenanceValues } from "@/schemas";
import type { Maintenance } from "@/types/api";

type MaintenanceFormSheetProps = {
  editingMaintenance: Maintenance | null;
  form: UseFormReturn<MaintenanceValues>;
  isOpen: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MaintenanceValues) => Promise<void>;
};

export function MaintenanceFormSheet({
  editingMaintenance,
  form,
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: MaintenanceFormSheetProps): React.JSX.Element {
  return (
    <Sheet onOpenChange={onOpenChange} open={isOpen}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{editingMaintenance ? "Edit maintenance" : "Schedule maintenance"}</SheetTitle>
          <SheetDescription>Define your maintenance timeline and public communication details.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Database failover rehearsal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Expected impact and mitigation details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scheduled_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled at</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ended_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ended at (optional)</FormLabel>
                  <FormControl>
                    <Input
                      onChange={(event) => field.onChange(event.target.value || null)}
                      type="datetime-local"
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter>
              <Button disabled={isSubmitting} type="submit">
                {editingMaintenance ? "Save changes" : "Schedule maintenance"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
