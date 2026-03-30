export type PasswordStrength = {
  score: number;
  label: "Very weak" | "Weak" | "Fair" | "Strong" | "Very strong";
  percentage: number;
};

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return {
      score: 0,
      label: "Very weak",
      percentage: 0,
    };
  }

  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score > 4) {
    score = 4;
  }

  const byScore: PasswordStrength["label"][] = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];

  return {
    score,
    label: byScore[score],
    percentage: Math.round((score / 4) * 100),
  };
}
