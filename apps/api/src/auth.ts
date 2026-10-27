import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./db/schema/auth";
import { sendPasswordResetEmail, sendVerificationEmail } from "./notifications/email/messages";

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
  plugins: [organization()],
});
