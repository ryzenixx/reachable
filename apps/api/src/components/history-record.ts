import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { component } from "../db/schema/component";
import { componentStateChange } from "../db/schema/component-history";
import { effectiveComponentStatus } from "./status";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Source = { type: "manual" | "incident" | "maintenance"; id?: string };

export async function lockHistoryComponents(tx: Transaction, pageId: string, ids: string[]) {
  if (!ids.length) return [];
  return tx.select({ id: component.id, name: component.name }).from(component)
    .where(and(eq(component.statusPageId, pageId), inArray(component.id, ids))).orderBy(component.id).for("update");
}

export async function recordComponentStates(tx: Transaction, ids: string[], source: Source) {
  if (!ids.length) return;
  const states = await tx.select({ id: component.id, status: effectiveComponentStatus }).from(component)
    .where(inArray(component.id, ids)).orderBy(component.id);
  for (const state of states) {
    const [previous] = await tx.select({ status: componentStateChange.status }).from(componentStateChange)
      .where(eq(componentStateChange.componentId, state.id))
      .orderBy(desc(componentStateChange.occurredAt), desc(componentStateChange.id)).limit(1);
    if (previous?.status === state.status) continue;
    await tx.insert(componentStateChange).values({ componentId: state.id, status: state.status, source: source.type, sourceId: source.id,
      occurredAt: sql`greatest(clock_timestamp(), coalesce((select max(${componentStateChange.occurredAt}) + interval '1 microsecond' from ${componentStateChange} where ${componentStateChange.componentId} = ${state.id}::uuid), clock_timestamp()))` });
  }
}
