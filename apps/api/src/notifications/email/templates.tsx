import { Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Text } from "react-email";
import { Fragment } from "react";
import type { ReactNode } from "react";
import { logoContentId } from "./assets";
import type { StatusNotification } from "../../db/schema/notification";
import type { PageEmailBrand } from "../../branding/email";
import { readableTextColor } from "../../branding/colors";

type ActionEmailProps = {
  preview: string;
  heading: string;
  children: ReactNode;
  actionLabel?: string;
  actionUrl?: string;
  footer?: ReactNode;
  brand?: PageEmailBrand;
};

export function ActionEmail({ preview, heading, children, actionLabel, actionUrl, footer, brand }: ActionEmailProps) {
  const buttonColor = brand?.brandColor ?? "#26352d";
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f6f7f9", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", padding: "32px 12px" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: "8px", margin: "0 auto", maxWidth: "560px", padding: "32px" }}>
          {brand ? brand.logo ? <Img src="cid:page-logo@reachable" alt={brand.name} width="186" style={{ maxWidth: "100%", height: "auto" }} />
            : <Text style={{ color: "#26352d", fontSize: "20px", fontWeight: "600", margin: "0" }}>{brand.name}</Text>
            : <Img src={`cid:${logoContentId}`} alt="Reachable" width="186" height="28" />}
          {brand && <Hr style={{ borderColor: brand.brandColor, margin: "24px 0 0" }} />}
          <Heading style={{ color: "#26352d", fontSize: "24px", fontWeight: "600", lineHeight: "32px", letterSpacing: "-0.4px", margin: "32px 0 8px" }}>{heading}</Heading>
          {children}
          {actionUrl && actionLabel && <>
            <Button href={actionUrl} style={{ backgroundColor: buttonColor, borderRadius: "6px", color: readableTextColor(buttonColor), fontSize: "14px", fontWeight: "600", padding: "12px 20px", textDecoration: "none" }}>
              {actionLabel}
            </Button>
            <Text style={{ color: "#4b5563", fontSize: "14px", lineHeight: "22px", margin: "24px 0" }}>
              If the button does not work, open this link: <Link href={actionUrl}>{actionUrl}</Link>
            </Text>
          </>}
          {footer && <><Hr /><Text style={{ color: "#6b7280", fontSize: "13px", lineHeight: "20px", margin: "16px 0 0" }}>{footer}</Text></>}
        </Container>
      </Body>
    </Html>
  );
}

const paragraphStyle = { color: "#374151", fontSize: "16px", lineHeight: "24px", margin: "0 0 24px" };

function BrandingFooter({ text }: { text: string }) {
  return <>{text.split(/\r?\n/).map((line, index) => <Fragment key={index}>{index > 0 && <br />}{line}</Fragment>)}<br /></>;
}

export function VerifyEmail({ url }: { url: string }) {
  return <ActionEmail preview="Verify your email address" heading="Verify your email address" actionLabel="Verify email" actionUrl={url}
    footer="If you did not create a Reachable account, you can ignore this email.">
    <Text style={paragraphStyle}>Confirm your email address to verify your Reachable account.</Text>
  </ActionEmail>;
}

export function ResetPasswordEmail({ url }: { url: string }) {
  return <ActionEmail preview="Reset your password" heading="Reset your password" actionLabel="Reset password" actionUrl={url}
    footer="If you did not request a password reset, you can ignore this email.">
    <Text style={paragraphStyle}>Use this link to choose a new password for your Reachable account.</Text>
  </ActionEmail>;
}

export function OrganizationInvitationEmail({ organizationName, inviterName, url }: { organizationName: string; inviterName: string; url: string }) {
  return <ActionEmail preview="You've been invited to an organization" heading="You're invited"
    actionLabel="View invitation" actionUrl={url}
    footer="If you were not expecting this invitation, you can ignore this email.">
    <Text style={paragraphStyle}>{inviterName} invited you to join {organizationName} on Reachable.</Text>
  </ActionEmail>;
}

export function StatusUpdateEmail({ update, unsubscribeUrl, manageUrl, brand }: { update: StatusNotification; unsubscribeUrl: string; manageUrl: string; brand: PageEmailBrand }) {
  const label = update.kind === "incident" ? "Incident update" : update.kind === "maintenance" ? "Maintenance update" : update.kind === "maintenance_reminder" ? "Maintenance reminder" : "Incident postmortem";
  const date = new Intl.DateTimeFormat("en", { timeZone: brand.timezone, dateStyle: "medium", timeStyle: "short" });
  const window = update.startsAt && update.endsAt && Number.isFinite(Date.parse(update.startsAt)) && Number.isFinite(Date.parse(update.endsAt))
    ? `${date.format(new Date(update.startsAt))} – ${date.format(new Date(update.endsAt))} (${brand.timezone})` : null;
  return <ActionEmail preview={label} heading={update.title} brand={brand} footer={<>{brand.footer && <BrandingFooter text={brand.footer} />}<Link href={manageUrl}>Manage subscription</Link> · <Link href={unsubscribeUrl}>Unsubscribe</Link></>}>
    <Text style={paragraphStyle}>{update.pageName} · {update.status.replaceAll("_", " ")}</Text>
    <Text style={paragraphStyle}>{update.message.split(/\r?\n/).map((line, index) =>
      <Fragment key={index}>{index > 0 && <br />}{line}</Fragment>)}</Text>
    {window && <Text style={paragraphStyle}>Scheduled: {window}</Text>}
  </ActionEmail>;
}

export function ConfirmSubscriptionEmail({ pageName, confirmUrl, unsubscribeUrl, manageUrl, brand, webhookUrl, alreadyConfirmed }: { pageName: string; confirmUrl: string; unsubscribeUrl: string; manageUrl: string; brand: PageEmailBrand; webhookUrl?: string; alreadyConfirmed?: boolean }) {
  const action = alreadyConfirmed ? "Manage" : "Confirm";
  return <ActionEmail preview={`${action} your subscription to ${pageName}`} heading={`${action} your subscription`}
    actionLabel={`${action} subscription`} actionUrl={alreadyConfirmed ? manageUrl : confirmUrl} brand={brand}
    footer={<>{!alreadyConfirmed && <>This confirmation link expires in 24 hours. </>}{brand.footer && <BrandingFooter text={brand.footer} />}{!alreadyConfirmed && <><Link href={manageUrl}>Manage subscription</Link> · </>}<Link href={unsubscribeUrl}>Unsubscribe</Link></>}>
    <Text style={paragraphStyle}>{alreadyConfirmed ? `Manage your subscription to updates from ${pageName}.` : `Confirm your subscription to updates from ${pageName}.`}</Text>
    {webhookUrl && <Text style={paragraphStyle}>Webhook endpoint: {webhookUrl}</Text>}
  </ActionEmail>;
}

export function WebhookFailureEmail({ pageName, host, failureCode, responseCode, manageUrl, unsubscribeUrl, brand }: {
  pageName: string; host: string; failureCode: string; responseCode: number | null; manageUrl?: string; unsubscribeUrl: string; brand: PageEmailBrand;
}) {
  const reasons: Record<string, string> = { destination: "The endpoint address is not allowed", dns: "The endpoint could not be resolved",
    timeout: "The endpoint timed out", http: "The endpoint returned an unsuccessful HTTP response", tls: "The secure connection failed",
    network: "The endpoint could not be reached", configuration: "The delivery configuration is unavailable", delivery_failed: "The delivery failed" };
  const reason = reasons[failureCode] ?? reasons.delivery_failed;
  return <ActionEmail preview={`A webhook delivery failed for ${pageName}`} heading="Webhook delivery failed" brand={brand}
    actionLabel={manageUrl ? "Manage subscription" : undefined} actionUrl={manageUrl}
    footer={<>{brand.footer && <BrandingFooter text={brand.footer} />}<Link href={unsubscribeUrl}>Unsubscribe</Link></>}>
    <Text style={paragraphStyle}>A status update from {pageName} could not be delivered to the webhook at {host}.</Text>
    <Text style={paragraphStyle}>{reason}{responseCode !== null ? ` (${responseCode})` : ""}. Check your endpoint or contact the status page administrator.</Text>
    <Text style={paragraphStyle}>Your subscription remains active, and future updates may still be delivered.</Text>
  </ActionEmail>;
}
