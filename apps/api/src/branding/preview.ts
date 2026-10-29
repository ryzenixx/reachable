import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { pageBranding } from "../db/schema/branding";
import { statusPage } from "../db/schema/status-page";
import { recordPageActivity } from "../activity/record";
import { sendStatusUpdate, sendSubscriptionConfirmation } from "../notifications/email/messages";
import { getPageEmailBrand } from "./email";

export async function sendBrandingPreview(
  pageId: string,
  to: string,
  kind: "incident" | "maintenance" | "postmortem" | "confirmation",
  actorId: string,
) {
  return db.transaction(async (tx) => {
    const [page] = await tx
      .select()
      .from(statusPage)
      .where(eq(statusPage.id, pageId))
      .for("update");
    if (!page) return "not_found" as const;
    const [existing] = await tx
      .select({ recent: sql<boolean>`${pageBranding.lastPreviewAt} > now() - interval '1 minute'` })
      .from(pageBranding)
      .where(eq(pageBranding.statusPageId, pageId));
    if (existing?.recent) return "rate_limited" as const;
    const brand = await getPageEmailBrand(tx, pageId, page.name);
    const link = "https://example.invalid/preview";
    if (kind === "confirmation")
      await sendSubscriptionConfirmation(to, page.name, link, link, link, brand, true);
    else
      await sendStatusUpdate(
        to,
        {
          kind,
          pageName: page.name,
          title: "Example status update",
          status: kind === "maintenance" ? "scheduled" : "resolved",
          message: "This is a preview of a status notification.",
          ...(kind === "maintenance" && {
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 3600000).toISOString(),
          }),
        },
        link,
        link,
        brand,
        true,
      );
    await tx
      .insert(pageBranding)
      .values({ statusPageId: pageId, lastPreviewAt: sql`clock_timestamp()` })
      .onConflictDoUpdate({
        target: pageBranding.statusPageId,
        set: { lastPreviewAt: sql`clock_timestamp()` },
      });
    await recordPageActivity(tx, pageId, {
      actor: { type: "member", id: actorId },
      action: "branding.preview_sent",
      resourceType: "status_page",
      resourceId: pageId,
      details: { kind },
    });
    return "sent" as const;
  });
}
