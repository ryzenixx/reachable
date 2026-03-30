import { Check, Loader2, Building2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { PasswordStrength } from "@/lib/password-strength";
import { cn } from "@/lib/utils";
import type { OnboardingValues } from "@/schemas";
import { FormSectionHeading } from "./form-section-heading";
import type { PasswordRuleCheck } from "./password-rules";
import { strengthColor } from "./password-rules";

type SetupFormCardProps = {
  form: UseFormReturn<OnboardingValues>;
  isSubmitting: boolean;
  onSubmit: (values: OnboardingValues) => Promise<void>;
  passwordChecks: PasswordRuleCheck[];
  passwordStrength: PasswordStrength;
  submissionError: string | null;
};

export function SetupFormCard({
  form,
  isSubmitting,
  onSubmit,
  passwordChecks,
  passwordStrength,
  submissionError,
}: SetupFormCardProps): React.JSX.Element {
  return (
    <Card className="rounded-lg border-border/90">
      <CardHeader className="border-b p-5 pb-4">
        <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Building2 className="size-4" />
          Initial configuration
        </div>
        <CardTitle className="text-xl tracking-tight">Set up your account</CardTitle>
        <CardDescription>Reachable will create your organization and administrator access immediately.</CardDescription>
      </CardHeader>

      <CardContent className="p-5 pt-4">
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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

            <Button className="h-10 w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? (
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
  );
}
