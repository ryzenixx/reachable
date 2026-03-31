"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardShellProvider } from "@/components/dashboard/shell-context";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AuthStateCard } from "@/features/auth/auth-state-card";
import { DashboardLoginCard } from "@/features/auth/dashboard-login-card";
import { useBootstrapAuth, useLogin, useLogout, useMe } from "@/hooks/use-auth";
import { useOnboardingState } from "@/hooks/use-onboarding";
import { isApiError } from "@/lib/api";
import { toastApiError } from "@/lib/errors";
import { loginSchema, type LoginValues } from "@/schemas";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps): React.JSX.Element {
  const router = useRouter();
  const isAuthBootstrapped = useBootstrapAuth();

  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const meQuery = useMe(isAuthBootstrapped);
  const onboardingStateQuery = useOnboardingState(isAuthBootstrapped);

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [loginSubmitError, setLoginSubmitError] = useState<string | null>(null);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      device_name: "dashboard",
    },
  });

  useEffect(() => {
    if (onboardingStateQuery.data?.initialized !== false) {
      return;
    }

    router.replace("/setup");
  }, [onboardingStateQuery.data?.initialized, router]);

  async function submitLogin(values: LoginValues): Promise<void> {
    setLoginSubmitError(null);
    loginForm.clearErrors(["email", "password"]);

    try {
      await loginMutation.mutateAsync(values);
      toast.success("Signed in.");
    } catch (error) {
      if (isApiError(error)) {
        if (error.status === 422) {
          const emailError = error.firstFieldError("email");
          const passwordError = error.firstFieldError("password");

          if (emailError) {
            loginForm.setError("email", { message: emailError });
          }

          if (passwordError) {
            loginForm.setError("password", { message: passwordError });
          }
        }

        const message = error.message || "Unable to sign in.";
        setLoginSubmitError(message);
        toast.error(message);
        return;
      }

      setLoginSubmitError("Unable to sign in.");
      toastApiError(error, "Unable to sign in.");
    }
  }

  function handleLogout(): void {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Signed out.");
      },
      onError: () => {
        toast.success("Signed out.");
      },
    });
  }

  if (!isAuthBootstrapped || meQuery.isPending) {
    return (
      <>
        <PageMeta description="Loading your Reachable workspace dashboard." title="Dashboard | Reachable" />
        <AuthStateCard description="Preparing dashboard access..." showSkeleton title="Loading dashboard" />
      </>
    );
  }

  if (onboardingStateQuery.data?.initialized === false) {
    return (
      <>
        <PageMeta description="Redirecting to setup." title="Redirecting | Reachable" />
        <AuthStateCard description="No organization is configured yet." loadingLabel="Preparing setup..." title="Redirecting to setup" />
      </>
    );
  }

  const currentUser = meQuery.data;

  if (!currentUser?.id && onboardingStateQuery.isPending) {
    return (
      <>
        <PageMeta description="Checking instance setup." title="Loading | Reachable" />
        <AuthStateCard description="Preparing login access..." loadingLabel="Loading..." title="Checking setup" />
      </>
    );
  }

  if (!currentUser?.id) {
    return (
      <>
        <PageMeta
          description="Sign in to manage services, incidents, monitors, and settings in Reachable."
          title="Sign In | Reachable"
        />
        <DashboardLoginCard
          form={loginForm}
          isSubmitting={loginMutation.isPending}
          onSubmit={submitLogin}
          submitError={loginSubmitError}
        />
      </>
    );
  }

  return (
    <DashboardShellProvider
      value={{
        openMobileSidebar: () => setIsMobileNavOpen(true),
      }}
    >
      <div className="flex min-h-screen bg-white">
        <PageMeta description="Manage your Reachable workspace and live service status." title="Dashboard | Reachable" />

        <div className="sticky top-0 hidden h-screen border-r border-neutral-200/60 md:block">
          <DashboardSidebar
            isLoggingOut={logoutMutation.isPending}
            onLogout={() => {
              handleLogout();
            }}
            organizationLogoUrl={currentUser.organization.logo_url}
            organizationName={currentUser.organization.name}
            userName={currentUser.name}
          />
        </div>

        <Sheet onOpenChange={setIsMobileNavOpen} open={isMobileNavOpen}>
          <SheetContent className="p-0" side="left">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <DashboardSidebar
              isLoggingOut={logoutMutation.isPending}
              onNavigate={() => setIsMobileNavOpen(false)}
              onLogout={() => {
                handleLogout();
              }}
              organizationLogoUrl={currentUser.organization.logo_url}
              organizationName={currentUser.organization.name}
              userName={currentUser.name}
            />
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1 px-8 py-8 md:px-12 md:py-10">{children}</main>
      </div>
    </DashboardShellProvider>
  );
}
