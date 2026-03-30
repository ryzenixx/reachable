"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageMeta } from "@/components/app/page-meta";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardShellProvider } from "@/components/dashboard/shell-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBootstrapAuth, useLogin, useLogout, useMe } from "@/hooks/use-auth";
import { useOnboardingState } from "@/hooks/use-onboarding";
import { isApiError } from "@/lib/api";
import { toastApiError } from "@/lib/errors";
import { loginSchema, type LoginValues } from "@/schemas";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
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

  if (!isAuthBootstrapped || meQuery.isPending) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
        <PageMeta description="Loading your Reachable workspace dashboard." title="Dashboard | Reachable" />
        <Card className="w-full rounded-lg border-border/90">
          <CardHeader className="space-y-1 p-6">
            <CardTitle>Loading dashboard</CardTitle>
            <CardDescription>Preparing dashboard access...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-6 pt-0">
            <div className="h-9 rounded-md bg-muted" />
            <div className="h-9 rounded-md bg-muted" />
            <div className="h-9 rounded-md bg-muted" />
          </CardContent>
        </Card>
      </main>
    );
  }

  const currentUser = meQuery.data;

  if (onboardingStateQuery.data?.initialized === false) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
        <PageMeta description="Redirecting to setup." title="Redirecting | Reachable" />
        <Card className="w-full rounded-lg border-border/90">
          <CardHeader className="space-y-1 p-6">
            <CardTitle>Redirecting to setup</CardTitle>
            <CardDescription>No organization is configured yet.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Preparing setup...
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!currentUser?.id && onboardingStateQuery.isPending) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
        <PageMeta description="Checking instance setup." title="Loading | Reachable" />
        <Card className="w-full rounded-lg border-border/90">
          <CardHeader className="space-y-1 p-6">
            <CardTitle>Checking setup</CardTitle>
            <CardDescription>Preparing login access...</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading...
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!currentUser?.id) {
    return (
      <main className="min-h-screen bg-background">
        <PageMeta description="Sign in to manage services, incidents, monitors, and settings in Reachable." title="Sign In | Reachable" />
        <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-8">
          <Card className="w-full rounded-lg border-border/90">
            <CardHeader className="border-b p-6 pb-4">
              <CardTitle className="text-2xl tracking-tight">Sign in to Reachable</CardTitle>
              <CardDescription className="mt-1">Please sign in to continue.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Form {...loginForm}>
                <form
                  className="space-y-4"
                  onSubmit={loginForm.handleSubmit(async (values) => {
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
                  })}
                >
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input autoComplete="email" placeholder="you@company.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input autoComplete="current-password" placeholder="••••••••" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {loginSubmitError ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                      {loginSubmitError}
                    </div>
                  ) : null}

                  <Button className="w-full" disabled={loginMutation.isPending} type="submit">
                    {loginMutation.isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    );
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

  return (
    <DashboardShellProvider
      value={{
        openMobileSidebar: () => setIsMobileNavOpen(true),
      }}
    >
      <div className="flex min-h-screen bg-background">
        <PageMeta description="Manage your Reachable workspace and live service status." title="Dashboard | Reachable" />
        <div className="sticky top-0 hidden h-screen md:block">
          <DashboardSidebar
            isLoggingOut={logoutMutation.isPending}
            onLogout={() => {
              void handleLogout();
            }}
            organizationLogoUrl={currentUser.organization.logo_url}
            organizationName={currentUser.organization.name}
            userName={currentUser.name}
          />
        </div>

        <Sheet
          onOpenChange={(open) => {
            setIsMobileNavOpen(open);
          }}
          open={isMobileNavOpen}
        >
          <SheetContent className="p-0" side="left">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <DashboardSidebar
              isLoggingOut={logoutMutation.isPending}
              onNavigate={() => setIsMobileNavOpen(false)}
              onLogout={() => {
                void handleLogout();
              }}
              organizationLogoUrl={currentUser.organization.logo_url}
              organizationName={currentUser.organization.name}
              userName={currentUser.name}
            />
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1 px-4 py-6 md:p-8">{children}</main>
      </div>
    </DashboardShellProvider>
  );
}
