import nodemailer from "nodemailer";
import { parseOneAddress } from "email-addresses";
import type { EmailNotification } from "../types";

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;

export async function sendEmail(notification: EmailNotification): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  const from = process.env.EMAIL_FROM;

  if (!smtpUrl || !from) {
    throw new Error("SMTP_URL and EMAIL_FROM are required to send email");
  }

  transporter ??= nodemailer.createTransport(smtpUrl);
  const parsedFrom = notification.senderName ? parseOneAddress(from) : undefined;
  if (notification.senderName && (!parsedFrom || parsedFrom.type !== "mailbox")) throw new Error("EMAIL_FROM must be a single mailbox");
  await transporter.sendMail({
    from: notification.senderName && parsedFrom?.type === "mailbox" ? { name: notification.senderName, address: parsedFrom.address } : from,
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
