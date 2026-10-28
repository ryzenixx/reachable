export type EmailNotification = {
  channel: "email";
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  senderName?: string;
  inlineImages?: { filename: string; content: Buffer; cid: string }[];
};

export type Notification = EmailNotification;
