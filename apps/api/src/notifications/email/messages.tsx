import { sendNotification } from "../index";
import { renderEmail } from "./render";
import { ConfirmSubscriptionEmail, OrganizationInvitationEmail, ResetPasswordEmail, StatusUpdateEmail, VerifyEmail, WebhookFailureEmail } from "./templates";
import type { StatusNotification } from "../../db/schema/notification";
import type { PageEmailBrand } from "../../branding/email";

export async function sendVerificationEmail(to: string, url: string) {
  await sendNotification({ channel: "email", to, subject: "Verify your email address", ...await renderEmail(<VerifyEmail url={url} />) });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  await sendNotification({ channel: "email", to, subject: "Reset your password", ...await renderEmail(<ResetPasswordEmail url={url} />) });
}

export async function sendOrganizationInvitation(to: string, organizationName: string, inviterName: string, url: string) {
  await sendNotification({ channel: "email", to, subject: "You're invited to an organization",
    ...await renderEmail(<OrganizationInvitationEmail organizationName={organizationName} inviterName={inviterName} url={url} />) });
}

export async function sendStatusUpdate(to: string, update: StatusNotification, unsubscribeUrl: string, manageUrl: string, brand: PageEmailBrand, preview = false) {
  const subject = update.kind === "incident" ? "Incident update"
    : update.kind === "maintenance" ? "Maintenance update" : update.kind === "maintenance_reminder" ? "Maintenance reminder" : "Incident postmortem";
  await sendNotification({ channel: "email", to, subject: preview ? `[Preview] ${subject}` : subject, senderName: brand.name,
    ...(brand.replyTo && { replyTo: brand.replyTo }),
    ...await renderEmail(<StatusUpdateEmail update={update} unsubscribeUrl={unsubscribeUrl} manageUrl={manageUrl} brand={brand} />, brand) });
}

export async function sendSubscriptionConfirmation(to: string, pageName: string, confirmUrl: string, unsubscribeUrl: string, manageUrl: string, brand: PageEmailBrand, preview = false, webhookUrl?: string, alreadyConfirmed = false) {
  const action = alreadyConfirmed ? "Manage" : "Confirm";
  await sendNotification({ channel: "email", to, subject: `${preview ? "[Preview] " : ""}${action} your subscription to ${pageName}`, senderName: brand.name,
    ...(brand.replyTo && { replyTo: brand.replyTo }),
    ...await renderEmail(<ConfirmSubscriptionEmail pageName={pageName} confirmUrl={confirmUrl} unsubscribeUrl={unsubscribeUrl} manageUrl={manageUrl} brand={brand} webhookUrl={webhookUrl} alreadyConfirmed={alreadyConfirmed} />, brand) });
}

export async function sendWebhookFailureAlert(to: string, pageName: string, host: string, failureCode: string,
  responseCode: number | null, manageUrl: string | undefined, unsubscribeUrl: string, brand: PageEmailBrand) {
  await sendNotification({ channel: "email", to, subject: `Webhook delivery failed for ${pageName}`, senderName: brand.name,
    ...(brand.replyTo && { replyTo: brand.replyTo }),
    ...await renderEmail(<WebhookFailureEmail pageName={pageName} host={host} failureCode={failureCode}
      responseCode={responseCode} manageUrl={manageUrl} unsubscribeUrl={unsubscribeUrl} brand={brand} />, brand) });
}
