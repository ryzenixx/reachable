import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { incident, incidentComponent, incidentUpdate, incidentUpdateComponent } from "../db/schema/incident";
import { notificationDelivery } from "../db/schema/notification";
import { postmortem, postmortemPublication } from "../db/schema/postmortem";
import { enqueueStatusNotification } from "../notifications/queue";
import { recordPageActivity } from "../activity/record";

export async function getPostmortem(pageId: string, incidentId: string) {
  const [entry] = await db.select({ postmortem }).from(postmortem)
    .innerJoin(incident, eq(incident.id, postmortem.incidentId))
    .where(and(eq(incident.id, incidentId), eq(incident.statusPageId, pageId)));
  return entry?.postmortem;
}

export async function listPublications(pageId: string, incidentId: string) {
  const entry = await getPostmortem(pageId, incidentId);
  if (!entry) return undefined;
  return db.select().from(postmortemPublication).where(eq(postmortemPublication.postmortemId, entry.id))
    .orderBy(desc(postmortemPublication.createdAt), desc(postmortemPublication.id));
}

export async function savePostmortem(pageId: string, incidentId: string, actorId: string, draft: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(incident)
      .where(and(eq(incident.id, incidentId), eq(incident.statusPageId, pageId))).for("update");
    if (!current) return undefined;
    if (current.status !== "resolved") return "not_resolved" as const;
    const [existing] = await tx.select().from(postmortem).where(eq(postmortem.incidentId, incidentId));
    if (existing?.draft === draft) return existing;
    const [saved] = await tx.insert(postmortem).values({ incidentId, draft, draftUpdatedBy: actorId })
      .onConflictDoUpdate({ target: postmortem.incidentId, set: { draft, draftUpdatedBy: actorId, updatedAt: sql`clock_timestamp()` } })
      .returning();
    await recordPageActivity(tx, pageId, { actor: { type: "member", id: actorId }, action: "postmortem.saved", resourceType: "incident", resourceId: incidentId });
    return saved;
  });
}

export async function publishPostmortem(pageId: string, incidentId: string, actorId: string, notifySubscribers: boolean) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(incident)
      .where(and(eq(incident.id, incidentId), eq(incident.statusPageId, pageId))).for("update");
    if (!current) return undefined;
    if (current.status !== "resolved") return "not_resolved" as const;
    const [entry] = await tx.select().from(postmortem).where(eq(postmortem.incidentId, incidentId));
    if (!entry || !entry.draft.trim()) return "empty_draft" as const;
    if (entry.publishedContent === entry.draft) return entry;

    await tx.update(notificationDelivery).set({ status: "skipped", processedAt: sql`clock_timestamp()` })
      .where(and(eq(notificationDelivery.status, "pending"), inArray(notificationDelivery.eventId,
        tx.select({ id: postmortemPublication.id }).from(postmortemPublication).where(eq(postmortemPublication.postmortemId, entry.id)))));
    const [publication] = await tx.insert(postmortemPublication).values({ postmortemId: entry.id, content: entry.draft, actorId })
      .returning();
    const [published] = await tx.update(postmortem).set({ publishedContent: entry.draft,
      publishedAt: entry.publishedAt ?? publication.createdAt, publishedUpdatedAt: publication.createdAt, updatedAt: publication.createdAt,
    }).where(eq(postmortem.id, entry.id)).returning();
    await tx.update(incident).set({ updatedAt: publication.createdAt }).where(eq(incident.id, incidentId));
    if (notifySubscribers) {
      const updates = await tx.select({ id: incidentUpdate.id, componentsRecorded: incidentUpdate.componentsRecorded })
        .from(incidentUpdate).where(eq(incidentUpdate.incidentId, incidentId))
        .orderBy(asc(incidentUpdate.createdAt), asc(incidentUpdate.id));
      const snapshots = await tx.select({ updateId: incidentUpdateComponent.updateId, id: incidentUpdateComponent.componentId }).from(incidentUpdateComponent)
        .innerJoin(incidentUpdate, eq(incidentUpdate.id, incidentUpdateComponent.updateId))
        .where(eq(incidentUpdate.incidentId, incidentId));
      const linked = await tx.select({ id: incidentComponent.componentId }).from(incidentComponent)
        .where(eq(incidentComponent.incidentId, incidentId));
      const counts = new Map<string, number>();
      for (const row of snapshots) counts.set(row.updateId, (counts.get(row.updateId) ?? 0) + 1);
      let previousCount = 0;
      let hasGeneralUpdate = false;
      for (const update of updates) {
        const count = counts.get(update.id) ?? 0;
        if (!update.componentsRecorded || (count === 0 && previousCount === 0)) hasGeneralUpdate = true;
        previousCount = count;
      }
      const componentIds = hasGeneralUpdate ? [] : [...new Set([...snapshots, ...linked].map((row) => row.id))];
      await enqueueStatusNotification(tx, pageId, publication.id, {
        kind: "postmortem", title: current.title, status: current.status, message: entry.draft, componentIds,
      });
    }
    await recordPageActivity(tx, pageId, { actor: { type: "member", id: actorId }, action: "postmortem.published", resourceType: "incident", resourceId: incidentId, details: { publicationId: publication.id, notified: notifySubscribers } });
    return published;
  });
}
