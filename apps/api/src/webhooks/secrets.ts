import { randomBytes } from "node:crypto";
import { encryptPayload, decryptPayload } from "../notifications/auth-email/encryption";

export function newWebhookSecret(subscriptionId: string) {
  const secret = `whsec_${randomBytes(32).toString("base64")}`;
  return { secret, encrypted: encryptPayload(secret, subscriptionId, "webhook-secret") };
}

export function readWebhookSecret(encrypted: string, subscriptionId: string) {
  const value = decryptPayload(encrypted, subscriptionId, "webhook-secret");
  if (typeof value !== "string" || !/^whsec_[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error("Invalid webhook secret");
  return value;
}
