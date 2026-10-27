import { sendEmail } from "./channels/email";
import type { Notification } from "./types";

export type { Notification } from "./types";

export async function sendNotification(notification: Notification): Promise<void> {
  switch (notification.channel) {
    case "email":
      return sendEmail(notification);
    default:
      throw new Error("Unsupported notification channel");
  }
}
