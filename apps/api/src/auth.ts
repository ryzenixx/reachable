import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";
import { apiKey } from "@better-auth/api-key";
import { db } from "./db";
import * as schema from "./db/schema/auth";
import { queueAuthEmail } from "./notifications/auth-email/queue";
import { invitationUrl } from "./organizations/invitations";
import { getApplicationUrl } from "./config/urls";
import { organizationActivityHooks } from "./activity/auth-hooks";
import { clientIpHeader } from "./http/client-ip";

const access = createAccessControl({
  ...defaultStatements,
  apiKey: ["create", "read", "update", "delete"],
} as const);
const apiKeyActions = ["create", "read", "update", "delete"] as const;

export const auth = betterAuth({
  trustedOrigins: () => {
    const origin = getApplicationUrl()?.origin;
    return origin ? [origin] : [];
  },
  disabledPaths: [
    "/api-key/create",
    "/api-key/delete",
    "/api-key/get",
    "/api-key/list",
    "/api-key/update",
  ],
  advanced: {
    backgroundTasks: {
      handler: (task) => {
        void task;
      },
    },
    ipAddress: { ipAddressHeaders: [clientIpHeader] },
  },
  rateLimit: { storage: "database" },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }) =>
      queueAuthEmail({ kind: "password_reset", userId: user.id, email: user.email, url, token }),
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url, token }) =>
      queueAuthEmail({ kind: "verification", userId: user.id, email: user.email, url, token }),
  },
  plugins: [
    organization({
      ac: access,
      roles: {
        owner: access.newRole({ ...ownerAc.statements, apiKey: [...apiKeyActions] }),
        admin: access.newRole({ ...adminAc.statements, apiKey: [...apiKeyActions] }),
        member: access.newRole({ ...memberAc.statements, apiKey: [] }),
      },
      organizationHooks: organizationActivityHooks,
      requireEmailVerificationOnInvitation: true,
      sendInvitationEmail: async ({ id, email, organization, inviter, invitation }) =>
        queueAuthEmail({
          kind: "invitation",
          invitationId: id,
          organizationId: organization.id,
          email,
          url: invitationUrl(id),
          organizationName: organization.name,
          inviterName: inviter.user.name,
          expiresAt: invitation.expiresAt,
        }),
    }),
    apiKey({
      references: "organization",
      defaultPrefix: "rck_",
      requireName: true,
      enableMetadata: true,
      startingCharactersConfig: { shouldStore: true, charactersLength: 12 },
      keyExpiration: { defaultExpiresIn: 90 * 86400, minExpiresIn: 1, maxExpiresIn: 365 },
      rateLimit: { enabled: true, timeWindow: 60_000, maxRequests: 120 },
    }),
  ],
});
