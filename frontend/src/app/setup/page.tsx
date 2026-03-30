"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { PageMeta } from "@/components/app/page-meta";
import { SetupBenefitsCard } from "@/features/onboarding/setup-benefits-card";
import { SetupErrorState } from "@/features/onboarding/setup-error-state";
import { SetupFormCard } from "@/features/onboarding/setup-form-card";
import { SetupLoadingState } from "@/features/onboarding/setup-loading-state";
import { passwordRuleChecks } from "@/features/onboarding/password-rules";
import { useBootstrapOnboarding, useOnboardingState } from "@/hooks/use-onboarding";
import { isApiError } from "@/lib/api";
import { getPasswordStrength } from "@/lib/password-strength";
import { onboardingSchema, type OnboardingValues } from "@/schemas";

const SETUP_DEFAULT_VALUES: OnboardingValues = {
  organization_name: "",
  owner_name: "",
  owner_email: "",
  owner_password: "",
  confirm_password: "",
  device_name: "dashboard",
};

export default function HomePage(): React.JSX.Element {
  const router = useRouter();

  const onboardingState = useOnboardingState();
  const bootstrapMutation = useBootstrapOnboarding();

  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
    defaultValues: SETUP_DEFAULT_VALUES,
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

  const passwordStrength = useMemo(() => getPasswordStrength(password ?? ""), [password]);
  const passwordChecks = useMemo(() => passwordRuleChecks(password ?? ""), [password]);

  async function submit(values: OnboardingValues): Promise<void> {
    setSubmissionError(null);

    try {
      await bootstrapMutation.mutateAsync(values);
      toast.success("Setup completed.");
      router.replace("/dashboard");
    } catch (error) {
      if (isApiError(error)) {
        for (const [field, messages] of Object.entries(error.fields)) {
          const [message] = messages;

          if (!message) {
            continue;
          }

          if (field in values) {
            form.setError(field as keyof OnboardingValues, { message });
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
  }

  if (onboardingState.isPending || onboardingState.data?.initialized) {
    return (
      <>
        <PageMeta description="Initializing Reachable setup." title="Reachable Onboarding" />
        <SetupLoadingState />
      </>
    );
  }

  if (onboardingState.isError) {
    return (
      <>
        <PageMeta description="Reachable could not connect to the API during onboarding." title="Onboarding Error | Reachable" />
        <SetupErrorState
          onRetry={() => {
            void onboardingState.refetch();
          }}
        />
      </>
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
          <SetupFormCard
            form={form}
            isSubmitting={bootstrapMutation.isPending}
            onSubmit={submit}
            passwordChecks={passwordChecks}
            passwordStrength={passwordStrength}
            submissionError={submissionError}
          />
          <SetupBenefitsCard />
        </div>
      </div>
    </main>
  );
}
