import nodemailer from "nodemailer";

type Email = {
  to: string;
  subject: string;
  text: string;
};

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;

export async function sendEmail(message: Email): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  const from = process.env.EMAIL_FROM;

  if (!smtpUrl || !from) {
    throw new Error("SMTP_URL and EMAIL_FROM are required to send email");
  }

  transporter ??= nodemailer.createTransport(smtpUrl);
  await transporter.sendMail({ from, ...message });
}
