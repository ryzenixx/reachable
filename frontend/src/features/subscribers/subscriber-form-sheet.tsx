import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { SubscriberValues } from "@/schemas";

type SubscriberFormSheetProps = {
  form: UseFormReturn<SubscriberValues>;
  isOpen: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SubscriberValues) => Promise<void>;
};

export function SubscriberFormSheet({
  form,
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: SubscriberFormSheetProps): React.JSX.Element {
  return (
    <Sheet onOpenChange={onOpenChange} open={isOpen}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Add subscriber</SheetTitle>
          <SheetDescription>Invite an email to receive status updates.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
              <Button disabled={isSubmitting} type="submit">
                Add subscriber
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
