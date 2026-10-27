import { eq } from "drizzle-orm";
import { db } from "../db";
import { statusPage } from "../db/schema/status-page";
import type { CreateStatusPage } from "./validation";

export function listStatusPages(organizationId: string) {
  return db.select().from(statusPage)
    .where(eq(statusPage.organizationId, organizationId))
    .orderBy(statusPage.createdAt, statusPage.id);
}

export async function createStatusPage(organizationId: string, input: CreateStatusPage) {
  const [page] = await db.insert(statusPage)
    .values({ ...input, organizationId })
    .onConflictDoNothing({ target: statusPage.slug })
    .returning();

  return page;
}
