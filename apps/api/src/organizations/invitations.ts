import { getApplicationUrl } from "../config/urls";

export function invitationUrl(id: string) {
  const base = getApplicationUrl();
  if (!base) throw new Error("APP_URL must be an HTTP(S) application origin");
  return new URL(`/invitations/${encodeURIComponent(id)}`, base).toString();
}
