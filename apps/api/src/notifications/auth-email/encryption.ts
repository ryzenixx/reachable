import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

function key(secret: string) {
  return Buffer.from(hkdfSync("sha256", secret, "reachable-auth-email", "queue-payload-v1", 32));
}

function keys() {
  const configured = process.env.REACHABLE_ENCRYPTION_SECRETS;
  const secrets = configured ? configured.split(",").map((value) => value.trim()) : [];
  const legacy = process.env.BETTER_AUTH_SECRET;
  if (legacy) secrets.push(legacy);
  const uniqueSecrets = [...new Set(secrets)];
  if (
    uniqueSecrets.length === 0 ||
    uniqueSecrets.length > 16 ||
    uniqueSecrets.some((secret) => secret.length < 32)
  ) {
    throw new Error("Encryption secrets must contain 1 to 16 secrets of at least 32 characters");
  }
  return uniqueSecrets.map(key);
}

export function encryptPayload(value: unknown, id: string, kind: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keys()[0], iv);
  cipher.setAAD(Buffer.from(`${id}:${kind}`));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

export function decryptPayload(value: string, id: string, kind: string): unknown {
  const data = Buffer.from(value, "base64url");
  if (data.length < 29) throw new Error("Invalid encrypted payload");
  for (const candidate of keys()) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", candidate, data.subarray(0, 12));
      decipher.setAAD(Buffer.from(`${id}:${kind}`));
      decipher.setAuthTag(data.subarray(12, 28));
      return JSON.parse(
        Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8"),
      );
    } catch {
      continue;
    }
  }
  throw new Error("Unable to decrypt payload with the configured secrets");
}
