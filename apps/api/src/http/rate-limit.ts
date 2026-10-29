import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { Address6 } from "ip-address";
import { lt, sql } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { db } from "../db";
import { requestRateLimit } from "../db/schema/request-rate-limit";
import { clientIpHeader } from "./client-ip";

function clientKey(ip: string, scope: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  const address = isIP(ip) === 6 ? new Address6(`${ip}/64`).startAddress().correctForm() : ip;
  return createHmac("sha256", secret)
    .update(`request-rate-limit:${scope}:${address}`)
    .digest("hex");
}

export function publicRateLimitScope(path: string, method: string) {
  if (method === "OPTIONS") return undefined;
  if (method === "POST" && /^\/api\/public\/status-pages\/[^/]+\/subscriptions\/?$/.test(path))
    return "subscription";
  if (path.startsWith("/api/subscriptions/")) return "subscription-action";
  return undefined;
}

export const protectPublicRequests = createMiddleware(async (c, next) => {
  const scope = publicRateLimitScope(c.req.path, c.req.method);
  if (!scope) return next();
  const max = scope === "subscription" ? 30 : 120;
  const key = clientKey(c.req.header(clientIpHeader) ?? "unknown", scope);
  const [bucket] = await db
    .insert(requestRateLimit)
    .values({ key, count: 1, expiresAt: sql`statement_timestamp() + interval '60 seconds'` })
    .onConflictDoUpdate({
      target: requestRateLimit.key,
      set: {
        count: sql`case when ${requestRateLimit.expiresAt} <= statement_timestamp() then 1 else least(${requestRateLimit.count} + 1, ${max + 1}) end`,
        expiresAt: sql`case when ${requestRateLimit.expiresAt} <= statement_timestamp() then statement_timestamp() + interval '60 seconds' else ${requestRateLimit.expiresAt} end`,
      },
    })
    .returning({ count: requestRateLimit.count, expiresAt: requestRateLimit.expiresAt });
  if (bucket.count > max) {
    c.header(
      "Retry-After",
      String(Math.max(1, Math.ceil((bucket.expiresAt.getTime() - Date.now()) / 1000))),
    );
    c.header("Cache-Control", "no-store");
    return c.json({ error: "Too many requests" }, 429);
  }
  return next();
});

export async function pruneRequestRateLimits() {
  await db
    .delete(requestRateLimit)
    .where(lt(requestRateLimit.expiresAt, sql`now() - interval '1 minute'`));
}
