import nodemailer from "nodemailer";
import type { EmailNotification } from "../types";

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;

export async function sendEmail(notification: EmailNotification): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  const from = process.env.EMAIL_FROM;

  if (!smtpUrl || !from) {
    throw new Error("SMTP_URL and EMAIL_FROM are required to send email");
  }

  transporter ??= nodemailer.createTransport(smtpUrl);
  await transporter.sendMail({
    from,
    to: notification.to,
    subject: notification.subject,
    text: notification.text,
  });
}
