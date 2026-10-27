export type EmailNotification = {
  channel: "email";
  to: string;
  subject: string;
  text: string;
};

export type Notification = EmailNotification;
