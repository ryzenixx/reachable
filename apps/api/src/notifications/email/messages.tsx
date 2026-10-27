import { sendNotification } from "../index";
import { renderEmail } from "./render";
import { ConfirmSubscriptionEmail, ResetPasswordEmail, VerifyEmail } from "./templates";

export async function sendVerificationEmail(to: string, url: string) {
  await sendNotification({ channel: "email", to, subject: "Verify your email address", ...await renderEmail(<VerifyEmail url={url} />) });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  await sendNotification({ channel: "email", to, subject: "Reset your password", ...await renderEmail(<ResetPasswordEmail url={url} />) });
}

export async function sendSubscriptionConfirmation(to: string, pageName: string, confirmUrl: string, unsubscribeUrl: string) {
  await sendNotification({ channel: "email", to, subject: `Confirm your subscription to ${pageName}`,
    ...await renderEmail(<ConfirmSubscriptionEmail pageName={pageName} confirmUrl={confirmUrl} unsubscribeUrl={unsubscribeUrl} />) });
}
