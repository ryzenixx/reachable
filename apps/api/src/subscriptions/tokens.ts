import { createHash } from "node:crypto";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenUrl(purpose: "confirm" | "unsubscribe" | "manage", token: string) {
  const base = process.env.BETTER_AUTH_URL;
  if (!base) throw new Error("BETTER_AUTH_URL is required for subscription links");
  const url = new URL(base);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Invalid BETTER_AUTH_URL");
  return new URL(`/api/subscriptions/${purpose}/${token}`, url).toString();
}
