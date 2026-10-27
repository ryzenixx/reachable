import { sendNotification } from "../index";
import { renderEmail } from "./render";
import { ConfirmSubscriptionEmail, OrganizationInvitationEmail, ResetPasswordEmail, StatusUpdateEmail, VerifyEmail } from "./templates";
import type { StatusNotification } from "../../db/schema/notification";

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

export async function sendStatusUpdate(to: string, update: StatusNotification, unsubscribeUrl: string) {
  await sendNotification({ channel: "email", to, subject: update.kind === "incident" ? "Incident update"
    : update.kind === "maintenance" ? "Maintenance update" : "Incident postmortem",
    ...await renderEmail(<StatusUpdateEmail update={update} unsubscribeUrl={unsubscribeUrl} />) });
}

export async function sendSubscriptionConfirmation(to: string, pageName: string, confirmUrl: string, unsubscribeUrl: string) {
  await sendNotification({ channel: "email", to, subject: `Confirm your subscription to ${pageName}`,
    ...await renderEmail(<ConfirmSubscriptionEmail pageName={pageName} confirmUrl={confirmUrl} unsubscribeUrl={unsubscribeUrl} />) });
}
