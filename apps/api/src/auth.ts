import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./db/schema/auth";
import { queueAuthEmail } from "./notifications/auth-email/queue";
import { invitationUrl } from "./organizations/invitations";
import { organizationActivityHooks } from "./activity/auth-hooks";

export const auth = betterAuth({
  advanced: {
    backgroundTasks: { handler: (task) => { void task; } },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }) => queueAuthEmail({ kind: "password_reset", userId: user.id, email: user.email, url, token }),
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url, token }) => queueAuthEmail({ kind: "verification", userId: user.id, email: user.email, url, token }),
  },
  plugins: [organization({
    organizationHooks: organizationActivityHooks,
    requireEmailVerificationOnInvitation: true,
    sendInvitationEmail: async ({ id, email, organization, inviter, invitation }) => queueAuthEmail({ kind: "invitation",
      invitationId: id, organizationId: organization.id, email, url: invitationUrl(id),
      organizationName: organization.name, inviterName: inviter.user.name, expiresAt: invitation.expiresAt }),
  })],
});
