"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useSubscribe } from "@/hooks/use-public-status";
import { toastApiError } from "@/lib/errors";
import { subscriberSchema, type SubscriberValues } from "@/schemas";

export function SubscribeDialog(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const subscribeMutation = useSubscribe();

  const form = useForm<SubscriberValues>({
    resolver: zodResolver(subscriberSchema),
    defaultValues: {
      email: "",
    },
  });

  return (
    <Dialog
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setSubmitted(false);
          form.reset();
        }
      }}
      open={isOpen}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Subscribe to updates
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subscribe To Updates</DialogTitle>
          <DialogDescription>Get incident and maintenance notifications by email.</DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-3 rounded-lg border bg-muted/50 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
              Confirmation sent
            </div>
            <p className="text-muted-foreground">Check your inbox and click the confirmation link to finish subscribing.</p>
            <Button
              className="w-full"
              onClick={() => {
                setIsOpen(false);
              }}
              variant="outline"
            >
              Close
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(async (values) => {
                try {
                  await subscribeMutation.mutateAsync(values.email);
                  toast.success("Confirmation email sent.");
                  setSubmitted(true);
                } catch (error) {
                  toastApiError(error, "Unable to subscribe right now.");
                }
              })}
            >
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

              <Button className="w-full" disabled={subscribeMutation.isPending} type="submit">
                {subscribeMutation.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Send confirmation email"
                )}
              </Button>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
