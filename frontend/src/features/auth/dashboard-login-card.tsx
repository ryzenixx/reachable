import { Loader2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { LoginValues } from "@/schemas";

type DashboardLoginCardProps = {
  form: UseFormReturn<LoginValues>;
  isSubmitting: boolean;
  onSubmit: (values: LoginValues) => Promise<void>;
  submitError: string | null;
};

export function DashboardLoginCard({
  form,
  isSubmitting,
  onSubmit,
  submitError,
}: DashboardLoginCardProps): React.JSX.Element {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-8">
        <Card className="w-full rounded-lg border-border/90">
          <CardHeader className="border-b p-6 pb-4">
            <CardTitle className="text-2xl tracking-tight">Sign in to Reachable</CardTitle>
            <CardDescription className="mt-1">Please sign in to continue.</CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
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
                  control={form.control}
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

                {submitError ? (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                    {submitError}
                  </div>
                ) : null}

                <Button className="w-full" disabled={isSubmitting} type="submit">
                  {isSubmitting ? (
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
