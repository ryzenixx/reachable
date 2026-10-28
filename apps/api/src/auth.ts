import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./db/schema/auth";
import { sendOrganizationInvitation, sendPasswordResetEmail, sendVerificationEmail } from "./notifications/email/messages";
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
    sendResetPassword: async ({ user, url }) => sendPasswordResetEmail(user.email, url),
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => sendVerificationEmail(user.email, url),
  },
  plugins: [organization({
    organizationHooks: organizationActivityHooks,
    requireEmailVerificationOnInvitation: true,
    sendInvitationEmail: async ({ id, email, organization, inviter }) =>
      sendOrganizationInvitation(email, organization.name, inviter.user.name, invitationUrl(id)),
  })],
});
