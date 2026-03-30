import type { PasswordStrength } from "@/lib/password-strength";

export type PasswordRuleCheck = {
  label: string;
  passed: boolean;
};

export function strengthColor(score: PasswordStrength["score"]): string {
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

export function passwordRuleChecks(password: string): PasswordRuleCheck[] {
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
