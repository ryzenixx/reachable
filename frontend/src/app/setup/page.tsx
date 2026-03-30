"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BellRing,
  Building2,
  Check,
  Globe,
  Loader2,
  Siren,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { PageMeta } from "@/components/app/page-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBootstrapOnboarding, useOnboardingState } from "@/hooks/use-onboarding";
import { isApiError } from "@/lib/api";
import { getPasswordStrength } from "@/lib/password-strength";
import { cn } from "@/lib/utils";
import { onboardingSchema, type OnboardingValues } from "@/schemas";

function strengthColor(score: number): string {
  if (score <= 0) {
    return "bg-muted";
  }

  if (score === 1) {
    return "bg-red-500";
  }

  if (score === 2) {
    return "bg-yellow-500";
  }

  if (score === 3) {
    return "bg-lime-500";
  }

  return "bg-emerald-500";
}

function passwordRuleChecks(password: string): Array<{ label: string; passed: boolean }> {
  return [
    {
      label: "8+ characters",
      passed: password.length >= 8,
    },
    {
      label: "Upper and lowercase letters",
      passed: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    {
      label: "At least one number",
      passed: /\d/.test(password),
    },
    {
      label: "At least one symbol",
      passed: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

function FormSectionHeading({ children }: { children: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</p>
      <span className="h-px flex-1 bg-border/80" />
    </div>
  );
}

export default function HomePage(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();

  const onboardingState = useOnboardingState();
  const bootstrapMutation = useBootstrapOnboarding();

  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
    defaultValues: {
      organization_name: "",
      owner_name: "",
      owner_email: "",
      owner_password: "",
      confirm_password: "",
      device_name: "dashboard",
    },
  });

  const password = useWatch({
    control: form.control,
    name: "owner_password",
  });

  useEffect(() => {
    if (onboardingState.data?.initialized) {
      router.replace("/dashboard");
    }
  }, [onboardingState.data?.initialized, router]);

  useEffect(() => {
    if (!bootstrapMutation.isSuccess) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    router.replace("/dashboard");
  }, [bootstrapMutation.isSuccess, queryClient, router]);

  const passwordStrength = useMemo(() => getPasswordStrength(password ?? ""), [password]);
  const passwordChecks = useMemo(() => passwordRuleChecks(password ?? ""), [password]);

  if (onboardingState.isPending || onboardingState.data?.initialized) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
        <PageMeta description="Initializing Reachable setup." title="Reachable Onboarding" />
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-lg">
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-8 w-72" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (onboardingState.isError) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-10">
        <PageMeta description="Reachable could not connect to the API during onboarding." title="Onboarding Error | Reachable" />
        <Card className="w-full rounded-lg">
          <CardHeader className="space-y-2">
            <CardTitle>Unable to load onboarding</CardTitle>
            <CardDescription>Reachable could not connect to the API. Check your stack and try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                void onboardingState.refetch();
              }}
              variant="outline"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <PageMeta
        description="Set up Reachable and your owner account to start publishing service status, incidents, and maintenance updates."
        title="Workspace Setup | Reachable"
      />
      <div className="mx-auto w-full max-w-6xl px-6 py-6 lg:py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Create your{" "}
            <span
              className="text-foreground"
              style={{ textShadow: "0 0 18px color-mix(in oklab, currentColor 28%, transparent)" }}
            >
              Reachable
            </span>{" "}
            workspace
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Configure your organization and owner account to start monitoring services and publishing live status updates.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch">
          <Card className="rounded-lg border-border/90">
            <CardHeader className="border-b p-5 pb-4">
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="size-4" />
                Initial configuration
              </div>
              <CardTitle className="text-xl tracking-tight">Set up your account</CardTitle>
              <CardDescription>
                Reachable will create your organization and administrator access immediately.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-4">
              <Form {...form}>
                <form
                  className="space-y-4"
                  onSubmit={form.handleSubmit(async (values) => {
                    setSubmissionError(null);

                    try {
                      await bootstrapMutation.mutateAsync(values);
                      toast.success("Setup completed.");
                    } catch (error) {
                      if (isApiError(error)) {
                        for (const [field, messages] of Object.entries(error.fields)) {
                          const [message] = messages;
                          if (!message) {
                            continue;
                          }

                          if (field in values) {
                            form.setError(field as keyof OnboardingValues, {
                              message,
                            });
                          }
                        }

                        const message = error.message || "Unable to complete setup.";
                        setSubmissionError(message);
                        toast.error(message);
                        return;
                      }

                      setSubmissionError("Unable to complete setup.");
                      toast.error("Unable to complete setup.");
                    }
                  })}
                >
                  <section className="space-y-3.5">
                    <FormSectionHeading>Organization details</FormSectionHeading>
                    <FormField
                      control={form.control}
                      name="organization_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization name</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </section>

                  <section className="space-y-3.5">
                    <FormSectionHeading>Administrator details</FormSectionHeading>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="owner_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Owner name</FormLabel>
                            <FormControl>
                              <Input placeholder="Jane Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="owner_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Owner email</FormLabel>
                            <FormControl>
                              <Input placeholder="jane@acme.com" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="owner_password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input placeholder="••••••••" type="password" {...field} />
                            </FormControl>
                            <div className="space-y-1.5">
                              <div className="grid grid-cols-4 gap-1">
                                {Array.from({ length: 4 }).map((_, index) => (
                                  <span
                                    key={`strength-segment-${index}`}
                                    className={cn(
                                      "h-1.5 rounded-full transition-colors",
                                      index < passwordStrength.score ? strengthColor(passwordStrength.score) : "bg-muted",
                                    )}
                                  />
                                ))}
                              </div>
                              <p className="text-[11px] font-medium text-muted-foreground">
                                Strength: <span className="text-foreground">{passwordStrength.label}</span>
                              </p>
                              <div className="grid grid-cols-1 gap-y-1 text-[11px] text-muted-foreground">
                                {passwordChecks.map((check) => (
                                  <span
                                    key={check.label}
                                    className={cn(
                                      "inline-flex items-center gap-1.5",
                                      check.passed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                                    )}
                                  >
                                    <Check className={cn("size-3", check.passed ? "opacity-100" : "opacity-35")} />
                                    {check.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirm_password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm password</FormLabel>
                            <FormControl>
                              <Input placeholder="••••••••" type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </section>

                  {submissionError ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                      {submissionError}
                    </div>
                  ) : null}

                  <Button className="h-10 w-full" disabled={bootstrapMutation.isPending} type="submit">
                    {bootstrapMutation.isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Completing setup...
                      </span>
                    ) : (
                      "Complete setup"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="hidden h-full rounded-lg border-border/90 lg:block">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base">Included from day one</CardTitle>
              <CardDescription>Everything required to run a professional status page from your first login.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0">
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-1 inline-flex items-center gap-2 text-sm font-semibold">
                  <Globe className="size-4 text-muted-foreground" />
                  Public status page
                </div>
                <p className="text-xs text-muted-foreground">Live service status, uptime bars, incident history, and subscribe flow.</p>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-1 inline-flex items-center gap-2 text-sm font-semibold">
                  <Siren className="size-4 text-muted-foreground" />
                  Incident workflow
                </div>
                <p className="text-xs text-muted-foreground">Create incidents, publish updates, and resolve with clear timeline history.</p>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-1 inline-flex items-center gap-2 text-sm font-semibold">
                  <BellRing className="size-4 text-muted-foreground" />
                  Email subscriptions
                </div>
                <p className="text-xs text-muted-foreground">Confirmation and incident notifications delivered through your SMTP settings.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
