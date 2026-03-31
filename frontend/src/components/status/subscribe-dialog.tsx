"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import HCaptcha from "@hcaptcha/react-hcaptcha";
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

type SubscribeDialogProps = {
  isEnabled?: boolean;
  hcaptchaSitekey?: string | null;
};

export function SubscribeDialog({ isEnabled = true, hcaptchaSitekey }: SubscribeDialogProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);

  const subscribeMutation = useSubscribe();
  const requiresCaptcha = Boolean(hcaptchaSitekey);

  const form = useForm<SubscriberValues>({
    resolver: zodResolver(subscriberSchema),
    defaultValues: {
      email: "",
    },
  });

  async function handleSubmit(values: SubscriberValues): Promise<void> {
    if (requiresCaptcha && !captchaToken) {
      toast.error("Please complete the captcha.");
      return;
    }

    try {
      await subscribeMutation.mutateAsync({
        email: values.email,
        captchaToken: captchaToken ?? undefined,
      });
      toast.success("Confirmation email sent.");
      setSubmitted(true);
    } catch (error) {
      setCaptchaToken(null);
      setCaptchaKey((k) => k + 1);
      toastApiError(error, "Unable to subscribe right now.");
    }
  }

  if (!isEnabled) {
    return (
      <Button
        onClick={() => {
          toast.info("Email updates are not enabled for this status page.");
        }}
        size="sm"
        variant="outline"
      >
        Subscribe to updates
      </Button>
    );
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setSubmitted(false);
          setCaptchaToken(null);
          setCaptchaKey((k) => k + 1);
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
          <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-neutral-900">
              <CheckCircle2 className="size-4 text-green-600" />
              Confirmation sent
            </div>
            <p className="text-neutral-500">Check your inbox and click the confirmation link to finish subscribing.</p>
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
              onSubmit={form.handleSubmit(handleSubmit)}
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

              {requiresCaptcha && hcaptchaSitekey ? (
                <HCaptcha
                  key={captchaKey}
                  sitekey={hcaptchaSitekey}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                />
              ) : null}

              <Button className="w-full" disabled={subscribeMutation.isPending || (requiresCaptcha && !captchaToken)} type="submit">
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
