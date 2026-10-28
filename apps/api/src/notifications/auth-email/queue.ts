import { randomUUID } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "../../db";
import { verification } from "../../db/schema/auth";
import { authEmailDelivery } from "../../db/schema/auth-email-delivery";
import { encryptPayload } from "./encryption";

export type AuthEmail =
  | { kind: "verification"; userId: string; email: string; url: string; token: string }
  | { kind: "password_reset"; userId: string; email: string; url: string; token: string }
  | { kind: "invitation"; invitationId: string; organizationId: string; email: string; url: string; organizationName: string; inviterName: string; expiresAt: Date };

export async function queueAuthEmail(input: AuthEmail) {
  let expiresAt: Date;
  if (input.kind === "verification") {
    const payload = JSON.parse(Buffer.from(input.token.split(".")[1] ?? "", "base64url").toString("utf8"));
    if (!Number.isSafeInteger(payload.exp)) throw new Error("Invalid verification expiry");
    expiresAt = new Date(payload.exp * 1000);
  } else if (input.kind === "password_reset") {
    const [entry] = await db.select({ expiresAt: verification.expiresAt }).from(verification)
      .where(and(eq(verification.identifier, `reset-password:${input.token}`), eq(verification.value, input.userId), gt(verification.expiresAt, sql`now()`))).limit(1);
    if (!entry) throw new Error("Password reset token is unavailable");
    expiresAt = entry.expiresAt;
  } else {
    expiresAt = input.expiresAt;
  }
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) throw new Error("Auth email already expired");
  const id = randomUUID();
  await db.insert(authEmailDelivery).values({ id, kind: input.kind,
    subjectId: input.kind === "invitation" ? input.invitationId : input.userId,
    organizationId: input.kind === "invitation" ? input.organizationId : null,
    encryptedPayload: encryptPayload(input, id, input.kind), expiresAt });
}
