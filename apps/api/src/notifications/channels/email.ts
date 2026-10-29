import nodemailer from "nodemailer";
import { parseOneAddress } from "email-addresses";
import type { EmailNotification } from "../types";
import { DeliveryFailure } from "../failures";

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;

export async function sendEmail(notification: EmailNotification): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  const from = process.env.EMAIL_FROM;

  if (!smtpUrl || !from) {
    throw new DeliveryFailure("configuration");
  }

  transporter ??= nodemailer.createTransport({
    url: smtpUrl,
    connectionTimeout: 30_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
    dnsTimeout: 10_000,
  });
  const parsedFrom = notification.senderName ? parseOneAddress(from) : undefined;
  if (notification.senderName && (!parsedFrom || parsedFrom.type !== "mailbox"))
    throw new DeliveryFailure("configuration");
  await transporter.sendMail({
    from:
      notification.senderName && parsedFrom?.type === "mailbox"
        ? { name: notification.senderName, address: parsedFrom.address }
        : from,
    to: notification.to,
    replyTo: notification.replyTo,
    subject: notification.subject,
    text: notification.text,
    html: notification.html,
    attachments: notification.inlineImages,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}
