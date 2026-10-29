import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { pageAsset, pageBranding } from "../db/schema/branding";
import { effectiveBranding } from "./queries";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type PageEmailBrand = {
  name: string;
  brandColor: string;
  footer: string | null;
  replyTo: string | null;
  timezone: string;
  logo?: Buffer;
};

export async function getPageEmailBrand(
  tx: Transaction,
  pageId: string,
  name: string,
): Promise<PageEmailBrand> {
  const [settings] = await tx
    .select({ settings: pageBranding.settings })
    .from(pageBranding)
    .where(eq(pageBranding.statusPageId, pageId));
  const config = effectiveBranding(settings?.settings);
  const [logo] =
    config.emailLogoMode === "none"
      ? []
      : await tx
          .select({ content: pageAsset.content })
          .from(pageAsset)
          .where(
            and(
              eq(pageAsset.statusPageId, pageId),
              inArray(pageAsset.kind, ["email_logo", "logo"]),
            ),
          )
          .orderBy(sql`case when ${pageAsset.kind} = 'email_logo' then 0 else 1 end`)
          .limit(1);
  return {
    name,
    brandColor: config.brandColor,
    footer: config.emailFooter,
    replyTo: config.replyTo,
    timezone: config.timezone,
    ...(logo && { logo: logo.content }),
  };
}
