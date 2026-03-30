import type { UseFormReturn } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { IncidentValues } from "@/schemas";
import type { Service } from "@/types/api";

type IncidentFormSheetProps = {
  form: UseFormReturn<IncidentValues>;
  isOpen: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: IncidentValues) => Promise<void>;
  services: Service[];
};

export function IncidentFormSheet({
  form,
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
  services,
}: IncidentFormSheetProps): React.JSX.Element {
  return (
    <Sheet onOpenChange={onOpenChange} open={isOpen}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Create incident</SheetTitle>
          <SheetDescription>Publish a new incident and link impacted services.</SheetDescription>
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
                    <Textarea
                      placeholder="We are currently investigating elevated error rates..."
                      {...field}
                      value={field.value ?? ""}
                    />
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
              <Button disabled={isSubmitting} type="submit">
                Create incident
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
