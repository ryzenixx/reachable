import { and, asc, eq, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import { invitation, user, verification } from "../../db/schema/auth";
import { authEmailDelivery } from "../../db/schema/auth-email-delivery";
import {
  sendOrganizationInvitation,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../email/messages";
import { decryptPayload } from "./encryption";
import { withLeaseRenewal } from "../lease";

const payloadSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("verification"),
    userId: z.string(),
    email: z.email(),
    url: z.url(),
    token: z.string(),
  }),
  z.strictObject({
    kind: z.literal("password_reset"),
    userId: z.string(),
    email: z.email(),
    url: z.url(),
    token: z.string(),
  }),
  z.strictObject({
    kind: z.literal("invitation"),
    invitationId: z.string(),
    organizationId: z.string(),
    email: z.email(),
    url: z.url(),
    organizationName: z.string(),
    inviterName: z.string(),
    expiresAt: z.iso.datetime(),
  }),
]);

export async function processAuthEmailDelivery() {
  const prepared = await db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(authEmailDelivery)
      .where(
        and(
          eq(authEmailDelivery.status, "pending"),
          lte(authEmailDelivery.nextAttemptAt, sql`now()`),
        ),
      )
      .orderBy(asc(authEmailDelivery.nextAttemptAt), asc(authEmailDelivery.id))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!job) return false;
    const finish = async (status: "failed" | "skipped", reason: string) => {
      await tx
        .update(authEmailDelivery)
        .set({ status, reason, encryptedPayload: null, processedAt: sql`clock_timestamp()` })
        .where(eq(authEmailDelivery.id, job.id));
    };
    const postpone = async () => {
      await tx
        .update(authEmailDelivery)
        .set({ nextAttemptAt: sql`now() + interval '10 seconds'` })
        .where(eq(authEmailDelivery.id, job.id));
    };
    if (job.expiresAt <= new Date()) {
      await finish("failed", "expired");
      return true;
    }
    let input: z.infer<typeof payloadSchema>;
    try {
      input = payloadSchema.parse(decryptPayload(job.encryptedPayload!, job.id, job.kind));
      if (
        input.kind !== job.kind ||
        (input.kind === "invitation"
          ? input.invitationId !== job.subjectId || input.organizationId !== job.organizationId
          : input.userId !== job.subjectId)
      )
        throw new Error("Invalid subject");
    } catch {
      const attempts = job.attempts + 1;
      if (attempts >= 8)
        await tx
          .update(authEmailDelivery)
          .set({
            status: "failed",
            reason: "payload_unavailable",
            attempts,
            encryptedPayload: null,
            processedAt: sql`clock_timestamp()`,
          })
          .where(eq(authEmailDelivery.id, job.id));
      else
        await tx
          .update(authEmailDelivery)
          .set({
            reason: "payload_unavailable",
            attempts,
            nextAttemptAt: sql`now() + ${Math.min(60 * 2 ** (attempts - 1), 3600)} * interval '1 second'`,
          })
          .where(eq(authEmailDelivery.id, job.id));
      console.error(`Auth email delivery ${job.id} could not be decrypted`);
      return true;
    }
    if (input.kind === "invitation") {
      const [current] = await tx
        .select()
        .from(invitation)
        .where(eq(invitation.id, input.invitationId))
        .for("share", { skipLocked: true });
      if (!current) {
        const [exists] = await tx
          .select({ id: invitation.id })
          .from(invitation)
          .where(eq(invitation.id, input.invitationId));
        if (exists || job.createdAt.getTime() > Date.now() - 60_000) {
          await postpone();
          return true;
        }
        await finish("skipped", "unavailable");
        return true;
      }
      if (
        current.organizationId !== input.organizationId ||
        current.email.toLowerCase() !== input.email.toLowerCase() ||
        current.status !== "pending" ||
        current.expiresAt <= new Date()
      ) {
        await finish("skipped", "unavailable");
        return true;
      }
    } else {
      const [current] = await tx
        .select()
        .from(user)
        .where(eq(user.id, input.userId))
        .for("share", { skipLocked: true });
      if (!current) {
        const [exists] = await tx
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, input.userId));
        if (exists || job.createdAt.getTime() > Date.now() - 60_000) {
          await postpone();
          return true;
        }
        await finish("skipped", "unavailable");
        return true;
      }
      if (
        current.email.toLowerCase() !== input.email.toLowerCase() ||
        (input.kind === "verification" && current.emailVerified)
      ) {
        await finish("skipped", "unavailable");
        return true;
      }
      if (input.kind === "password_reset") {
        const identifier = `reset-password:${input.token}`;
        const [token] = await tx
          .select()
          .from(verification)
          .where(and(eq(verification.identifier, identifier), eq(verification.value, input.userId)))
          .for("share", { skipLocked: true });
        if (!token) {
          const [exists] = await tx
            .select({ id: verification.id })
            .from(verification)
            .where(
              and(eq(verification.identifier, identifier), eq(verification.value, input.userId)),
            );
          if (exists) {
            await postpone();
            return true;
          }
          await finish("skipped", "unavailable");
          return true;
        }
        if (token.expiresAt <= new Date()) {
          await finish("failed", "expired");
          return true;
        }
      }
    }
    const [lease] = await tx
      .update(authEmailDelivery)
      .set({
        nextAttemptAt: sql`date_trunc('milliseconds', clock_timestamp()) + interval '5 minutes'`,
      })
      .where(eq(authEmailDelivery.id, job.id))
      .returning({ until: authEmailDelivery.nextAttemptAt });
    return { job, input, until: lease.until };
  });
  if (typeof prepared === "boolean") return prepared;
  const { job, input, until } = prepared;
  const attempts = job.attempts + 1;
  const { lease, outcome } = await withLeaseRenewal(
    until,
    async (previousLease) => {
      const [renewed] = await db
        .update(authEmailDelivery)
        .set({
          nextAttemptAt: sql`date_trunc('milliseconds', clock_timestamp()) + interval '5 minutes'`,
        })
        .where(
          and(
            eq(authEmailDelivery.id, job.id),
            eq(authEmailDelivery.status, "pending"),
            eq(authEmailDelivery.nextAttemptAt, previousLease),
          ),
        )
        .returning({ until: authEmailDelivery.nextAttemptAt });
      return renewed?.until;
    },
    async () => {
      if (input.kind === "verification") await sendVerificationEmail(input.email, input.url);
      else if (input.kind === "password_reset")
        await sendPasswordResetEmail(input.email, input.url);
      else
        await sendOrganizationInvitation(
          input.email,
          input.organizationName,
          input.inviterName,
          input.url,
        );
    },
  );
  const currentLease = and(
    eq(authEmailDelivery.id, job.id),
    eq(authEmailDelivery.status, "pending"),
    eq(authEmailDelivery.nextAttemptAt, lease),
  );
  if (!outcome.success) {
    const failed = attempts >= 8;
    await db
      .update(authEmailDelivery)
      .set({
        status: failed ? "failed" : "pending",
        reason: "delivery_failed",
        attempts,
        encryptedPayload: failed ? null : job.encryptedPayload,
        nextAttemptAt: sql`now() + ${Math.min(60 * 2 ** (attempts - 1), 3600)} * interval '1 second'`,
        processedAt: failed ? sql`clock_timestamp()` : null,
      })
      .where(currentLease);
    console.error(
      `Auth email delivery ${job.id} failed${failed ? " permanently" : "; it will be retried"}`,
    );
    return true;
  }
  await db
    .update(authEmailDelivery)
    .set({
      status: "sent",
      reason: null,
      attempts,
      encryptedPayload: null,
      processedAt: sql`clock_timestamp()`,
    })
    .where(currentLease);
  return true;
}
