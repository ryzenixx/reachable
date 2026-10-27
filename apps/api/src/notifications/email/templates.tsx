import { Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Text } from "react-email";
import type { ReactNode } from "react";
import { logoContentId } from "./assets";

type ActionEmailProps = {
  preview: string;
  heading: string;
  children: ReactNode;
  actionLabel: string;
  actionUrl: string;
  footer?: ReactNode;
};

export function ActionEmail({ preview, heading, children, actionLabel, actionUrl, footer }: ActionEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f6f7f9", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", padding: "32px 12px" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: "8px", margin: "0 auto", maxWidth: "560px", padding: "32px" }}>
          <Img src={`cid:${logoContentId}`} alt="Reachable" width="186" height="28" />
          <Heading style={{ color: "#26352d", fontSize: "24px", fontWeight: "600", lineHeight: "32px", letterSpacing: "-0.4px", margin: "32px 0 8px" }}>{heading}</Heading>
          {children}
          <Button href={actionUrl} style={{ backgroundColor: "#26352d", borderRadius: "6px", color: "#ffffff", fontSize: "14px", fontWeight: "600", padding: "12px 20px", textDecoration: "none" }}>
            {actionLabel}
          </Button>
          <Text style={{ color: "#4b5563", fontSize: "14px", lineHeight: "22px", margin: "24px 0" }}>
            If the button does not work, open this link: <Link href={actionUrl}>{actionUrl}</Link>
          </Text>
          {footer && <><Hr /><Text style={{ color: "#6b7280", fontSize: "13px", lineHeight: "20px", margin: "16px 0 0" }}>{footer}</Text></>}
        </Container>
      </Body>
    </Html>
  );
}

const paragraphStyle = { color: "#374151", fontSize: "16px", lineHeight: "24px", margin: "0 0 24px" };

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

export function ConfirmSubscriptionEmail({ pageName, confirmUrl, unsubscribeUrl }: { pageName: string; confirmUrl: string; unsubscribeUrl: string }) {
  return <ActionEmail preview={`Confirm your subscription to ${pageName}`} heading="Confirm your subscription"
    actionLabel="Confirm subscription" actionUrl={confirmUrl}
    footer={<>This confirmation link expires in 24 hours. <Link href={unsubscribeUrl}>Unsubscribe</Link></>}>
    <Text style={paragraphStyle}>Confirm your subscription to updates from {pageName}.</Text>
  </ActionEmail>;
}
