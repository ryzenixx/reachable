import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { component } from "../db/schema/component";
import { statusPage } from "../db/schema/status-page";
import { subscription, subscriptionComponent, subscriptionToken } from "../db/schema/subscription";
import { hashToken } from "./tokens";
import { recordPageActivity, type Actor } from "../activity/record";
import type { SubscriptionPreferences } from "./validation";

async function findSubscriptionId(token: string) {
  const [entry] = await db
    .select({ id: subscriptionToken.subscriptionId })
    .from(subscriptionToken)
    .where(
      and(
        eq(subscriptionToken.hash, hashToken(token)),
        eq(subscriptionToken.purpose, "unsubscribe"),
      ),
    );
  return entry?.id;
}

export async function getSubscriptionPreferences(token: string) {
  const id = await findSubscriptionId(token);
  if (!id) return undefined;
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(subscription)
      .where(eq(subscription.id, id))
      .for("share");
    if (!current?.confirmedAt) return undefined;
    const [valid] = await tx
      .select({ hash: subscriptionToken.hash })
      .from(subscriptionToken)
      .where(
        and(
          eq(subscriptionToken.hash, hashToken(token)),
          eq(subscriptionToken.subscriptionId, id),
          eq(subscriptionToken.purpose, "unsubscribe"),
        ),
      );
    if (!valid) return undefined;
    const [page] = await tx
      .select({ name: statusPage.name, slug: statusPage.slug })
      .from(statusPage)
      .where(and(eq(statusPage.id, current.statusPageId), eq(statusPage.published, true)));
    if (!page) return undefined;
    const components = await tx
      .select({ id: component.id, name: component.name })
      .from(component)
      .where(eq(component.statusPageId, current.statusPageId))
      .orderBy(component.position, component.createdAt, component.id);
    const selected = await tx
      .select({ id: subscriptionComponent.componentId })
      .from(subscriptionComponent)
      .where(eq(subscriptionComponent.subscriptionId, id));
    return {
      page,
      scope: current.allComponents ? "all" : "selected",
      components,
      selectedComponentIds: selected.map((entry) => entry.id),
    };
  });
}

export async function setSubscriptionPreferences(token: string, input: SubscriptionPreferences) {
  const id = await findSubscriptionId(token);
  if (!id) return "invalid_token" as const;
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(subscription)
      .where(eq(subscription.id, id))
      .for("update");
    if (!current?.confirmedAt) return "invalid_token" as const;
    const [valid] = await tx
      .select({ hash: subscriptionToken.hash })
      .from(subscriptionToken)
      .where(
        and(
          eq(subscriptionToken.hash, hashToken(token)),
          eq(subscriptionToken.subscriptionId, id),
          eq(subscriptionToken.purpose, "unsubscribe"),
        ),
      );
    if (!valid) return "invalid_token" as const;
    const [page] = await tx
      .select({ id: statusPage.id })
      .from(statusPage)
      .where(and(eq(statusPage.id, current.statusPageId), eq(statusPage.published, true)));
    if (!page) return "invalid_token" as const;
    return updatePreferences(tx, current, input, { type: "subscriber" });
  });
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function updatePreferences(
  tx: Transaction,
  current: typeof subscription.$inferSelect,
  input: SubscriptionPreferences,
  actor: Actor,
) {
  if (input.scope === "selected") {
    const validComponents = await tx
      .select({ id: component.id })
      .from(component)
      .where(
        and(
          eq(component.statusPageId, current.statusPageId),
          inArray(component.id, input.componentIds),
        ),
      )
      .orderBy(component.id)
      .for("share");
    if (validComponents.length !== input.componentIds.length) return "invalid_components" as const;
  }
  const selected = await tx
    .select({ id: subscriptionComponent.componentId })
    .from(subscriptionComponent)
    .where(eq(subscriptionComponent.subscriptionId, current.id));
  const nextIds = input.scope === "selected" ? input.componentIds : [];
  const oldIds = new Set(selected.map(({ id }) => id));
  if (
    current.allComponents === (input.scope === "all") &&
    oldIds.size === nextIds.length &&
    nextIds.every((id) => oldIds.has(id))
  )
    return "updated" as const;
  await tx
    .delete(subscriptionComponent)
    .where(eq(subscriptionComponent.subscriptionId, current.id));
  if (input.scope === "selected")
    await tx
      .insert(subscriptionComponent)
      .values(
        input.componentIds.map((componentId) => ({ subscriptionId: current.id, componentId })),
      );
  await tx
    .update(subscription)
    .set({ allComponents: input.scope === "all" })
    .where(eq(subscription.id, current.id));
  await recordPageActivity(tx, current.statusPageId, {
    actor,
    action: "subscription.preferences_updated",
    resourceType: "subscription",
    resourceId: current.id,
    details: { scope: input.scope },
  });
  return "updated" as const;
}
